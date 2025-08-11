import { Suspense } from 'react';
import { LoginButton } from './login-button';

export default function LoginPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <div className="card p-6 md:p-8 flex justify-center">
          <Suspense fallback={<p>Loading…</p>}>
            <LoginButton />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
