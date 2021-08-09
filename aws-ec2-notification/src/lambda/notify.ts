import { IncomingWebhookSendArguments } from '@slack/webhook';
import { getRunningInstances } from '../ec2';
import { RunningInstance } from '../ec2.running.instance';
import { notify } from '../slack';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
exports.handler = async () => {
  try {
    const runningInstances: RunningInstance[] = await getRunningInstances();

    if (runningInstances.length > 0) {
      const msg: IncomingWebhookSendArguments = buildMessage(runningInstances);
      //FIXME: timeout issue while executing Lambda function from AWS.
      await notify(msg);
    }
  } catch (e) {
    throw e;
  }
};

function buildMessage(runningInstances: RunningInstance[]): IncomingWebhookSendArguments {
  const message: IncomingWebhookSendArguments = {
    text: 'Some AWS EC2 instances are currently running.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':warning: AWS EC2 Instance(s) currently *running* on YOUR_ENVIRONMENT',
        },
      },
      {
        type: 'divider',
      },
    ],
  };

  runningInstances.forEach((instance) => {
    const instanceMsg =
      '*' +
      instance.instanceName +
      ' (' +
      instance.instanceId +
      ')* \nStarted the _' +
      instance.startingTime.toLocaleDateString() +
      ' at ' +
      instance.startingTime.toLocaleTimeString() +
      '_ by *' +
      instance.startingUserName +
      '*.';
    message.blocks?.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: instanceMsg,
      },
    });
  });
  console.info(message);
  return message;
}
