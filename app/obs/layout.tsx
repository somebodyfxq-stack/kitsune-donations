import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function OBSLayout({ children }: LayoutProps) {
  return (
    <html lang="uk">
      <head>
        <meta httpEquiv="Cache-Control" content="no-store" />
      </head>
      <body style={{ background: "transparent" }}>{children}</body>
    </html>
  );
}

