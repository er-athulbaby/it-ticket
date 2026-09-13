import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

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

  const row = await queryOne(`
    INSERT INTO service_requests (
      request_number, staff_id, association_id, cpr_no, department, mobile_no, tel_no, fax_no,
      address, company, it_username, it_domain_id, it_security_group, it_membership,
      it_access_permissions, it_map_drives, it_duration, asset_details, status, comments,
      employee_name, employee_signed_date, completed_by_name, completed_by_date,
      device_return_name, device_return_date, received_by_name, received_by_date,
      device_condition, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30
    ) RETURNING *
  `, [
    requestNumber, body.staff_id || null, body.association_id || null,
    body.cpr_no || null, body.department || null, body.mobile_no || null,
    body.tel_no || null, body.fax_no || null, body.address || null, body.company || null,
    body.it_username || null, body.it_domain_id || null, body.it_security_group || null,
    body.it_membership || null, body.it_access_permissions || null, body.it_map_drives || null,
    body.it_duration || null, JSON.stringify(body.asset_details || []),
    body.status || 'pending', body.comments || null,
    body.employee_name || null, body.employee_signed_date || null,
    body.completed_by_name || null, body.completed_by_date || null,
    body.device_return_name || null, body.device_return_date || null,
    body.received_by_name || null, body.received_by_date || null,
    body.device_condition || null, adminId,
  ]);

  return NextResponse.json(row, { status: 201 });
}
