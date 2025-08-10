import './globals.css';
export const metadata = { title: 'Підтримати Kitsune', description: 'Donations via Monobank' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="uk"><head><meta name="referrer" content="no-referrer" /></head><body>{children}</body></html>);
}
