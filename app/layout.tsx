import "./globals.css";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className={`${inter.variable} font-sans`}>
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
