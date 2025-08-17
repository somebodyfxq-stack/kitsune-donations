import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <div className="card flex flex-col gap-4 p-6 md:p-8">
          {session?.user ? (
            <Link href="/panel" className="btn-primary text-center">
              Кабінет
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-primary text-center">
                Створити сторінку
              </Link>
              <Link href="/login" className="btn-ghost text-center">
                Увійти
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
