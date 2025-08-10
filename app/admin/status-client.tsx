'use client';
import { useEffect, useState } from 'react';
import type { DonationEvent } from '@/lib/utils';

export interface StatusData {
  isActive: boolean;
  event: DonationEvent | null;
}

interface StatusClientProps {
  initial: StatusData;
}

export function StatusClient({ initial }: StatusClientProps) {
  const [data, setData] = useState<StatusData>(initial);
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/monobank/status', { cache: 'no-store' });
        const json: StatusData = await res.json();
        setData(json);
      } catch {}
    }, 10_000);
    return () => clearInterval(id);
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
