cd ./app
tmp_dir=$(mktemp -d -t hs-XXXXXXXXXX)

read_role=$(aws sts assume-role \
                    --role-arn "$1" \
                    --role-session-name "batch-session")

export AWS_ACCESS_KEY_ID=$(echo $read_role | jq -r .Credentials.AccessKeyId)
export AWS_SECRET_ACCESS_KEY=$(echo $read_role | jq -r .Credentials.SecretAccessKey)
export AWS_SESSION_TOKEN=$(echo $read_role | jq -r .Credentials.SessionToken)

readFrom=$2
read_vsis=${readFrom//'s3://'/'/vsis3'/}
for file_path in $(aws s3 ls $readFrom);
do 
    if [[ $file_path == D* ]]
    then
        final_path=$read_vsis$file_path
        echo $final_path >> input_file_list.txt
    fi
done


gdalbuildvrt -input_file_list input_file_list.txt hillshade.vrt
gdal_translate hillshade.vrt -of GTiff hillshade.tiff
aws s3 cp hillshade.tiff $3
