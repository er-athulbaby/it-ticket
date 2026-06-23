import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { sendNewTicketEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (status) { conditions.push(`t.status = $${p++}`); params.push(status); }
  if (priority) { conditions.push(`t.priority = $${p++}`); params.push(priority); }
  if (category) { conditions.push(`t.category_id = $${p++}`); params.push(parseInt(category)); }
  if (search) {
    conditions.push(`(t.title ILIKE $${p} OR t.ticket_number ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const tickets = await query(`
    SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at, t.updated_at, t.due_date,
           c.name AS category_name, a.name AS assigned_name,
           s.name AS requester_name, s.department AS requester_department
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    LEFT JOIN staff s ON t.requester_id = s.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT $${p++} OFFSET $${p++}
  `, [...params, limit, offset]);

  const [{ count }] = await query<{ count: string }>(`
    SELECT COUNT(*) FROM tickets t ${where}
  `, params);

  return NextResponse.json({ tickets, total: parseInt(count), page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, priority, category_id, assigned_to, due_date, requester_id } = body;

  if (!title || !priority) {
    return NextResponse.json({ error: 'title and priority are required' }, { status: 400 });
  }

  const rawSid = session?.user?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  // Generate ticket number from settings
  const settingsRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('ticket_prefix', 'ticket_counter')`
  );
  const settings: Record<string, string> = {};
  settingsRows.forEach((r) => { settings[r.key] = r.value; });
  const prefix = settings['ticket_prefix'] || 'IT';
  const nextCounter = (parseInt(settings['ticket_counter'] || '0') + 1);
  await query(
    `UPDATE app_settings SET value = $1 WHERE key = 'ticket_counter'`,
    [String(nextCounter)]
  );
  const ticketNumber = `${prefix}-${String(nextCounter).padStart(5, '0')}`;

  const ticket = await queryOne(`
    INSERT INTO tickets (ticket_number, title, description, priority, category_id, assigned_to, created_by, due_date, requester_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    ticketNumber, title, description, priority,
    category_id || null, assigned_to || null,
    adminId, due_date || null,
    requester_id || null,
  ]);

  await query(`
    INSERT INTO ticket_history (ticket_id, admin_id, action, new_value)
    VALUES ($1, $2, 'created', $3)
  `, [ticket!.id as number, adminId, 'Ticket created']);

  // Send email notification (non-blocking)
  const requester = requester_id
    ? await queryOne<{ name: string }>('SELECT name FROM staff WHERE id = $1', [requester_id])
    : null;
  const cat = category_id
    ? await queryOne<{ name: string }>('SELECT name FROM categories WHERE id = $1', [category_id])
    : null;
  sendNewTicketEmail({
    ticket_number: ticketNumber, title, priority,
    requester_name: requester?.name ?? null,
    category_name: cat?.name ?? null,
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
