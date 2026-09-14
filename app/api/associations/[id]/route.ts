import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';
import { logAudit, diffFields } from '@/lib/audit';

function adminFromToken(token: { id?: string; name?: string | null } | null) {
  const rawId = (token?.id as string) || '';
  return { id: rawId ? parseInt(rawId.replace('admin_', '')) || null : null, name: token?.name || null };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const before = await queryOne<Record<string, unknown>>('SELECT * FROM associations WHERE id=$1', [id]);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };
  const patch: Record<string, unknown> = {};

  if ('name' in body) { const v = body.name?.trim() || null; s('name', v); patch.name = v; }
  if ('email' in body) { const v = body.email?.trim() || null; s('email', v); patch.email = v; }
  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  vals.push(id);

  const association = await queryOne<{ id: number; name: string }>(`UPDATE associations SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);

  const changes = diffFields(before, patch);
  if (Object.keys(changes).length) {
    const admin = adminFromToken(token);
    logAudit({ entityType: 'association', entityId: Number(id), entityLabel: association?.name || `Association #${id}`, action: 'update', changes, adminId: admin.id, adminName: admin.name });
  }

  return NextResponse.json(association);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await queryOne<{ name: string }>('SELECT name FROM associations WHERE id=$1', [id]);
  await query('DELETE FROM associations WHERE id = $1', [id]);

  const admin = adminFromToken(token);
  logAudit({ entityType: 'association', entityId: Number(id), entityLabel: existing?.name || `Association #${id}`, action: 'delete', adminId: admin.id, adminName: admin.name });

  return NextResponse.json({ success: true });
}
