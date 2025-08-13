import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { StatusClient, StatusData } from "./status-client";

export default async function AdminPage() {
  const session = await getAuthSession();
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
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold drop-shadow-sm md:text-5xl">
            Admin
          </h1>
          <div className="badge mt-3">Monobank status</div>
        </header>
        <div className="card p-6 md:p-8">
          <Suspense
            fallback={<p className="text-center text-neutral-400">Loading…</p>}
          >
            <StatusClient initial={status} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
