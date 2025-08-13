"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function NavAuth() {
  const { data: session } = useSession();

  if (!session?.user)
    return (
      <div className="flex gap-2">
        <Link href="/register" className="inline-block">
          <button className="btn btn-ghost">Зареєструватись</button>
        </Link>
        <Link href="/login" className="inline-block">
          <button className="btn btn-primary">Увійти</button>
        </Link>
      </div>
    );

  return (
    <div>
      <Link href="/panel" className="inline-block">
        <button className="btn btn-primary">Кабінет</button>
      </Link>
    </div>
  );
}
