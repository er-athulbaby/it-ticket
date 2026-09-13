import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };
  if ('name' in body) s('name', body.name?.trim());
  if ('vendor' in body) s('vendor', body.vendor?.trim() || null);
  if ('product' in body) s('product', body.product?.trim() || null);
  if ('license_key' in body) s('license_key', body.license_key?.trim() || null);
  if ('seats' in body) s('seats', body.seats);
  if ('purchase_date' in body) s('purchase_date', body.purchase_date || null);
  if ('expiry_date' in body) s('expiry_date', body.expiry_date || null);
  if ('notes' in body) s('notes', body.notes?.trim() || null);
  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  set.push(`updated_at=NOW()`); vals.push(id);
  const row = await queryOne(`UPDATE licenses SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  await query('DELETE FROM licenses WHERE id=$1', [id]);
  return NextResponse.json({ ok: true });
}
