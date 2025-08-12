import { getCsrfToken } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default async function AdminLoginPage() {
  const csrfToken = await getCsrfToken();
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-sm px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold drop-shadow-sm md:text-5xl">
            Admin
          </h1>
          <div className="badge mt-3">Вхід до панелі</div>
        </header>
        <div className="card p-6 md:p-8">
          <form
            method="post"
            action="/api/auth/callback/credentials"
            className="flex flex-col gap-4"
          >
            <input
              name="csrfToken"
              type="hidden"
              defaultValue={csrfToken ?? undefined}
            />
            <label className="flex flex-col gap-1">
              <span className="text-sm text-neutral-300">Login</span>
              <input name="login" className="input-base" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-neutral-300">Password</span>
              <input
                name="password"
                type="password"
                className="input-base"
                required
              />
            </label>
            <input type="hidden" name="callbackUrl" value="/admin" />
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
