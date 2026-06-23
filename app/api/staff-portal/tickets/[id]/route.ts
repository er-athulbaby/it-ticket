import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';

async function getStaffId(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const id = token?.id as string | undefined;
  if (!id?.startsWith('staff_')) return null;
  return parseInt(id.replace('staff_', ''));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const ticket = await queryOne(`
    SELECT t.*, c.name AS category_name, a.name AS assigned_name
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    WHERE t.id = $1 AND t.requester_id = $2
  `, [id, staffId]);

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const notes = await query(`
    SELECT n.*,
      CASE WHEN n.admin_id IS NOT NULL THEN ad.name ELSE sf.name END AS author_name,
      CASE WHEN n.admin_id IS NOT NULL THEN 'admin' ELSE 'staff' END AS author_type
    FROM ticket_notes n
    LEFT JOIN admins ad ON n.admin_id = ad.id
    LEFT JOIN staff sf ON n.staff_id = sf.id
    WHERE n.ticket_id = $1
    ORDER BY n.created_at ASC
  `, [id]);

  return NextResponse.json({ ticket, notes });
}
