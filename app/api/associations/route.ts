import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const associations = await query('SELECT * FROM associations ORDER BY name ASC');
  return NextResponse.json(associations);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const association = await queryOne(
    'INSERT INTO associations (name, email) VALUES ($1, $2) RETURNING *',
    [name.trim(), email?.trim() || null]
  );
  return NextResponse.json(association, { status: 201 });
}
