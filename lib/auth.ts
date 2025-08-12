import { getServerSession } from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import Twitch from "next-auth/providers/twitch";
import type { Account, NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
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
  trustHost: true,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }: { user: User; account: Account | null }) {
      if (account?.provider === "twitch") user.role = "streamer";
      if (account?.provider === "credentials") user.role = "admin";
      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user?.id) token.id = user.id;
      if (user?.role) token.role = user.role;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.role) session.user.role = token.role as string;
      }
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
