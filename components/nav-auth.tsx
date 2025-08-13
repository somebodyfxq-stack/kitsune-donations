"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
export function NavAuth() {
  const { data: session } = useSession();

  if (!session?.user)
    return (
      <div className="flex gap-2">
        <Link href="/register" className="btn-secondary">
          Зареєструватись
        </Link>
        <Link href="/login" className="btn-primary">
          Увійти
        </Link>
      </div>
    );

  return (
    <div>
      <Link href="/panel" className="btn-primary">
        Кабінет
      </Link>
    </div>
  );
}
