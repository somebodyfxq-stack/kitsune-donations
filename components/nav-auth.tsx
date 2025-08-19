"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function NavAuth() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // На головній сторінці та сторінках авторизації не показуємо жодних кнопок
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    return null;
  }

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

  const userSlug = session.user?.name?.toLowerCase();
  
  // На сторінці панелі показуємо тільки "Моя сторінка"
  if (pathname === "/panel") {
    return (
      <div className="flex gap-2">
        {userSlug && (
          <Link href={`/${userSlug}`} className="btn-primary text-sm">
            Моя сторінка
          </Link>
        )}
      </div>
    );
  }

  // На персональній сторінці показуємо тільки "Кабінет"
  if (pathname === `/${userSlug}`) {
    return (
      <div className="flex gap-2">
        <Link href="/panel" className="btn-secondary text-sm">
          Кабінет
        </Link>
      </div>
    );
  }

  // На всіх інших сторінках показуємо обидві кнопки (fallback)
  return (
    <div className="flex gap-2">
      <Link href="/panel" className="btn-secondary text-sm">
        Кабінет
      </Link>
      {userSlug && (
        <Link href={`/${userSlug}`} className="btn-primary text-sm">
          Моя сторінка
        </Link>
      )}
    </div>
  );
}
