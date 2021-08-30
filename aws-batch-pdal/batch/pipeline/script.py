import sys
import os
import boto3
import aws_helper

#this script
print('Python script: ', sys.argv[0])
#filelist
print('files list: ', sys.argv[1])
#Read Role
print('AWS Role read: ', sys.argv[2])
#Write Role
print('AWS Role write: ', sys.argv[3])
#Bucket Read
print('S3 bucket read: ', sys.argv[4])
#Bucket Write
print('S3 bucket write: ', sys.argv[5])
#Bucket Write
print('Extracted file name suffix: ', sys.argv[6])

aws_read_role = sys.argv[2]
aws_write_role = sys.argv[3]
aws_bucket_read = sys.argv[4]
aws_bucket_write = sys.argv[5]
file_name_suffix = sys.argv[6]
file_dst_folder = sys.argv[7]

tmp_dir = "tmp"

sts_client = boto3.client('sts')
src_bucket = aws_helper.get_bucket(sts_client, aws_read_role, aws_bucket_read)

files_list = sys.argv[1].split(';')

#Download the files
for file in files_list:
    if os.path.splitext(file)[1] == '.laz':
        path = os.path.dirname(file).replace('s3://', '').replace(aws_bucket_read, '')
        path = path[1:]
        fileName = os.path.basename(file)
        print('path: ',path)
        print('file: ', fileName)
        src_bucket.download_file(path + '/'+ fileName, '/' + tmp_dir + '/' + fileName)

#Apply pdal translate
for dir_, _, files in os.walk(tmp_dir):
    for file_name in files:
        print('pdal processing: ' + file_name + ' - size: ' + str(os.path.getsize(tmp_dir + '/' + file_name)))
        input_file = tmp_dir + '/' + file_name
        output_file = tmp_dir + '/' + os.path.splitext(file_name)[0] + '_buildings.laz'
        os.system('pdal pipeline -i app/pipeline.json --writers.las.filename=%(output_file)s --readers.las.filename=%(input_file)s' %{'input_file': input_file, 'output_file': output_file})

dst_bucket = aws_helper.get_bucket(sts_client, aws_write_role, aws_bucket_write)
#Upload the files on the destination bucket
for dir_, _, files in os.walk(tmp_dir):
    for file_name in files:
        print(file_name)
        if os.path.splitext(file_name)[0].endswith(file_name_suffix):
            print('Uploading ' + file_name + ' - size: '+  str(os.path.getsize(tmp_dir + '/' + file_name)))
            dst_bucket.upload_file(tmp_dir + '/' + file_name, file_dst_folder + file_name)