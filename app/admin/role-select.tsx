"use client";

import { useState, useTransition } from "react";

interface RoleSelectProps {
  userId: string;
  initialRole: string;
}

export function RoleSelect({ userId, initialRole }: RoleSelectProps) {
  const [role, setRole] = useState(initialRole);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 3000);
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextRole = e.target.value;
    const previousRole = role;
    setRole(nextRole);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        });
        if (!response.ok) throw new Error();
      } catch {
        setRole(previousRole);
        showToast("Не вдалося оновити роль. Спробуйте ще раз.");
      }
    });
  }

  return (
    <>
      <select
        value={role}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-neutral-700 bg-transparent p-1"
      >
        <option value="streamer">streamer</option>
        <option value="admin">admin</option>
      </select>
      {toast && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {toast}
        </p>
      )}
    </>
  );
}
