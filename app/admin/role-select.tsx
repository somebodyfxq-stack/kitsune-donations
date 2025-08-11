'use client';

import { useState, useTransition } from 'react';

interface RoleSelectProps {
  userId: string;
  initialRole: string;
}

export function RoleSelect({ userId, initialRole }: RoleSelectProps) {
  const [role, setRole] = useState(initialRole);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextRole = e.target.value;
    setRole(nextRole);
    startTransition(async () => {
      await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
    });
  }

  return (
    <select
      value={role}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-neutral-700 bg-transparent p-1"
    >
      <option value="streamer">streamer</option>
      <option value="admin">admin</option>
    </select>
  );
}

