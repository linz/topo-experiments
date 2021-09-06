# Hillshade Batch

### Creating Hilshades using AWS Batch

## Why?

This code exists to merge tiff files 

The main batch job is in the `./batch/Dockerfile` this is the script that is run on the batch nodes.

The configuration of the batch pipeline is done inside `./src/infra/batch.ts`

## Usage

This repository requires [NodeJs](https://nodejs.org/en/) > 12 & [Yarn](https://yarnpkg.com/en/)

Use [n](https://github.com/tj/n) to manage nodeJs versions

```bash
# Download the latest nodejs LTS & yarn
n lts
npm install -g yarn

# Install node deps
yarn

# build once (you must run this after every time you change submit.ts)
yarn build 

# Run build in watch mode - leave running in a terminal tab 
# (you wont need to run after everytime you change submit.ts)
yarn build --watch
```

Deploying is done via `aws-cdk` 
```bash
aws-azure-login --no-prompt --profile=*profile*

export AWS_PROFILE=*profile*

export AWS_DEFAULT_REGION=ap-southest-2

export AWS_REGION=ap-southeast-2

# change to id of account batch is going to be deployed to
export CDK_DEFAULT_ACCOUNT=*1234567890*

npx cdk deploy
```
edit lines 9 - 10 of `src/infra/submit.ts`:
(with output of `npx cdk deploy`)
```javascript
const JobDefinitionArn = 'JobDefinitionArn';
const JobQueueArn = 'JobQueueArn';
```

edit lines 10 - 14 of `src/infra/submit.ts`:
```javascript
// USER INPUT
const ReadFromRoleArn = 'arn:aws:iam::XXXXXXXXX:role/role-name'
const ReadFromBucket = 'bucket-name'
const ReadFromFolder = 'path/to/folder/'
const OutputTiffName = 's3://bucket-name/path/to/folder/filename.tiff'

// END USER INPUT
```
```
yarn build 

node ./build/src/infra/submit.js
```

####  Running/Testing locally with docker

```
docker build -t *name* ./batch/

docker run *name*:latest
```
