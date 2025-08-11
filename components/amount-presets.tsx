'use client';

import { clsx } from 'clsx';

export function AmountPresets({ value, onChange }: AmountPresetsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {presets.map(preset => (
        <button
          key={preset}
          type="button"
          aria-label={`Обрати ${preset} гривень`}
          className={clsx('pill', value === preset && 'ring-2 ring-purple-400')}
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

