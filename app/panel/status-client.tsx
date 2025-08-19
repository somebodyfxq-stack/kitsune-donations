"use client";
import { useEffect, useState } from "react";
import type { DonationEvent } from "@prisma/client";

export interface StatusData {
  isActive: boolean;
  event: (DonationEvent & { createdAt: string }) | null;
  isConnected?: boolean;
  jarTitle?: string;
  jarGoal?: number;
  obsWidgetToken?: string;
  webhookStatus?: {
    url?: string;
    isConfigured: boolean;
    lastError?: string;
  };
}

interface StatusClientProps {
  initial: StatusData;
}

export function StatusClient({ initial }: StatusClientProps) {
  // Компонент тимчасово прихований - інформація про останній донат тепер в історії донатів
  return null;
}

function StatusDetails({ data }: { data: StatusData }) {
  if (!data.event) return null; // Прибираємо "No events yet"
  
  const ev = data.event;
  const time = new Date(ev.createdAt).toLocaleString();
  return (
    <div className="card p-6 md:p-8">
      <h2 className="text-lg font-medium mb-4 text-center">Останній донат</h2>
      <div className="grid gap-2 text-center">
        <p className="text-sm text-neutral-400">{time}</p>
        <p className="font-mono text-neutral-300">{ev.identifier}</p>
        <p className="text-2xl font-bold text-gradient">{ev.amount.toFixed(2)} ₴</p>
        <p className="text-sm text-neutral-300 mt-2">{ev.nickname}</p>
        <p className="text-xs text-neutral-400 italic">"{ev.message}"</p>
      </div>
    </div>
  );
}
