import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

// POST: assign a license seat to a staff member
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { staff_id, notes } = await req.json();
  if (!staff_id) return NextResponse.json({ error: 'staff_id required' }, { status: 400 });

  const rawSid = (session?.user as { id?: string })?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  const existing = await queryOne(
    `SELECT id FROM license_assignments WHERE license_id=$1 AND staff_id=$2 AND returned_date IS NULL`,
    [id, staff_id]
  );
  if (existing) return NextResponse.json({ error: 'Already assigned to this staff member' }, { status: 400 });

  const assignment = await queryOne(
    `INSERT INTO license_assignments (license_id, staff_id, assigned_by, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, staff_id, adminId, notes?.trim() || null]
  );
  return NextResponse.json(assignment, { status: 201 });
}

// DELETE: revoke a staff member's seat (body: { staff_id })
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { staff_id } = await req.json();
  if (!staff_id) return NextResponse.json({ error: 'staff_id required' }, { status: 400 });

  const updated = await query(
    `UPDATE license_assignments SET returned_date = CURRENT_DATE
     WHERE license_id=$1 AND staff_id=$2 AND returned_date IS NULL
     RETURNING *`,
    [id, staff_id]
  );
  if (!updated.length) return NextResponse.json({ error: 'No active assignment' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
