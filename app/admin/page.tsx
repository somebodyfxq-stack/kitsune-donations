import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RoleSelect } from './role-select';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/admin/login');

  const users = await prisma.user.findMany({
    where: { accounts: { some: { provider: 'twitch' } } },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <UserTable users={users} />
    </main>
  );
}

function UserTable({ users }: { users: User[] }) {
  return (
    <table className="mt-6 w-full text-sm">
      <thead className="text-left">
        <tr>
          <th className="pb-2">Name</th>
          <th className="pb-2">Email</th>
          <th className="pb-2">Role</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-700">
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

