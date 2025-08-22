import "./globals.css";
import { Providers } from "@/components/providers";
import { NavigationWrapper } from "@/components/navigation-wrapper";
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
          <NavigationWrapper />
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
