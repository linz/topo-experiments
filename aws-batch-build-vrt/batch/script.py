import boto3
import os
import sys
import tempfile
from linz_logger import get_log

ReadFromRoleArn = sys.argv[1]
ReadFromBucket = sys.argv[2]
ReadFromFolder = sys.argv[3]
OutputTiffName = sys.argv[4]

def assume_role(bucket_role, sts_client):
    assumed_role_object=sts_client.assume_role(
    RoleArn=bucket_role,
    RoleSessionName="AssumeRoleSessionRead"
    )

    credentials=assumed_role_object['Credentials']
    
    os.environ["AWS_ACCESS_KEY_ID"]=credentials['AccessKeyId']
    os.environ["AWS_SECRET_ACCESS_KEY"]=credentials['SecretAccessKey']
    os.environ["AWS_SESSION_TOKEN"]=credentials['SessionToken']


def get_bucket(sts_client, bucket_role, bucket_name):
    assumed_role_object=sts_client.assume_role(
    RoleArn=bucket_role,
    RoleSessionName="AssumeRoleSessionRead"
    )   

    credentials=assumed_role_object['Credentials']

    s3_resource=boto3.resource(
        's3',
        aws_access_key_id=credentials['AccessKeyId'],
        aws_secret_access_key=credentials['SecretAccessKey'],
        aws_session_token=credentials['SessionToken'],
    )

    return s3_resource.Bucket(bucket_name)

temp_dir = tempfile.mkdtemp()

sts_client = boto3.client('sts')
bucket = get_bucket(sts_client, ReadFromRoleArn, ReadFromBucket)
assume_role(ReadFromRoleArn, sts_client)

with open('input_file_list.txt', 'a') as f:
    for object in bucket.objects.filter(Prefix=ReadFromFolder):
         string_out = f"/vsis3/{bucket.name}/{object.key}"
         f.write(string_out)
         f.write('\n')
get_log().debug("tiff files read", s3Folder=f"s3://{bucket.name}/{ReadFromFolder}")
txt_file_length = len(open('input_file_list.txt').readlines(  ))
s3_file_number = len(bucket.objects.filter(Prefix=ReadFromFolder))
if txt_file_length != s3_file_number:
    get_log().warning("Number of lines in text file does not match", lines_in_text_file=txt_file_length, files_on_s3=s3_file_number)

temp_file = os.path.join(temp_dir, "hillshade")
os.system(f"gdalbuildvrt -input_file_list input_file_list.txt {temp_file}.vrt")
get_log().debug("vrt built", temp_file=f"{temp_file}.vrt")
os.system(f"gdal_translate hillshade.vrt -of GTiff {temp_file}.tiff")
get_log().debug("vrt translated to tiff", temp_file=f"{temp_file}.tiff")
os.system(f"aws s3 cp {temp_file}.tiff {OutputTiffName}")
get_log().debug("file uploaded", destination=OutputTiffName)
