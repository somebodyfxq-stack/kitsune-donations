import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RoleBody {
  role: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAuthSession();
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
