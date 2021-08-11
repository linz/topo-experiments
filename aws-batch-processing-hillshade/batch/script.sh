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
    IFS=',' read -r -a tuple <<< $element
    if [ -n ${tuple[0]} ]
    then
        gdaldem hillshade ${tuple[0]} $tmp_dir/hillshade.tiff
        gdal_translate $tmp_dir/hillshade.tiff $tmp_dir/hillshade_cog.tiff -of COG -co COMPRESS=lzw -co NUM_THREADS=ALL_CPUS -co PREDICTOR=2
        unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
        aws sts get-caller-identity
        write_role=$(aws sts assume-role \
                            --role-arn "$3" \
                            --role-session-name "batch-session")

        export AWS_ACCESS_KEY_ID=$(echo $write_role | jq -r .Credentials.AccessKeyId)
        export AWS_SECRET_ACCESS_KEY=$(echo $write_role | jq -r .Credentials.SecretAccessKey)
        export AWS_SESSION_TOKEN=$(echo $write_role | jq -r .Credentials.SessionToken)
        aws s3 cp $tmp_dir/hillshade_cog.tiff ${tuple[1]}
    fi
done
