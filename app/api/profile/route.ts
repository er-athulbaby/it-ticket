import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function getStaffId(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const id = token?.id as string | undefined;
  if (!id?.startsWith('staff_')) return null;
  return parseInt(id.replace('staff_', ''));
}

export async function GET(req: NextRequest) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staff = await queryOne(
    'SELECT id, name, email, department, photo_filename FROM staff WHERE id = $1',
    [staffId]
  );

  return NextResponse.json(staff);
}

export async function PATCH(req: NextRequest) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await queryOne('UPDATE staff SET password = $1 WHERE id = $2', [hashed, staffId]);

  return NextResponse.json({ success: true });
}
