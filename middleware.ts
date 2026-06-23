import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const STAFF_ALLOWED = ['/my-tickets', '/profile', '/api/staff-portal', '/api/profile', '/api/categories', '/api/staff'];
const PUBLIC = ['/login', '/api/auth', '/api/settings'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const userType = token.userType as string;
  const isStaff = userType === 'staff';
  const isAdmin = userType === 'admin';

  // After login redirect
  if (pathname === '/login') {
    return NextResponse.redirect(new URL(isStaff ? '/my-tickets' : '/dashboard', req.url));
  }

  // Staff trying to access admin pages
  if (isStaff) {
    const allowed = STAFF_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL('/my-tickets', req.url));
    }
  }

  // Admin trying to access staff portal
  if (isAdmin && (pathname.startsWith('/my-tickets') || pathname === '/profile')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|uploads).*)'],
};
