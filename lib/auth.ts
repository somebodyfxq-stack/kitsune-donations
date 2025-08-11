import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import Twitch from 'next-auth/providers/twitch';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID ?? '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'twitch') user.role = 'streamer';
      return true;
    },
    async session({ session, user }) {
      if (session.user) session.user.role = (user as any).role;
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
