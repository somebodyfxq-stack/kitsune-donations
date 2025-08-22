import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function OBSLayout({ children }: LayoutProps) {
  return (
    <>
      {/* Чистий віджет без жодних UI елементів */}
      <div 
        className="w-full h-screen bg-transparent overflow-hidden m-0 p-0"
        suppressHydrationWarning={true}
      >
        {children}
      </div>
    </>
  );
}
