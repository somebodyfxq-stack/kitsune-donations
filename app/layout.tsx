import "./globals.css";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { NavAuth } from "@/components/nav-auth";
import { getAuthSession } from "@/lib/auth";

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await getAuthSession();

  return (
    <html lang="uk">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>
        <SessionProvider session={session}>
          <NuqsAdapter>{children}</NuqsAdapter>
          <div className="fixed right-4 top-4">
            <Suspense fallback={null}>
              <NavAuth />
            </Suspense>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

export const metadata = {
  title: "Підтримати Kitsune",
  description: "Donations via Monobank",
};

interface RootLayoutProps {
  children: React.ReactNode;
}
