import { Suspense } from "react";
import { ObsWidgetClient } from "./obs-widget-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function ObsWidgetPage() {
  return (
    <Suspense fallback={null}>
      <ObsWidgetClient />
    </Suspense>
  );
}
