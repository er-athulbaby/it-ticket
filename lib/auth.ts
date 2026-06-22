import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';

interface AdminRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await queryOne<AdminRow>(
          'SELECT * FROM admins WHERE email = $1 AND is_active = TRUE',
          [credentials.email as string]
        );
        if (!admin) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          admin.password
        );
        if (!valid) return null;

        return {
          id: String(admin.id),
          name: admin.name,
          email: admin.email,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
});
