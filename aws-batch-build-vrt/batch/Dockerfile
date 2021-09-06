FROM osgeo/gdal:ubuntu-small-latest

# install awscli
RUN apt update && apt install awscli -y

# install jq
RUN apt-get install jq -y

# install boto3
RUN apt-get install python3-pip -y
RUN pip install boto3 -t /app/

# install linz-logger
RUN pip install linz-logger

# add scripts
ADD ./script.py /app/script.py
ENTRYPOINT ["python", "/app/script.py"]
