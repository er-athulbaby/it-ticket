import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendServiceRequestReturnedEmail } from '@/lib/email';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const row = await queryOne(`
    SELECT sr.*, s.name AS staff_name, s.department AS staff_department,
           assoc.name AS association_name, a.name AS created_by_name
    FROM service_requests sr
    LEFT JOIN staff s ON sr.staff_id = s.id
    LEFT JOIN associations assoc ON sr.association_id = assoc.id
    LEFT JOIN admins a ON sr.created_by = a.id
    WHERE sr.id = $1
  `, [id]);

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const existing = await queryOne<{ device_return_date: string | null; return_email_sent: boolean }>(
    `SELECT device_return_date, return_email_sent FROM service_requests WHERE id=$1`, [id]
  );

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };

  const fields = [
    'staff_id','association_id','cpr_no','department','mobile_no',
    'duration_type','return_by_date','status','comments',
    'employee_name','employee_signed_date','completed_by_name','completed_by_date',
    'device_return_name','device_return_date','received_by_name','received_by_date','device_condition',
  ];
  fields.forEach((f) => { if (f in body) s(f, body[f] || null); });
  if ('asset_details' in body) s('asset_details', JSON.stringify(body.asset_details || []));
  if ('accessories' in body) s('accessories', JSON.stringify(body.accessories || []));

  const justReturned = existing && !existing.device_return_date && body.device_return_date && !existing.return_email_sent;
  if (justReturned) s('return_email_sent', true);

  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  set.push(`updated_at=NOW()`); vals.push(id);
  const row = await queryOne<{
    request_number: string; employee_name: string | null;
    device_return_date: string | null; received_by_name: string | null;
  }>(`UPDATE service_requests SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);

  if (justReturned && row) {
    const recipient = await queryOne<{ email: string | null }>(`
      SELECT COALESCE(s.email, assoc.email) AS email
      FROM service_requests sr
      LEFT JOIN staff s ON sr.staff_id = s.id
      LEFT JOIN associations assoc ON sr.association_id = assoc.id
      WHERE sr.id = $1
    `, [id]);
    if (recipient?.email) {
      await sendServiceRequestReturnedEmail(recipient.email, {
        request_number: row.request_number,
        employee_name: row.employee_name,
        device_return_date: row.device_return_date,
        received_by_name: row.received_by_name,
      }).catch(() => {});
    }
  }

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  await query('DELETE FROM service_requests WHERE id=$1', [id]);
  return NextResponse.json({ ok: true });
}
