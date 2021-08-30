FROM pdal/pdal:latest 
RUN pip install boto3 -t /app/
ADD ./pipeline.json /app/pipeline.json
ADD ./aws_helper.py /app/aws_helper.py
ADD ./script.py /app/script.py
ENTRYPOINT ["python", "/app/script.py"]