"use client";

import { clsx } from "clsx";

export function AmountPresets({ value, onChange }: AmountPresetsProps) {
  return (
    <div className="flex gap-1">
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          aria-label={`Обрати ${preset} гривень`}
          className={clsx(
            "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
            "bg-white/5 ring-1 ring-white/10 hover:bg-white/10",
            "focus:outline-none focus:ring-2 focus:ring-purple-400",
            value === preset 
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white ring-0 shadow-lg shadow-fuchsia-900/20" 
              : "text-neutral-100"
          )}
          onClick={() => onChange(preset)}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}

const presets = [50, 100, 200, 500];

interface AmountPresetsProps {
  value: number;
  onChange: (n: number) => void;
}
