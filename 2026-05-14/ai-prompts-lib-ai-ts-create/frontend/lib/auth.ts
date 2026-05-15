import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
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
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    }
  }
};
