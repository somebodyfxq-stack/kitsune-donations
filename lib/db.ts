import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

function lowercaseUserName(
  params: Prisma.MiddlewareParams,
  next: any,
) {
  if (params.model === "User" && (params.action === "create" || params.action === "update")) {
    const name: unknown = params.args.data?.name;
    if (typeof name === "string") params.args.data.name = name.toLowerCase();
  }
  return next(params);
}

prisma.$use(lowercaseUserName);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
