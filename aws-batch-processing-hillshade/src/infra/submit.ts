import * as sdk from 'aws-sdk';
import * as ulid from 'ulid';
import { fsa, FsS3 } from '@linzjs/s3fs'
import { basename } from 'path';

const batch = new sdk.Batch();

// USER INPUT
const JobDefinitionArn = 'JobDefinitionArn';
const JobQueueArn = 'JobQueueArn';

const ReadFromRoleArn = 'arn:aws:iam::XXXXXXX'
const ReadFromBucket = 's3://bucket/'
const ReadFromFolder = 's3://bucket/folder/'

const WriteToFolder = 's3://bucket/folder/'
const WriteToRoleArn = 'arn:aws:iam::XXXXXXXXXX'
// END USER INPUT

const approved_extensions = ['asc', 'tif', 'tiff']

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

  let upload_count = 1
  let fileList: { key: string; value: { destination: string; basename: string; }; }[] = [];

  for await (let file_name of fsa.list(ReadFromFolder)) {
    let from = file_name.replace('s3://', '/vsis3/');
    let extension = String(file_name.split('.').pop())
    if (approved_extensions.includes(extension)) {
      let to = WriteToFolder.concat(basename(file_name).replace(extension, 'tiff'));
      let base = basename(file_name).replace(extension, 'tiff')
      let values = { destination: to, basename: base }
      fileList.push({ key: from, value: values })
    }
    if (fileList.length >= 25) {
      await submit(correlationId, 'upload-' + upload_count, JSON.stringify(fileList))
      fileList = []
      upload_count++
    }
  }
  if (fileList.length > 0) {
    await submit(correlationId, "upload-" + upload_count, JSON.stringify(fileList))
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
        command: [fileList, ReadFromRoleArn, WriteToRoleArn, correlationId],
        environment,
      },
    })
    .promise();
  console.log(res);
}

main().catch(console.error);
