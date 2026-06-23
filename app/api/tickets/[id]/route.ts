import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const ticket = await queryOne(`
    SELECT t.*, c.name AS category_name, a.name AS assigned_name,
           cr.name AS creator_name, s.name AS requester_name, s.department AS requester_department
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    LEFT JOIN admins cr ON t.created_by = cr.id
    LEFT JOIN staff s ON t.requester_id = s.id
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

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, category_id, assigned_to, due_date } = body;

  const existing = await queryOne<{ status: string; priority: string; assigned_to: number | null }>(
    'SELECT status, priority, assigned_to FROM tickets WHERE id = $1', [id]
  );
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await queryOne(`
    UPDATE tickets SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      status = COALESCE($3, status),
      priority = COALESCE($4, priority),
      category_id = COALESCE($5, category_id),
      assigned_to = COALESCE($6, assigned_to),
      due_date = COALESCE($7, due_date),
      resolved_at = CASE WHEN $3 = 'resolved' AND status != 'resolved' THEN NOW() ELSE resolved_at END,
      closed_at = CASE WHEN $3 = 'closed' AND status != 'closed' THEN NOW() ELSE closed_at END
    WHERE id = $8
    RETURNING *
  `, [title, description, status, priority, category_id, assigned_to, due_date, id]);

  const rawSid = session?.user?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  if (status && status !== existing.status) {
    await query(`
      INSERT INTO ticket_history (ticket_id, admin_id, action, old_value, new_value)
      VALUES ($1, $2, 'status_changed', $3, $4)
    `, [id, adminId, existing.status, status]);
  }

  if (assigned_to && assigned_to !== existing.assigned_to) {
    await query(`
      INSERT INTO ticket_history (ticket_id, admin_id, action, new_value)
      VALUES ($1, $2, 'assigned', $3)
    `, [id, adminId, String(assigned_to)]);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await query('DELETE FROM tickets WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
