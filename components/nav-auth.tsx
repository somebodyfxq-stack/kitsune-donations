"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NavAuth(_: NavAuthProps) {
  const { data: session } = useSession();

  if (!session?.user)
    return (
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/register">Зареєструватись</Link>
        </Button>
        <Button asChild>
          <Link href="/login">Увійти</Link>
        </Button>
      </div>
    );

  return (
    <div>
      <Button asChild>
        <Link href="/panel">Кабінет</Link>
      </Button>
    </div>
  );
}

interface NavAuthProps {}

