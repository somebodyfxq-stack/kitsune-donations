import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
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
