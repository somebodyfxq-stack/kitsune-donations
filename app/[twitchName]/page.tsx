import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DonationForm } from "@/components/donation-form";
import { Card } from "@/components/ui/card";

interface StreamerPageProps {
  params: { twitchName: string };
}

export default async function StreamerPage({ params }: StreamerPageProps) {
  const { twitchName } = params;
  const name = twitchName.toLowerCase();
  const streamer = await prisma.user.findFirst({
    where: { name, accounts: { some: { provider: "twitch" } } },
    select: { id: true },
  });
  if (!streamer) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Підтримати {twitchName}</h1>
      <Suspense fallback={<Card className="p-6">Завантаження…</Card>}>
        <DonationForm />
      </Suspense>
    </main>
  );
}
