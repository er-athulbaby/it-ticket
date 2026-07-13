import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const statuses = await query(
      'SELECT * FROM ticket_statuses ORDER BY display_order ASC, id ASC'
    );
    return NextResponse.json(statuses);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { label, slug, color_class, display_order } = await req.json();
  if (!label?.trim() || !slug?.trim()) return NextResponse.json({ error: 'label and slug required' }, { status: 400 });

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const status = await queryOne(
    'INSERT INTO ticket_statuses (label, slug, color_class, display_order) VALUES ($1,$2,$3,$4) RETURNING *',
    [label.trim(), cleanSlug, color_class || 'bg-slate-100 text-slate-600', display_order ?? 99]
  );
  return NextResponse.json(status, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, label, color_class, display_order } = await req.json();
  const status = await queryOne(
    'UPDATE ticket_statuses SET label=$1, color_class=$2, display_order=$3 WHERE id=$4 RETURNING *',
    [label, color_class, display_order, id]
  );
  return NextResponse.json(status);
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const existing = await queryOne<{ is_system: boolean }>('SELECT is_system FROM ticket_statuses WHERE id=$1', [id]);
  if (existing?.is_system) return NextResponse.json({ error: 'Cannot delete system statuses' }, { status: 400 });

  await query('DELETE FROM ticket_statuses WHERE id=$1', [id]);
  return NextResponse.json({ success: true });
}
