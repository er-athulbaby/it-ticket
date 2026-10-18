import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

function requireSuperadmin(session: { user?: unknown } | null) {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string } | undefined)?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Any logged-in admin (agent included) needs this list to populate the
  // "Assign To" dropdown on tickets — only managing users (POST/PATCH/DELETE
  // below) is restricted to Super Admin.
  const users = await query(`
    SELECT id, name, email, role, is_active, created_at FROM admins ORDER BY created_at DESC
  `);

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireSuperadmin(session);
  if (denied) return denied;

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 });
  }

  const existing = await queryOne('SELECT id FROM admins WHERE email = $1', [email]);
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await queryOne(`
    INSERT INTO admins (name, email, password, role)
    VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active, created_at
  `, [name, email, hashed, role || 'agent']);

  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const denied = requireSuperadmin(session);
  if (denied) return denied;

  const { id, name, role, is_active, password } = await req.json();
  let passwordUpdate = '';
  const params: unknown[] = [name, role, is_active, id];

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    passwordUpdate = ', password = $5';
    params.push(hashed);
  }

  const user = await queryOne(`
    UPDATE admins SET name=$1, role=$2, is_active=$3 ${passwordUpdate} WHERE id=$4
    RETURNING id, name, email, role, is_active, created_at
  `, params);

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const denied = requireSuperadmin(session);
  if (denied) return denied;

  const { id } = await req.json();
  const rawId = session?.user?.id ?? '';
  const currentId = rawId.startsWith('admin_') ? parseInt(rawId.replace('admin_', '')) : parseInt(rawId);
  if (currentId && id === currentId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  await query('DELETE FROM admins WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
