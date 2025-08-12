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
    <main
      className="mx-auto max-w-sm px-4 py-6 sm:max-w-xl sm:px-6 sm:py-8 md:max-w-2xl md:px-8 md:py-10 lg:max-w-3xl lg:px-10 lg:py-12"
    >
      <h1 className="mb-6 text-2xl font-bold">Підтримати {twitchName}</h1>
      <Suspense
        fallback={
          <Card className="px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
            Завантаження…
          </Card>
        }
      >
        <DonationForm />
      </Suspense>
    </main>
  );
}
