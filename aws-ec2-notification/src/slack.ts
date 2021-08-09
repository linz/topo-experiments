import { IncomingWebhook, IncomingWebhookResult, IncomingWebhookSendArguments } from '@slack/webhook';

export async function notify(message: IncomingWebhookSendArguments): Promise<IncomingWebhookResult> {
  const webhook = new IncomingWebhook('WEBHOOK_URL');
  try {
    return await webhook.send(message);
  } catch (e) {
    throw e;
  }
}
