import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

// POST: assign a license seat to a staff member or association
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { staff_id, association_id, notes } = await req.json();
  if (!staff_id && !association_id) return NextResponse.json({ error: 'staff_id or association_id required' }, { status: 400 });

  const adminId = adminIdFromSession(session);

  const existing = await queryOne(
    `SELECT id FROM license_assignments WHERE license_id=$1 AND staff_id IS NOT DISTINCT FROM $2 AND association_id IS NOT DISTINCT FROM $3 AND returned_date IS NULL`,
    [id, staff_id || null, association_id || null]
  );
  if (existing) return NextResponse.json({ error: 'Already assigned' }, { status: 400 });

  const assignment = await queryOne(
    `INSERT INTO license_assignments (license_id, staff_id, association_id, assigned_by, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, staff_id || null, association_id || null, adminId, notes?.trim() || null]
  );

  const license = await queryOne<{ name: string }>('SELECT name FROM licenses WHERE id=$1', [id]);
  const target = staff_id
    ? await queryOne<{ name: string }>('SELECT name FROM staff WHERE id=$1', [staff_id])
    : await queryOne<{ name: string }>('SELECT name FROM associations WHERE id=$1', [association_id]);

  logAudit({
    entityType: 'license_assignment', entityId: (assignment as { id: number } | null)?.id ?? null,
    entityLabel: `${license?.name || 'License'} -> ${target?.name || 'unknown'}`,
    action: 'create', adminId, adminName: adminNameFromSession(session),
  });

  return NextResponse.json(assignment, { status: 201 });
}

// DELETE: revoke a seat (body: { staff_id } or { association_id })
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { staff_id, association_id } = await req.json();
  if (!staff_id && !association_id) return NextResponse.json({ error: 'staff_id or association_id required' }, { status: 400 });

  const updated = await query(
    `UPDATE license_assignments SET returned_date = CURRENT_DATE
     WHERE license_id=$1 AND staff_id IS NOT DISTINCT FROM $2 AND association_id IS NOT DISTINCT FROM $3 AND returned_date IS NULL
     RETURNING *`,
    [id, staff_id || null, association_id || null]
  );
  if (!updated.length) return NextResponse.json({ error: 'No active assignment' }, { status: 404 });

  logAudit({
    entityType: 'license_assignment', entityId: updated[0].id as number, entityLabel: `License #${id} revoked`,
    action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
  });

  return NextResponse.json({ ok: true });
}
