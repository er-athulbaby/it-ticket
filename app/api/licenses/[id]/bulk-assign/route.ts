import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

// POST: assign a license to multiple staff/association ids at once
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { staff_ids, association_ids } = await req.json();
  const staffIds: number[] = Array.isArray(staff_ids) ? staff_ids : [];
  const assocIds: number[] = Array.isArray(association_ids) ? association_ids : [];

  if (!staffIds.length && !assocIds.length) {
    return NextResponse.json({ error: 'No staff or associations selected' }, { status: 400 });
  }

  const adminId = adminIdFromSession(session);
  const license = await queryOne<{ id: number; name: string }>('SELECT id, name FROM licenses WHERE id=$1', [id]);
  if (!license) return NextResponse.json({ error: 'License not found' }, { status: 404 });

  let assigned = 0, skipped = 0;

  for (const staffId of staffIds) {
    const existing = await queryOne(
      `SELECT id FROM license_assignments WHERE license_id=$1 AND staff_id=$2 AND returned_date IS NULL`,
      [id, staffId]
    );
    if (existing) { skipped++; continue; }
    await query(
      `INSERT INTO license_assignments (license_id, staff_id, assigned_by) VALUES ($1,$2,$3)`,
      [id, staffId, adminId]
    );
    assigned++;
  }

  for (const assocId of assocIds) {
    const existing = await queryOne(
      `SELECT id FROM license_assignments WHERE license_id=$1 AND association_id=$2 AND returned_date IS NULL`,
      [id, assocId]
    );
    if (existing) { skipped++; continue; }
    await query(
      `INSERT INTO license_assignments (license_id, association_id, assigned_by) VALUES ($1,$2,$3)`,
      [id, assocId, adminId]
    );
    assigned++;
  }

  logAudit({
    entityType: 'license_assignment', entityId: license.id, entityLabel: `Bulk assign "${license.name}" to ${assigned} recipient(s)`,
    action: 'create', adminId, adminName: adminNameFromSession(session),
  });

  return NextResponse.json({ assigned, skipped });
}
