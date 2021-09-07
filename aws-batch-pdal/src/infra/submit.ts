import * as sdk from 'aws-sdk';
import * as ulid from 'ulid';
import { fsa, FsS3 } from '@linzjs/s3fs';
import { logger } from './logger';
import * as configu from './config';
import { readFileSync } from 'fs';
import path from 'path';

const batch = new sdk.Batch();

const rawdata = readFileSync(path.resolve(__dirname, 'config.json'));
const userConfig = JSON.parse(rawdata.toString());
console.log(userConfig);
const configuration: configu.ConfigData = configu.load(userConfig);

const sourceCredentials = new sdk.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE });
const credentials = new sdk.ChainableTemporaryCredentials({
  params: {
    RoleArn: configuration.roles.read,
    RoleSessionName: 'fsa-' + Math.random().toString(32) + '-' + Date.now(),
  },
  masterCredentials: sourceCredentials,
});

async function main(): Promise<void> {
  const correlationId = ulid.ulid();
  const log = logger.child({ correlationId: correlationId });
  log.info('Submit:Start');

  fsa.register('s3://' + configuration.buckets.read, new FsS3(new sdk.S3({ credentials })));

  let jobNb = 1;
  let fileList: string[] = [];
  let totalFiles = 0;
  let totalJobSumitted = 0;
  for await (const file_name of fsa.list('s3://' + configuration.buckets.read + configuration.files.sourceFolder)) {
    if (
      file_name.endsWith(configuration.files.extension) &&
      !file_name.endsWith(configuration.files.suffix + configuration.files.extension)
    ) {
      if (fileList.length === configuration.files.numberPerJob) {
        await submit(correlationId, jobNb.toString(), fileList, 10, 500);
        totalJobSumitted++;
        totalFiles += fileList.length;
        jobNb++;
        fileList = [];
      }
      fileList.push(file_name);
    }
    //START Comment For testing on AWS
    //if (jobNb > 1) break;
    //END
  }
  if (fileList.length > 0) {
    await submit(correlationId, jobNb.toString(), fileList, 10, 500);
    totalJobSumitted++;
  }

  logger.info({ numberFilesToProcess: totalFiles, numberJobsSumitted: totalJobSumitted }, 'Submit:End');
}

async function submit(
  correlationId: string,
  job_nb: string,
  fileList: string[],
  retries: number,
  delay: number,
): Promise<void> {
  const environment = [{ name: 'LINZ_CORRELATION_ID', value: correlationId }];
  const job_name = ['Job', correlationId, job_nb].join('-');
  try {
    const res = await batch
      .submitJob({
        jobName: job_name,
        jobQueue: configuration.roles.jobQueue,
        jobDefinition: configuration.roles.jobDefinition,
        containerOverrides: {
          memory: 128,
          command: buildCommandArguments(correlationId, job_name, fileList),
          environment,
        },
      })
      .promise();
    logger.info({ jobSubmitted: res }, 'Submit:' + job_name);
    console.log(res);
  } catch (e) {
    if (retries > 1) {
      await wait(delay);
      await submit(correlationId, job_name, fileList, retries - 1, delay * 2);
    } else {
      throw e;
    }
  }
}

function buildCommandArguments(correlationId: string, jobName: string, fileList: string[]): string[] {
  const command: string[] = [];
  command.push('--correlation-id');
  command.push(correlationId);
  command.push('--job-name');
  command.push(jobName);
  command.push('--aws-read-role');
  command.push(configuration.roles.read);
  command.push('--aws-write-role');
  command.push(configuration.roles.write);
  command.push('--aws-read-bucket');
  command.push(configuration.buckets.read);
  command.push('--aws-write-bucket');
  command.push(configuration.buckets.write);
  command.push('--file-suffix');
  command.push(configuration.files.suffix);
  command.push('--destination-folder');
  command.push(configuration.files.destinationFolder);
  command.push('--file-list');
  command.push(fileList.join(';'));
  command.push('--filters-range-limits');
  command.push(configuration.pdal.limits);

  return command;
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

main().catch(console.error);
