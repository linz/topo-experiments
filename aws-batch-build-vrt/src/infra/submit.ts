import * as sdk from 'aws-sdk';
import * as ulid from 'ulid';

const batch = new sdk.Batch();

// USER INPUT
const JobDefinitionArn = 'JobDefinitionArn';
const JobQueueArn = 'JobDefinitionArn';

const ReadFromRoleArn = 'arn:aws:iam::XXXXXX'
const ReadFromFolder = 's3://bucket/folder/'
const OutputTiffName = 's3://bucket/folder/name.tiff'


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
        command: [ReadFromRoleArn, ReadFromFolder, OutputTiffName],
        environment,
      },
    })
    .promise();
  console.log(res);
}

main().catch(console.error);
