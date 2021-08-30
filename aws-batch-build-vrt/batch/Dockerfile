FROM osgeo/gdal:ubuntu-small-latest

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# install awscli
RUN apt update && apt install awscli -y

# install jq
RUN apt-get install jq -y

# add script
add ./script.sh ./app/script.sh

entrypoint ["bash", "./app/script.sh"]
