import sys
import tempfile
import json
import os
import boto3
import shutil
from linz_logger import logger

file_list = sys.argv[1]
role_read = sys.argv[2]
role_write = sys.argv[3]
correlation_id = sys.argv[4]

def assume_role(bucket_role, sts_client):
    assumed_role_object=sts_client.assume_role(
    RoleArn=bucket_role,
    RoleSessionName="AssumeRoleSessionRead"
    )

    credentials=assumed_role_object['Credentials']
    
    os.environ["AWS_ACCESS_KEY_ID"]=credentials['AccessKeyId']
    os.environ["AWS_SECRET_ACCESS_KEY"]=credentials['SecretAccessKey']
    os.environ["AWS_SESSION_TOKEN"]=credentials['SessionToken']

temp_dir = tempfile.mkdtemp()

files = json.loads(file_list)

sts_client = boto3.client('sts')

for file in files:
    input = file['key']
    temp_output = os.path.join(temp_dir, file['value']['basename'])
    destination = file['value']['destination']
    assume_role(role_read, sts_client)
    os.system(f"gdaldem hillshade {input} {temp_output}")
    logger.get_log().debug("Hillshade Created", hillshade=temp_output, correlationId=correlation_id)
    assume_role(role_write, sts_client)
    os.system(f"aws s3 cp {temp_output} {destination}")
    logger.get_log().debug("File copied", file=destination, correlationId=correlation_id)
logger.get_log().debug("upload completed", correlationId=correlation_id)

shutil.rmtree(temp_dir)
