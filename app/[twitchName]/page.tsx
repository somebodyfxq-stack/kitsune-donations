import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { DonationForm } from "@/components/donation-form";

interface StreamerPageProps {
  params: Promise<{ twitchName: string }>;
}

export default async function StreamerPage({ params }: StreamerPageProps) {
  const { twitchName } = await params;
  const name = twitchName.toLowerCase();
  const streamer = await prisma.user.findFirst({
    where: { name, accounts: { some: { provider: "twitch" } } },
    select: { id: true },
  });
  if (!streamer) notFound();
  const session = await getAuthSession();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold leading-tight md:text-4xl pb-1">
            Підтримати {twitchName}
          </h1>
          <div className="badge mt-3">Донат через Monobank 💖</div>
        </header>
        <Suspense
          fallback={<div className="card p-6 md:p-8">Завантаження…</div>}
        >
          <DonationForm initialName={session?.user?.name} />
        </Suspense>
      </div>
    </main>
  );
}
