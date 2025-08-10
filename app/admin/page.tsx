import { getMonobankStatus } from '@/lib/store';

export default async function AdminPage() {
  const { monobankWebhookAt } = await getMonobankStatus();
  const last = monobankWebhookAt ? new Date(monobankWebhookAt).toLocaleString() : 'не отримано';
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="mt-4 rounded border p-4">
        <h2 className="font-medium">Monobank webhook</h2>
        <p className="mt-2">{last}</p>
      </div>
    </main>
  );
}
