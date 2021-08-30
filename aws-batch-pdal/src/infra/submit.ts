import * as sdk from 'aws-sdk';
import * as ulid from 'ulid';
import { fsa, FsS3 } from '@linzjs/s3fs';

//TODO take this out and import
const config = {
  roles: {
    jobDefinition: '',
    jobQueue: '',
    read: '',
    write: '',
  },
  buckets: {
    read: '',
    write: '',
  },
  files: {
    srcFolder: '',
    dstFolder: '',
    suffix: '',
    nbPerJob: 10,
  },
};
const batch = new sdk.Batch();
const sourceCredentials = new sdk.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE });
const credentials = new sdk.ChainableTemporaryCredentials({
  params: {
    RoleArn: config.roles.read,
    RoleSessionName: 'fsa-' + Math.random().toString(32) + '-' + Date.now(),
  },
  masterCredentials: sourceCredentials,
});

async function main(): Promise<void> {
  const correlationId = ulid.ulid();
  console.log({ correlationId });

  fsa.register('s3://' + config.buckets.read, new FsS3(new sdk.S3({ credentials })));

  let count = 0;
  let jobNb = 1;
  let fileList = '';
  let totalFiles = 0;
  for await (const file_name of fsa.list('s3://' + config.buckets.read + config.files.srcFolder)) {
    if (file_name.endsWith('.laz') && !file_name.endsWith(config.files.suffix + '.laz')) {
      if (count === config.files.nbPerJob) {
        submit(correlationId, 'job-' + jobNb, fileList.slice(0, -1), 10, 500);
        totalFiles += count;
        count = 0;
        jobNb++;
        fileList = '';
      }
      fileList = fileList.concat(file_name + ';');
      count++;
    }
    //For testing on AWS
    //if (jobNb > 2) break;
  }
  if (count > 0) {
    submit(correlationId, 'job-' + jobNb, fileList.slice(0, -1), 10, 500);
  }

  console.log('Total files: %d', totalFiles);
}

async function submit(
  correlationId: string,
  job_name: string,
  fileList: string,
  retries: number,
  delay: number,
): Promise<void> {
  const environment = [{ name: 'LINZ_CORRELATION_ID', value: correlationId }];
  const res = await batch
    .submitJob({
      jobName: ['Job', correlationId, job_name].join('-'),
      jobQueue: config.roles.jobQueue,
      jobDefinition: config.roles.jobDefinition,
      containerOverrides: {
        memory: 128,
        command: [
          fileList,
          config.roles.read,
          config.roles.write,
          config.buckets.read,
          config.buckets.write,
          config.files.suffix,
          config.files.dstFolder,
        ],
        environment,
      },
    })
    .promise()
    .then((data) => {
      console.log(data);
    })
    .catch(async (e) => {
      if (retries > 1) {
        await wait(delay);
        await submit(correlationId, job_name, fileList, retries - 1, delay * 2);
      } else {
        throw e;
      }
    });
  console.log(res);
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

main().catch(console.error);
