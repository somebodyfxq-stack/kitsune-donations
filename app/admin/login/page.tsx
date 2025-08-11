import { getCsrfToken } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default async function AdminLoginPage() {
  const csrfToken = await getCsrfToken();
  return (
    <main className="mx-auto max-w-sm p-6">
      <form
        method="post"
        action="/api/auth/callback/credentials"
        className="flex flex-col gap-4"
      >
        <input name="csrfToken" type="hidden" defaultValue={csrfToken ?? undefined} />
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-300">Login</span>
          <input
            name="login"
            className="rounded-md border border-neutral-700 bg-transparent p-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-300">Password</span>
          <input
            name="password"
            type="password"
            className="rounded-md border border-neutral-700 bg-transparent p-2"
            required
          />
        </label>
        <input type="hidden" name="callbackUrl" value="/admin" />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}

