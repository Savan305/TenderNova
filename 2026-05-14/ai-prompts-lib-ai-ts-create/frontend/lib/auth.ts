import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const oauthProviders = [
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })
    : null,
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? GitHubProvider({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET })
    : null
].filter(Boolean) as NextAuthOptions['providers'];

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    ...oauthProviders,
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        mode: { label: 'Mode', type: 'text' }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password ?? '';
        if (!email || !password) throw new Error('Email and password are required');

        if (credentials?.mode === 'register') {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) throw new Error('An account with this email already exists');
          const user = await prisma.user.create({
            data: { email, name: credentials.name || email.split('@')[0], password: await bcrypt.hash(password, 10) }
          });
          return { id: user.id, email: user.email, name: user.name };
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) throw new Error('No account found for this email');
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) throw new Error('Incorrect password');
        return { id: user.id, email: user.email, name: user.name };
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name ?? undefined, image: user.image ?? undefined, verified: true },
          create: { email: user.email, name: user.name, image: user.image, verified: true }
        });
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const user = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, plan: true, name: true, image: true }
        });
        if (user) {
          token.sub = user.id;
          token.name = user.name ?? token.name;
          token.picture = user.image ?? token.picture;
          (token as any).role = user.role;
          (token as any).plan = user.plan;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role;
        (session.user as any).plan = (token as any).plan;
      }
      return session;
    }
  }
};
