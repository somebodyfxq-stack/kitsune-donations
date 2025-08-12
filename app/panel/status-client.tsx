"use client";
import { useEffect, useState } from "react";
import type { DonationEvent } from "@prisma/client";

export interface StatusData {
  isActive: boolean;
  event: (DonationEvent & { createdAt: string }) | null;
}

interface StatusClientProps {
  initial: StatusData;
}

export function StatusClient({ initial }: StatusClientProps) {
  const [data, setData] = useState<StatusData>(initial);
  useEffect(() => {
    const es = new EventSource("/api/stream?ts=" + Date.now());
    es.addEventListener("donation", (ev) => {
      try {
        const event: DonationEvent & { createdAt: string } = JSON.parse(
          (ev as MessageEvent).data
        );
        setData((prev) => ({ ...prev, isActive: true, event }));
      } catch (err) {
        console.error("Failed to handle donation event", err);
      }
    });
    es.addEventListener("error", (err) => {
      console.error("EventSource error", err);
    });
    return () => es.close();
  }, []);
  return <StatusDetails data={data} />;
}

function StatusDetails({ data }: { data: StatusData }) {
  if (!data.event)
    return <p className="text-center text-neutral-400">No events yet</p>;
  const ev = data.event;
  const time = new Date(ev.createdAt).toLocaleString();
  return (
    <div className="grid gap-2 text-center">
      <p className="text-sm text-neutral-300">{time}</p>
      <p className="font-mono">{ev.identifier}</p>
      <p className="text-xl font-semibold">{ev.amount.toFixed(2)} ₴</p>
    </div>
  );
}
