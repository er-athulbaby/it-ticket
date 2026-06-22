import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

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
           c.name AS category_name, a.name AS assigned_name
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
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
  const { title, description, priority, category_id, assigned_to, due_date } = body;

  if (!title || !description || !priority) {
    return NextResponse.json({ error: 'title, description and priority are required' }, { status: 400 });
  }

  const adminId = session?.user?.id ? parseInt(session.user.id) : null;

  const ticket = await queryOne(`
    INSERT INTO tickets (title, description, priority, category_id, assigned_to, created_by, due_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    title, description, priority,
    category_id || null, assigned_to || null,
    adminId,
    due_date || null,
  ]);

  await query(`
    INSERT INTO ticket_history (ticket_id, admin_id, action, new_value)
    VALUES ($1, $2, 'created', $3)
  `, [ticket!.id as number, adminId, 'Ticket created']);

  return NextResponse.json(ticket, { status: 201 });
}
