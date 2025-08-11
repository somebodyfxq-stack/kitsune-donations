import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession } from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import Twitch from "next-auth/providers/twitch";
import { prisma } from "./db";
import { createRedirect } from "./redirect";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID ?? "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        login: { label: "Login", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const adminLogin = process.env.ADMIN_LOGIN ?? "";
        const adminPassword = process.env.ADMIN_PASSWORD ?? "";
        if (
          credentials?.login === adminLogin &&
          credentials?.password === adminPassword
        ) {
          return { id: "admin", role: "admin", name: "Admin" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "database" as const },
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      if (account?.provider === "twitch") user.role = "streamer";
      if (account?.provider === "credentials") user.role = "admin";
      return true;
    },
    async session({ session, user }: { session: any; user: any }) {
      if (session.user && user.role) session.user.role = user.role;
      return session;
    },
    redirect: createRedirect(getAuthSession),
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
