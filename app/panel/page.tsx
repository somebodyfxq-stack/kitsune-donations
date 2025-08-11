import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatusClient, StatusData } from './status-client';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'streamer') redirect('/login');

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost';
  const res = await fetch(`${proto}://${host}/api/monobank/status`, { cache: 'no-store' });
  const status: StatusData = await res.json();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold title-gradient drop-shadow-sm">Admin</h1>
          <div className="mt-3 badge">Monobank status</div>
        </header>
        <div className="card p-6 md:p-8">
          <Suspense fallback={<p className="text-center text-neutral-400">Loading…</p>}>
            <StatusClient initial={status} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
