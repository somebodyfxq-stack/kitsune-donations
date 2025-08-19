import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { getMonobankSettings, upsertMonobankSettings } from "@/lib/store";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session || session.user?.role !== "admin") redirect("/login");

  const settings = await getMonobankSettings(session.user.id);
  const jarId = settings?.jarId ?? null;
  const monobankToken = settings?.token ?? null;

  async function save(formData: FormData) {
    "use server";
    const jar = formData.get("jarId")?.toString().trim() ?? "";
    const token = formData.get("monobankToken")?.toString().trim() ?? "";
    await upsertMonobankSettings(session!.user.id, { jarId: jar, token });
    redirect("/panel/settings");
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold drop-shadow-sm md:text-5xl">
            Admin
          </h1>
          <div className="badge mt-3">Settings</div>
        </header>
        <form action={save} className="card grid gap-6 p-6 md:p-8">
          <div className="grid gap-2">
            <label htmlFor="jarId" className="text-sm text-neutral-300">
              Jar ID
            </label>
            <input
              id="jarId"
              name="jarId"
              defaultValue={jarId ?? ""}
              className="input-base"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="monobankToken" className="text-sm text-neutral-300">
              Monobank token
            </label>
            <input
              id="monobankToken"
              name="monobankToken"
              defaultValue={monobankToken ?? ""}
              className="input-base"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </div>
    </main>
  );
}
