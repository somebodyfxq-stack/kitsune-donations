import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') redirect('/login');

  const [jarId, monobankToken] = await Promise.all([
    getSetting('jarId'),
    getSetting('monobankToken'),
  ]);

  async function save(formData: FormData) {
    'use server';
    const jar = formData.get('jarId')?.toString().trim() ?? '';
    const token = formData.get('monobankToken')?.toString().trim() ?? '';
    await Promise.all([
      setSetting('jarId', jar),
      setSetting('monobankToken', token),
    ]);
    redirect('/admin/settings');
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold title-gradient drop-shadow-sm">Admin</h1>
          <div className="mt-3 badge">Settings</div>
        </header>
        <form action={save} className="card p-6 md:p-8 grid gap-6">
          <div className="grid gap-2">
            <label htmlFor="jarId" className="text-sm text-neutral-300">Jar ID</label>
            <input id="jarId" name="jarId" defaultValue={jarId ?? ''} className="input-base" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="monobankToken" className="text-sm text-neutral-300">Monobank token</label>
            <input id="monobankToken" name="monobankToken" defaultValue={monobankToken ?? ''} className="input-base" required />
          </div>
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </div>
    </main>
  );
}
