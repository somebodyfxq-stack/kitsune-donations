import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleSelect } from "./role-select";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/admin/login");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <Suspense fallback={<TableSkeleton />}>
        <UserTable />
      </Suspense>
    </main>
  );
}

async function UserTable() {
  const users = await prisma.user.findMany({
    where: { accounts: { some: { provider: "twitch" } } },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <Table className="mt-6">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            className="odd:bg-neutral-900 even:bg-neutral-800 hover:bg-neutral-700"
          >
            <TableCell className="pr-4">{user.name}</TableCell>
            <TableCell className="pr-4">{user.email}</TableCell>
            <TableCell className="flex items-center gap-2">
              <RoleBadge role={user.role} />
              <RoleSelect userId={user.id} initialRole={user.role} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TableSkeleton() {
  return (
    <Table className="mt-6" aria-busy="true">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[0, 1, 2].map((i) => (
          <TableRow
            key={i}
            data-state="loading"
            className="odd:bg-neutral-900 even:bg-neutral-800"
          >
            <TableCell className="pr-4">
              <div className="h-4 w-24 rounded bg-neutral-700" />
            </TableCell>
            <TableCell className="pr-4">
              <div className="h-4 w-32 rounded bg-neutral-700" />
            </TableCell>
            <TableCell>
              <div className="h-4 w-16 rounded bg-neutral-700" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RoleBadge({ role }: RoleBadgeProps) {
  const variants: Record<string, string> = {
    admin: "bg-brand-500 text-white",
    streamer: "bg-neutral-700 text-neutral-200",
  };
  return (
    <Badge className={variants[role] || "bg-neutral-700 text-neutral-200"}>
      {role}
    </Badge>
  );
}

interface RoleBadgeProps {
  role: string;
}
