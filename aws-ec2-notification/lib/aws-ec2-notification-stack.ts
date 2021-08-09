import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';

export class AwsEc2NotificationStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

        const notify = new lambda.NodejsFunction(this, 'NotifyHandler', {
          entry: 'src/lambda/notify.ts',
          handler: 'handler'
        });
  }
}
