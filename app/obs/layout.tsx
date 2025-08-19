import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function OBSLayout({ children }: LayoutProps) {
  return (
    <div className="obs-layout" style={{ background: "transparent", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
