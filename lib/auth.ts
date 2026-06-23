import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';

interface AdminRow { id: number; name: string; email: string; password: string; role: string; is_active: boolean; }
interface StaffRow  { id: number; name: string; email: string; password: string; is_active: boolean; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Check admins first
        const admin = await queryOne<AdminRow>(
          'SELECT * FROM admins WHERE email = $1 AND is_active = TRUE',
          [credentials.email as string]
        );
        if (admin) {
          const valid = await bcrypt.compare(credentials.password as string, admin.password);
          if (!valid) return null;
          return { id: `admin_${admin.id}`, name: admin.name, email: admin.email, role: admin.role, userType: 'admin' };
        }

        // Then check staff
        const staff = await queryOne<StaffRow>(
          'SELECT * FROM staff WHERE email = $1 AND is_active = TRUE AND password IS NOT NULL',
          [credentials.email as string]
        );
        if (staff) {
          const valid = await bcrypt.compare(credentials.password as string, staff.password!);
          if (!valid) return null;
          return { id: `staff_${staff.id}`, name: staff.name, email: staff.email, role: 'staff', userType: 'staff' };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.userType = (user as { userType?: string }).userType;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { userType?: string }).userType = token.userType as string;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
});
