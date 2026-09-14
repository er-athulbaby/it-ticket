import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendServiceRequestCreatedEmail } from '@/lib/email';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await query(`
    SELECT sr.*, s.name AS staff_name, assoc.name AS association_name, a.name AS created_by_name
    FROM service_requests sr
    LEFT JOIN staff s ON sr.staff_id = s.id
    LEFT JOIN associations assoc ON sr.association_id = assoc.id
    LEFT JOIN admins a ON sr.created_by = a.id
    ORDER BY sr.created_at DESC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const rawSid = (session?.user as { id?: string })?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  // Generate request number (SR-00001)
  const [{ value: counterVal }] = await query<{ value: string }>(
    `SELECT value FROM app_settings WHERE key='sr_counter'`
  );
  const next = parseInt(counterVal || '0') + 1;
  await query(`UPDATE app_settings SET value=$1 WHERE key='sr_counter'`, [String(next)]);
  const requestNumber = `SR-${String(next).padStart(5, '0')}`;

  const row = await queryOne<{ id: number; request_number: string; employee_name: string | null; duration_type: string; return_by_date: string | null }>(`
    INSERT INTO service_requests (
      request_number, staff_id, association_id, cpr_no, department, mobile_no,
      asset_details, accessories, duration_type, return_by_date, status, comments,
      employee_name, employee_signed_date, completed_by_name, completed_by_date,
      device_return_name, device_return_date, received_by_name, received_by_date,
      device_condition, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
    ) RETURNING *
  `, [
    requestNumber, body.staff_id || null, body.association_id || null,
    body.cpr_no || null, body.department || null, body.mobile_no || null,
    JSON.stringify(body.asset_details || []), JSON.stringify(body.accessories || []),
    body.duration_type || 'permanent', body.return_by_date || null,
    body.status || 'pending', body.comments || null,
    body.employee_name || null, body.employee_signed_date || null,
    body.completed_by_name || null, body.completed_by_date || null,
    body.device_return_name || null, body.device_return_date || null,
    body.received_by_name || null, body.received_by_date || null,
    body.device_condition || null, adminId,
  ]);

  if (row) {
    logAudit({
      entityType: 'service_request', entityId: row.id, entityLabel: row.request_number,
      action: 'create', adminId, adminName: (session.user as { name?: string })?.name || null,
    });
    const recipient = await queryOne<{ email: string | null }>(`
      SELECT COALESCE(s.email, assoc.email) AS email
      FROM service_requests sr
      LEFT JOIN staff s ON sr.staff_id = s.id
      LEFT JOIN associations assoc ON sr.association_id = assoc.id
      WHERE sr.id = $1
    `, [row.id]);
    if (recipient?.email) {
      await query(`UPDATE service_requests SET request_email_sent = TRUE WHERE id = $1`, [row.id]);
      await sendServiceRequestCreatedEmail(recipient.email, {
        request_number: row.request_number,
        employee_name: row.employee_name,
        duration_type: row.duration_type,
        return_by_date: row.return_by_date,
      }).catch(() => {});
    }
  }

  return NextResponse.json(row, { status: 201 });
}
