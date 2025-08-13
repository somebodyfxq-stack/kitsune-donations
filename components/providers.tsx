"use client";

import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { Session } from "next-auth";

export function Providers({ session, children }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </SessionProvider>
  );
}

interface ProvidersProps {
  session: Session | null;
  children: React.ReactNode;
}

