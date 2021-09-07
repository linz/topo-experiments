import os
import tempfile
import argparse
import boto3
import botocore
import aws_helper
from linz_logger import get_log 

parser = argparse.ArgumentParser()
parser.add_argument('--correlation-id', dest='correlation_id', required=True)
parser.add_argument('--job-name', dest='job_name', required=True)
parser.add_argument('--aws-read-role',dest='aws_read_role', required=True)
parser.add_argument('--aws-write-role',dest='aws_write_role', required=True)
parser.add_argument('--aws-read-bucket', dest='aws_read_bucket', required=True)
parser.add_argument('--aws-write-bucket', dest='aws_write_bucket', required=True)
parser.add_argument('--file-suffix', dest='file_suffix', required=True)
parser.add_argument('--destination-folder', dest='destination_folder', required=True)
parser.add_argument('--file-list', dest='file_list', required=True)
parser.add_argument('--filters-range-limits', dest='filters_range_limits', required=True)
arguments = parser.parse_args()

correlation_id = arguments.correlation_id
job_name = arguments.job_name
aws_read_role = arguments.aws_read_role
aws_write_role = arguments.aws_write_role
aws_bucket_read = arguments.aws_read_bucket
aws_bucket_write = arguments.aws_write_bucket
file_name_suffix = arguments.file_suffix
file_dst_folder = arguments.destination_folder
files_list = arguments.file_list.split(';')
filters_range_limits = arguments.filters_range_limits

get_log().info("START aws-batch-pdal job", AWSBatchStackName='aws-batch-pdal', correlationId=correlation_id, jobName=job_name, jobAction='PDAL translate', pdalTranslateRangeLimits=filters_range_limits, jobStatus='Start', filesList=files_list, srcBucket=aws_bucket_read, dstBucket=aws_bucket_write)

sts_client = boto3.client('sts')
src_bucket = aws_helper.get_bucket(sts_client, aws_read_role, aws_bucket_read)
dst_bucket = aws_helper.get_bucket(sts_client, aws_write_role, aws_bucket_write)

with tempfile.TemporaryDirectory() as tmp_dir:
    for file in files_list:
        if os.path.splitext(file)[1] == '.laz':
            # Download file from source bucket
            src_path = os.path.dirname(file).replace('s3://', '').replace(aws_bucket_read, '')
            src_path = src_path[1:]
            file_name = os.path.basename(file)
            try:
                src_bucket.download_file(os.path.join(src_path, file_name), os.path.join(tmp_dir,file_name))
            except botocore.exceptions.ClientError as error:
                get_log.error("ERROR DOWNLOAD FILE", AWSBatchStackName='aws-batch-pdal', correlationId=correlation_id, jobName=job_name, jobAction='PDAL translate', jobStatus='Error', errorStack=error)
                raise error
            except botocore.exceptions.ParamValidationError as error:
                get_log.error("ERROR INCORRECT PARAMETERS", AWSBatchStackName='aws-batch-pdal', correlationId=correlation_id, jobName=job_name, jobAction='PDAL translate', jobStatus='Error', errorStack=error)
                raise ValueError('The parameters provided are incorrect: {}'.format(error))
            
            # PDAL processing
            input_file = os.path.join(tmp_dir, file_name)
            extracted_file_name = os.path.splitext(file_name)[0] + file_name_suffix + os.path.splitext(file_name)[1]
            output_file = os.path.join(tmp_dir, extracted_file_name)
            # FIXME try catch this process
            os.system('pdal translate -i %(input_file)s -o %(output_file)s -f range --filters.range.limits="%(limits)s"' %{'input_file': input_file, 'output_file': output_file, 'limits': filters_range_limits})

            # Upload the extracted file to destination bucket
            try:
                dst_bucket.upload_file(output_file, file_dst_folder + extracted_file_name)
            except botocore.exceptions.ClientError as error:
                get_log.error("ERROR UPLOAD FILE", AWSBatchStackName='aws-batch-pdal', correlationId=correlation_id, jobName=job_name, jobAction='PDAL translate',jobStatus='Error', errorStack=error)
                raise error
            except botocore.exceptions.ParamValidationError as error:
                get_log.error("ERROR INCORRECT PARAMETERS", AWSBatchStackName='aws-batch-pdal', correlationId=correlation_id, jobName=job_name, jobAction='PDAL translate',jobStatus='Error', errorStack=error)
                raise ValueError('The parameters provided are incorrect: {}'.format(error))
            
get_log().info('STOP aws-batch-pdal job', correlationId=correlation_id, jobName=job_name, jobAction='PDAL translate', pdalTranslateRangeLimits=filters_range_limits, jobStatus='End', filesList=files_list, srcBucket=aws_bucket_read, dstBucket=aws_bucket_write)