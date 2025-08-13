import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RoleSelect } from "./role-select";

export default async function AdminPage() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "admin") redirect("/admin/login");

  const users = await prisma.user.findMany({
    where: { accounts: { some: { provider: "twitch" } } },
    select: { id: true, name: true, email: true, role: true },
  });

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
          <div className="badge mt-3">Dashboard</div>
        </header>
        <div className="card overflow-x-auto p-6 md:p-8">
          <UserTable users={users} />
        </div>
      </div>
    </main>
  );
}

interface UserTableProps {
  users: User[];
}

function UserTable({ users }: UserTableProps) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left">
        <tr>
          <th className="pb-2">Name</th>
          <th className="pb-2">Email</th>
          <th className="pb-2">Role</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10">
        {users.map((user) => (
          <tr key={user.id} className="h-10">
            <td className="pr-4">{user.name}</td>
            <td className="pr-4">{user.email}</td>
            <td>
              <RoleSelect userId={user.id} initialRole={user.role} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}
