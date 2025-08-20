import { getServerSession } from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import Twitch from "next-auth/providers/twitch";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
// Types are inferred from NextAuth

import { prisma } from "@/lib/db";

/**
 * The authentication configuration for the app.  This configuration defines
 * two providers (Twitch and custom credentials) and uses a JWT based
 * session.  The callbacks have been extended to validate that the user
 * referenced by an incoming JWT actually exists in the database.  If the
 * user is missing (for example, because they were deleted by an admin) the
 * token is scrubbed of its identifying fields so that subsequent requests
 * will be treated as unauthenticated.
 */
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Twitch logins are used by streamers.  The client ID and secret are
    // pulled from environment variables so that the app can be deployed
    // without checking secrets into version control.
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID ?? "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
    }),
    // A simple credentials provider is used for the admin account.  The
    // credentials (login and password) are compared against environment
    // variables at runtime.  On success the user record includes a fixed
    // identifier ("admin") and role ("admin").
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
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }: any) {
      console.log("🔐 SignIn callback:", {
        provider: account?.provider,
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email
      });
      
      // Assign roles based on the provider.  If a user signs in with Twitch
      // they are a streamer; if they use the credentials provider they are
      // considered an admin.  These roles are persisted on the JWT by the
      // `jwt` callback below.
      if (account?.provider === "twitch") user.role = "streamer";
      if (account?.provider === "credentials") user.role = "admin";
      
      console.log("✅ SignIn success, assigned role:", user.role);
      return true;
    },
    async jwt({ token, user, trigger }: any) {
      console.log("🎟️ JWT callback:", {
        trigger,
        userId: user?.id,
        userRole: user?.role,
        tokenSub: token.sub,
        tokenRole: token.role
      });
      
      // If the user just signed in, propagate their role onto the token.
      if (user?.role) token.role = user.role;
      
      // For new sign-ins, allow the token to proceed without validation
      // to prevent race conditions with PrismaAdapter user creation
      if (trigger === "signIn" && user) {
        console.log("🆕 New sign-in detected, skipping validation");
        token.sub = user.id;
        token.role = user.role;
        return token;
      }
      
      // Determine which identifier we should look up: either the new user
      // object's id or the existing token's subject.  The `sub` property
      // identifies the user record associated with the token.
      const userId = (user as any)?.id ?? (token.sub as string | undefined);
      if (!userId) return token;
      
      try {
        // Look up the current user in the database.  If the record is
        // missing the token is scrubbed of identifying fields.  This
        // prevents a deleted user from continuing to access protected
        // resources with a stale token.  Note: we only select the fields we
        // need to minimise overhead.
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        });
        if (!dbUser) {
          // For subsequent token validations (not initial sign-in), 
          // remove subject and role so that downstream middleware treats the
          // request as unauthenticated. This prevents deleted users from
          // continuing to access protected resources with stale tokens.
          delete token.sub;
          delete token.role;
          return token;
        }
        // Normal case: ensure the token contains the up-to-date id and role.
        token.sub = dbUser.id;
        token.role = dbUser.role;
        return token;
      } catch (err) {
        // If the database lookup fails for any reason we assume the token
        // should not grant access.  Remove identifying fields so that
        // middleware will redirect to the login page.
        delete token.sub;
        delete token.role;
        return token;
      }
    },
    async session({ session, token }: any) {
      console.log("👤 Session callback:", {
        tokenSub: token.sub,
        tokenRole: token.role,
        sessionUser: session.user?.email || session.user?.name
      });
      
      // If the token does not contain a subject or role we treat the
      // request as unauthenticated by returning null.  This triggers
      // next-auth to redirect the user to the login page where
      // appropriate.
      if (!token.sub || !token.role) {
        console.log("❌ Session rejected: missing token.sub or token.role");
        return null;
      }
      // Ensure the user exists in the database before returning a session.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub as string },
        select: { id: true },
      });
      
      if (!dbUser) {
        console.log("❌ Session rejected: user not found in database");
        return null;
      }
      
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      
      console.log("✅ Session created successfully");
      return session;
    },
    async redirect() {
      // Always send logged-in users to the panel by default.  Specific
      // routes may override this by using the `callbackUrl` option when
      // calling `signIn`.
      return "/panel";
    },
  },
};

export async function getAuthSession() {
  // Expose a helper for server components to retrieve the current session.
  return getServerSession(authOptions) as Promise<any | null>;
}