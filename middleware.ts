import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const STAFF_ALLOWED = ['/my-tickets', '/profile', '/api/staff-portal', '/api/profile', '/api/categories', '/api/staff'];
const VIEWER_ALLOWED = ['/dashboard', '/tickets', '/api/dashboard', '/api/tickets', '/api/ticket-statuses', '/api/categories', '/api/users/photo', '/api/associations', '/api/assets', '/api/consumables', '/api/licenses', '/api/service-requests', '/api/asset-categories'];
const SUPERADMIN_ONLY = ['/users', '/audit-log', '/settings', '/api/users', '/api/audit-log', '/api/settings'];
const PUBLIC = ['/login', '/api/auth', '/public', '/api/public', '/api/reminders/send', '/api/licenses/check-expiry'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /api/settings GET is public (logo/company name on the public ticket form);
  // PATCH (and any other write) still requires auth + role checks below.
  if (pathname === '/api/settings' && req.method === 'GET') return NextResponse.next();
  // The logo image itself is public too (shown on the login page and public form); uploading a new one is not.
  if (pathname === '/api/settings/logo' && req.method === 'GET') return NextResponse.next();

  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const userType = token.userType as string;
  const role = token.role as string;
  const isStaff = userType === 'staff';
  const isAdmin = userType === 'admin';
  const isViewer = isAdmin && role === 'viewer';

  // After login redirect
  if (pathname === '/login') {
    return NextResponse.redirect(new URL(isStaff ? '/my-tickets' : '/dashboard', req.url));
  }

  // Viewer trying to access non-viewer pages
  if (isViewer) {
    const allowed = VIEWER_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
    if (!allowed) return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Only Super Admin may reach Users, Audit Log, and Settings
  // (/api/users/photo stays available to everyone — it just serves a profile picture;
  // GET /api/users stays available to every admin — tickets need it to list possible assignees;
  // only managing users — POST/PATCH/DELETE — and the Users admin page itself are restricted)
  const usersListRead = pathname === '/api/users' && req.method === 'GET';
  if (isAdmin && role !== 'superadmin' && pathname !== '/api/users/photo' && !usersListRead) {
    const restricted = SUPERADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (restricted) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/dashboard', req.url));
    }
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
