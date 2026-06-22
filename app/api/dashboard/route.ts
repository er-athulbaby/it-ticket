import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [counts] = await query<{
    total: string; open: string; in_progress: string; resolved: string; closed: string;
  }>(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'open') AS open,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
      COUNT(*) FILTER (WHERE status = 'closed') AS closed
    FROM tickets
  `);

  const byPriority = await query<{ priority: string; count: string }>(`
    SELECT priority, COUNT(*) AS count FROM tickets
    WHERE status NOT IN ('closed', 'resolved')
    GROUP BY priority ORDER BY count DESC
  `);

  const recent = await query(`
    SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at,
           c.name AS category_name, a.name AS assigned_name
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    ORDER BY t.created_at DESC LIMIT 5
  `);

  return NextResponse.json({ counts, byPriority, recent });
}
