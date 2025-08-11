import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RoleBody {
  role: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin")
    return new NextResponse("Unauthorized", { status: 401 });

  const body: RoleBody = await req.json();

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: body.role },
    select: { id: true, role: true },
  });

  return NextResponse.json(user);
}
