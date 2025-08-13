import "./globals.css";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
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
        <Providers session={session}>
          {children}
          <div className="fixed right-4 top-4">
            <Suspense fallback={null}>
              <NavAuth />
            </Suspense>
          </div>
        </Providers>
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
