FROM ubuntu:focal

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

RUN apt-get install git -y

WORKDIR /home/app

COPY src src
COPY package*.json .
# COPY kafka.pem kafka.pem
# COPY googe-api-keys-cred.json googe-api-keys-cred.json
COPY tsconfig.json tsconfig.json
COPY .env .env

RUN npm install
RUN npm install tsc -g
RUN npx tsc -b

RUN chmod +x /home/app/dist/index.js

ENTRYPOINT [ "node", "/home/app/dist/index.js" ]