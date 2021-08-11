import * as sdk from 'aws-sdk';
import * as ulid from 'ulid';
import { fsa, FsS3 } from '@linzjs/s3fs'
import { basename } from 'path';

const batch = new sdk.Batch();

// USER INPUT
const JobDefinitionArn = 'JobDefinitionArn';
const JobQueueArn = 'JobQueueArn';

const ReadFromRoleArn = 'Read Arn of bucket where data to read from is location'
const ReadFromBucket = 's3://read-top-level-bucket/'
const ReadFromFolder = 's3://read-top-level-bucket/specific-folder/'
const WriteToRoleArn = 'Write Arn of write location bucket'
const WriteToFolder = 's3://write-top-level-bucket/specific-folder/'
// END USER INPUT

const sourceCredentials = new sdk.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE });

const credentials = new sdk.ChainableTemporaryCredentials({
  params: {
    RoleArn: ReadFromRoleArn,
    RoleSessionName: 'fsa-' + Math.random().toString(32) + '-' + Date.now(),
  },
  masterCredentials: sourceCredentials,
});

fsa.register(ReadFromBucket, new FsS3(new sdk.S3({ credentials })))

async function main(): Promise<void> {
  const correlationId = ulid.ulid();
  console.log({ correlationId });

  let count = 0
  let upload_count = 1
  let fileList = ''
  for await (const file_name of fsa.list(ReadFromFolder)) {
    if (file_name.endsWith('.tif') || file_name.endsWith('.tiff')) {
      if (count == 10) {
        submit(correlationId, 'upload-' + upload_count, fileList)
        count = 0
        upload_count++
        fileList = ''
      }
      const string = file_name.replace('s3://', '/vsis3/') + ',' + WriteToFolder.concat(basename(file_name)).replace('.tif', '.tiff') + ';'
      fileList = fileList.concat(string)
      count++
    }
  }
  if (count > 0) {
    submit(correlationId, "final-upload-" + upload_count, fileList)
  }
}

async function submit(correlationId: string, job_name: string, fileList: string) {
  const environment = [{ name: 'LINZ_CORRELATION_ID', value: correlationId }];
  const res = await batch
    .submitJob({
      jobName: ['Job', correlationId, job_name].join('-'),
      jobQueue: JobQueueArn,
      jobDefinition: JobDefinitionArn,
      containerOverrides: {
        memory: 128,
        command: [fileList, ReadFromRoleArn, WriteToRoleArn],
        environment,
      },
    })
    .promise();
  console.log(res);
}

main().catch(console.error);
