export async function configureWebhook(webhookUrl: string): Promise<void> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) return;
  const res = await fetch('https://api.monobank.ua/personal/webhook', {
    method: 'POST',
    headers: {
      'X-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webHookUrl: webhookUrl }),
  });
  if (!res.ok) throw new Error(`Failed to configure Monobank webhook: ${res.status}`);
}
