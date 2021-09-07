FROM pdal/pdal:latest 
RUN pip install boto3 -t /app/
RUN pip install botocore -t /app/
RUN pip install linz-logger -t /app/
ADD ./aws_helper.py /app/aws_helper.py
ADD ./script.py /app/script.py
ENTRYPOINT ["python", "/app/script.py"]