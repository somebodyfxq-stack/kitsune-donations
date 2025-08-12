import { Suspense } from "react";
import { LoginButton } from "./login-button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <Card className="flex justify-center p-6 md:p-8">
          <Suspense fallback={<p>Loading…</p>}>
            <LoginButton />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
