import { getSetting } from '@/lib/store';

export async function configureWebhook(webhookUrl: string): Promise<void> {
  const token = await getSetting('monobankToken') || process.env.MONOBANK_TOKEN;
  if (!token) return;
  const res = await fetch('https://api.monobank.ua/personal/webhook', {
    method: 'POST',
    headers: {
      'X-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webHookUrl: webhookUrl }),
  });
  const details = await res.text();
  if (res.ok) return;
  if (res.status === 400 && /already/i.test(details)) {
    console.warn(`Monobank webhook already configured: ${details}`);
    return;
  }
  throw new Error(
    `Failed to configure Monobank webhook: ${res.status} ${details}`,
  );
}
