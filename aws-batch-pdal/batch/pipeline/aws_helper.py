import boto3

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