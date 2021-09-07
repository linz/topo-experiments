# AWS Batch PDAL

### _Batch jobs on AWS to execute PDAL pipelines_

## Purpose

[Point Data Abstraction Library or PDAL](https://pdal.io/) is a set of tools for translating and processing point cloud data (LiDAR and others).
The AWS-Batch-pdal project allows to execute a [pdal pipeline](https://pdal.io/pipeline.html) on a dataset located in the AWS cloud.

## Usage

This repository requires:
[NodeJs](https://nodejs.org/en/) > 12
[Yarn](https://yarnpkg.com/en/)
[AWS-CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)

Use [n](https://github.com/tj/n) to manage nodeJs versions

```bash
# Download the latest nodejs LTS & yarn
n lts
npm install -g yarn

# Install node deps
yarn

# build once
yarn build 

# Run build in watch mode
yarn build --watch
```

Configuration
```config.json
//TODO
```

Deploying is done via `aws-cdk` 
```
export CDK_DEFAULT_ACCOUNT=1234567890

npx cdk deploy

node node ./build/src/infra/submit.js 
```


