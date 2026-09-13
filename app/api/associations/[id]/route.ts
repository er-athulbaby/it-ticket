import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };

  if ('name' in body) s('name', body.name?.trim() || null);
  if ('email' in body) s('email', body.email?.trim() || null);
  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  vals.push(id);

  const association = await queryOne(`UPDATE associations SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);
  return NextResponse.json(association);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await query('DELETE FROM associations WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
