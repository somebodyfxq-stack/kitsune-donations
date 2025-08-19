import { Suspense, lazy } from "react";
import { notFound } from "next/navigation";
import { findUserByObsWidgetToken } from "@/lib/store";

// Lazy load OBS компонента для зменшення initial bundle
const ObsWidgetClient = lazy(() => import("../obs-widget-client").then(m => ({ default: m.ObsWidgetClient })));

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface ObsWidgetPageProps {
  params: { token: string };
}

export default async function ObsWidgetPage({ params }: ObsWidgetPageProps) {
  // Знаходимо користувача по obsWidgetToken
  const streamerId = await findUserByObsWidgetToken(params.token);
  
  if (!streamerId) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Завантаження віджета...</div>}>
      <ObsWidgetClient streamerId={streamerId} />
    </Suspense>
  );
}


