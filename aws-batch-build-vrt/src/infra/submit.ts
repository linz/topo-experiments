import * as sdk from 'aws-sdk';
import * as ulid from 'ulid';

const batch = new sdk.Batch();

// USER INPUT
const JobDefinitionArn = 'JobDefinitionArn';
const JobQueueArn = 'JobQueueArn';

const ReadFromRoleArn = 'arn:aws:iam::XXXXXXXXX:role/role-name'
const ReadFromBucket = 'bucket-name'
const ReadFromFolder = 'path/to/folder/'
const OutputTiffName = 's3://bucket-name/path/to/folder/filename.tiff'
// END USER INPUT

async function main(): Promise<void> {
  const correlationId = ulid.ulid();
  console.log({ correlationId });
  submit(correlationId)
}

async function submit(correlationId: string) {
  const environment = [{ name: 'LINZ_CORRELATION_ID', value: correlationId }];
  const res = await batch
    .submitJob({
      jobName: ['Job', correlationId, 'build_vrt'].join('-'),
      jobQueue: JobQueueArn,
      jobDefinition: JobDefinitionArn,
      containerOverrides: {
        memory: 128,
        command: [ReadFromRoleArn, ReadFromBucket, ReadFromFolder, OutputTiffName],
        environment,
      },
    })
    .promise();
  console.log(res);
}

main().catch(console.error);
