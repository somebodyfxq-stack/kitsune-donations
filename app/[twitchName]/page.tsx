import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DonationForm } from "@/components/donation-form";

interface StreamerPageProps {
  params: { twitchName: string };
}

export default async function StreamerPage({ params }: StreamerPageProps) {
  const { twitchName } = params;
  const streamer = await prisma.user.findFirst({
    where: { name: { equals: twitchName, mode: "insensitive" }, accounts: { some: { provider: "twitch" } } },
    select: { id: true },
  });
  if (!streamer) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Підтримати {twitchName}</h1>
      <Suspense fallback={<div className="card p-6">Завантаження…</div>}>
        <DonationForm />
      </Suspense>
    </main>
  );
}
