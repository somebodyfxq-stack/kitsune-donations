import { Suspense } from 'react';
import { LoginButton } from './login-button';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<p>Loading…</p>}>
        <LoginButton />
      </Suspense>
    </main>
  );
}
