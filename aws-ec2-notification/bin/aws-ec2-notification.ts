#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { AwsEc2NotificationStack } from '../lib/aws-ec2-notification-stack';

const app = new cdk.App();
new AwsEc2NotificationStack(app, 'AwsEc2NotificationStack');
