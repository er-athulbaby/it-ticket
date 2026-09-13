import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

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

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };

  const fields = [
    'staff_id','association_id','cpr_no','department','mobile_no','tel_no','fax_no',
    'address','company','it_username','it_domain_id','it_security_group','it_membership',
    'it_access_permissions','it_map_drives','it_duration','status','comments',
    'employee_name','employee_signed_date','completed_by_name','completed_by_date',
    'device_return_name','device_return_date','received_by_name','received_by_date','device_condition',
  ];
  fields.forEach((f) => { if (f in body) s(f, body[f] || null); });
  if ('asset_details' in body) s('asset_details', JSON.stringify(body.asset_details || []));
  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  set.push(`updated_at=NOW()`); vals.push(id);
  const row = await queryOne(`UPDATE service_requests SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);
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
