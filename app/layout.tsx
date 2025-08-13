import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { NavAuth } from "@/components/nav-auth";

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
        <div className="fixed right-4 top-4">
          <Suspense fallback={null}>
            <NavAuth />
          </Suspense>
        </div>
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
