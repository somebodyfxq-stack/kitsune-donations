"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { NavAuth } from "./nav-auth";

export function NavigationWrapper() {
  const pathname = usePathname();
  
  // Не показувати навігацію для OBS віджетів
  const isObsWidget = pathname.startsWith('/obs/') && pathname !== '/obs';
  
  if (isObsWidget) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4">
      <Suspense fallback={null}>
        <NavAuth />
      </Suspense>
    </div>
  );
}
