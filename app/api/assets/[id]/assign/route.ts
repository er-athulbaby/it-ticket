import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

// POST: assign asset to staff or association (auto-returns current holder)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { staff_id, association_id, assigned_date, notes } = body;

  if (!staff_id && !association_id) {
    return NextResponse.json({ error: 'staff_id or association_id required' }, { status: 400 });
  }

  const rawSid = (session?.user as { id?: string })?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  // Auto-return current active assignment if any
  await query(
    `UPDATE asset_assignments SET returned_date = CURRENT_DATE
     WHERE asset_id = $1 AND returned_date IS NULL`,
    [id]
  );

  const assignment = await queryOne(
    `INSERT INTO asset_assignments (asset_id, staff_id, association_id, assigned_by, assigned_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, staff_id || null, association_id || null, adminId, assigned_date || new Date().toISOString().slice(0, 10), notes || null]
  );

  return NextResponse.json(assignment, { status: 201 });
}

// DELETE: mark current assignment as returned
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const updated = await query(
    `UPDATE asset_assignments SET returned_date = CURRENT_DATE
     WHERE asset_id = $1 AND returned_date IS NULL
     RETURNING *`,
    [id]
  );

  if (!updated.length) return NextResponse.json({ error: 'No active assignment' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
