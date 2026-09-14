import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, diffFields, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const ticket = await queryOne(`
    SELECT t.*, c.name AS category_name, a.name AS assigned_name,
           cr.name AS creator_name, s.name AS requester_name, s.department AS requester_department,
           assoc.name AS association_name
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    LEFT JOIN admins cr ON t.created_by = cr.id
    LEFT JOIN staff s ON t.requester_id = s.id
    LEFT JOIN associations assoc ON t.association_id = assoc.id
    WHERE t.id = $1
  `, [id]);

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const notes = await query(`
    SELECT n.*, a.name AS admin_name
    FROM ticket_notes n
    LEFT JOIN admins a ON n.admin_id = a.id
    WHERE n.ticket_id = $1
    ORDER BY n.created_at ASC
  `, [id]);

  const attachments = await query(`
    SELECT ta.*, a.name AS admin_name
    FROM ticket_attachments ta
    LEFT JOIN admins a ON ta.admin_id = a.id
    WHERE ta.ticket_id = $1
    ORDER BY ta.created_at DESC
  `, [id]);

  const history = await query(`
    SELECT h.*, a.name AS admin_name
    FROM ticket_history h
    LEFT JOIN admins a ON h.admin_id = a.id
    WHERE h.ticket_id = $1
    ORDER BY h.created_at DESC
  `, [id]);

  return NextResponse.json({ ticket, notes, attachments, history });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await queryOne<Record<string, unknown> & { status: string; priority: string; assigned_to: number | null; ticket_number: string }>(
    'SELECT * FROM tickets WHERE id = $1', [id]
  );
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build SET clause dynamically so null explicitly clears nullable fields
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  const patch: Record<string, unknown> = {};

  const set = (col: string, val: unknown) => { setClauses.push(`${col} = $${idx++}`); values.push(val ?? null); patch[col] = val ?? null; };

  if ('title' in body) set('title', body.title);
  if ('description' in body) set('description', body.description);
  if ('priority' in body) set('priority', body.priority);
  if ('category_id' in body) set('category_id', body.category_id ?? null);
  if ('assigned_to' in body) set('assigned_to', body.assigned_to ?? null);
  if ('due_date' in body) set('due_date', body.due_date ?? null);
  if ('requester_id' in body) set('requester_id', body.requester_id ?? null);
  if ('association_id' in body) set('association_id', body.association_id ?? null);
  if ('notification_frequency' in body) set('notification_frequency', body.notification_frequency);
  if ('status' in body) {
    set('status', body.status);
    if (body.status === 'resolved') setClauses.push(`resolved_at = CASE WHEN status != 'resolved' THEN NOW() ELSE resolved_at END`);
    if (body.status === 'closed') setClauses.push(`closed_at = CASE WHEN status != 'closed' THEN NOW() ELSE closed_at END`);
  }

  if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  values.push(id);
  const updated = await queryOne(
    `UPDATE tickets SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );

  const rawSid = session?.user?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  if ('status' in body && body.status !== existing.status) {
    await query(`
      INSERT INTO ticket_history (ticket_id, admin_id, action, old_value, new_value)
      VALUES ($1, $2, 'status_changed', $3, $4)
    `, [id, adminId, existing.status, body.status]);
  }

  if ('assigned_to' in body && body.assigned_to && body.assigned_to !== existing.assigned_to) {
    await query(`
      INSERT INTO ticket_history (ticket_id, admin_id, action, new_value)
      VALUES ($1, $2, 'assigned', $3)
    `, [id, adminId, String(body.assigned_to)]);
  }

  const changes = diffFields(existing, patch);
  if (Object.keys(changes).length) {
    logAudit({
      entityType: 'ticket', entityId: Number(id), entityLabel: existing.ticket_number,
      action: 'update', changes, adminId, adminName: adminNameFromSession(session),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const existing = await queryOne<{ ticket_number: string }>('SELECT ticket_number FROM tickets WHERE id = $1', [id]);
  await query('DELETE FROM tickets WHERE id = $1', [id]);

  logAudit({ entityType: 'ticket', entityId: Number(id), entityLabel: existing?.ticket_number || `Ticket #${id}`, action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });

  return NextResponse.json({ success: true });
}
