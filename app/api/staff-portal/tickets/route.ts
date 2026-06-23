import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';
import { sendNewTicketEmail } from '@/lib/email';

async function getStaffId(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const id = token?.id as string | undefined;
  if (!id?.startsWith('staff_')) return null;
  return parseInt(id.replace('staff_', ''));
}

export async function GET(req: NextRequest) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions = ['t.requester_id = $1'];
  const params: unknown[] = [staffId];
  let p = 2;

  if (status) { conditions.push(`t.status = $${p++}`); params.push(status); }

  const tickets = await query(`
    SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at,
           c.name AS category_name, a.name AS assigned_name
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.created_at DESC
    LIMIT $${p++} OFFSET $${p++}
  `, [...params, limit, offset]);

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) FROM tickets t WHERE ${conditions.join(' AND ')}`, params
  );

  return NextResponse.json({ tickets, total: parseInt(count) });
}

export async function POST(req: NextRequest) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, priority, category_id } = body;
  if (!title || !priority) return NextResponse.json({ error: 'title and priority are required' }, { status: 400 });

  const settingsRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('ticket_prefix', 'ticket_counter')`
  );
  const settings: Record<string, string> = {};
  settingsRows.forEach((r) => { settings[r.key] = r.value; });
  const prefix = settings['ticket_prefix'] || 'IT';
  const nextCounter = (parseInt(settings['ticket_counter'] || '0') + 1);
  await query(`UPDATE app_settings SET value = $1 WHERE key = 'ticket_counter'`, [String(nextCounter)]);
  const ticketNumber = `${prefix}-${String(nextCounter).padStart(5, '0')}`;

  const ticket = await queryOne<{ id: number }>(`
    INSERT INTO tickets (ticket_number, title, description, priority, category_id, requester_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, NULL)
    RETURNING *
  `, [ticketNumber, title, description || '', priority, category_id || null, staffId]);

  const staff = await queryOne<{ name: string }>('SELECT name FROM staff WHERE id = $1', [staffId]);
  const category = category_id
    ? await queryOne<{ name: string }>('SELECT name FROM categories WHERE id = $1', [category_id])
    : null;

  sendNewTicketEmail({
    ticket_number: ticketNumber, title, priority,
    requester_name: staff?.name ?? null,
    category_name: category?.name ?? null,
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
