import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { StatusClient, type StatusData } from "./status-client";
import { MonobankClient } from "./monobank-client";

// PanelPage displays Monobank donation settings for the authenticated
// streamer.  It shows the latest donation status and provides a UI to
// connect a Monobank jar.  When no session exists or the user is not
// a streamer the user is redirected to the login screen.

export default async function PanelPage() {
  const session = await getAuthSession();
  if (!session || session.user?.role !== "streamer") {
    redirect("/login");
  }
  // Build an absolute URL for the status API to allow SSR behind proxies.
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost";
  const res = await fetch(`${proto}://${host}/api/monobank/status`, {
    cache: "no-store",
  });
  const status: StatusData = await res.json();
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold text-white">
        Налаштування Monobank
      </h1>
      {/* Show the last donation event and connection status */}
      <div className="mb-6">
        <Suspense fallback={<div>Loading…</div>}>
          <StatusClient initial={status} />
        </Suspense>
      </div>
      {/* UI for connecting the Monobank jar */}
      <MonobankClient />
    </div>
  );
}