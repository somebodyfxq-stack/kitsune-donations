import Link from "next/link";
import { getServerSession } from "next-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <Card className="flex flex-col gap-4 p-6 md:p-8">
          {session ? (
            <Button asChild variant="primary">
              <Link href="/panel">Кабінет</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="primary">
                <Link href="/login">Створити сторінку</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/panel">Увійти</Link>
              </Button>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
