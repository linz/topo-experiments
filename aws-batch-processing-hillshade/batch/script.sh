#!/bin/bash
cd ./app
tmp_dir=$(mktemp -d -t hs-XXXXXXXXXX)

read_role=$(aws sts assume-role \
                    --role-arn "$2" \
                    --role-session-name "batch-session")

export AWS_ACCESS_KEY_ID=$(echo $read_role | jq -r .Credentials.AccessKeyId)
export AWS_SECRET_ACCESS_KEY=$(echo $read_role | jq -r .Credentials.SecretAccessKey)
export AWS_SESSION_TOKEN=$(echo $read_role | jq -r .Credentials.SessionToken)

echo $LINZ_CORRELATION_ID "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"

IFS=';' read -r -a file_list <<< $1
for element in ${file_list[@]}
do
    IFS=',' read -r -a file_info <<< $element
    if [ -n ${file_info[0]} ]
    then
        gdaldem hillshade ${file_info[0]} $tmp_dir/${file_info[2]}
        echo {"message": "hillshade processed", "from": ${file_info[0]}, "to": $tmp_dir/${file_info[2]}}
    fi
done
echo {"message": "gdaldem hillshade complete"}

unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
for element in ${file_list[@]}
do
    IFS=',' read -r -a file_info <<< $element
    if [ -n ${file_info[0]} ]
    then
        aws s3 cp $tmp_dir/${file_info[2]} ${file_info[1]}
        echo {"message": "hillshade uploaded", "return code": $?, "from": $tmp_dir/${file_info[2]}, "to": ${file_info[1]}}
    fi
done
echo {"message": "job complete"}
