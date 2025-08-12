import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StatusClient, StatusData } from "./status-client";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "streamer") redirect("/login");

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost";
  const res = await fetch(`${proto}://${host}/api/monobank/status`, {
    cache: "no-store",
  });
  const status: StatusData = await res.json();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div
        className="relative mx-auto max-w-sm px-4 py-10 sm:max-w-xl sm:px-6 sm:py-14 md:max-w-2xl md:px-8 md:py-16 lg:max-w-3xl lg:px-10 lg:py-20"
      >
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold drop-shadow-sm md:text-5xl">
            Admin
          </h1>
          <div className="badge mt-3">Monobank status</div>
        </header>
        <Card className="px-4 py-6 sm:p-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <Suspense
            fallback={<p className="text-center text-neutral-400">Loading…</p>}
          >
            <StatusClient initial={status} />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
