import pino from 'pino';

//TODO add data from the configuration file like source and destination buckets, pdal command etc.
export const logger = pino().child({ AWSBatchStackName: 'aws-batch-pdal' });
