import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (status) { conditions.push(`t.status = $${p++}`); params.push(status); }
  if (priority) { conditions.push(`t.priority = $${p++}`); params.push(priority); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const settingsRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key = 'company_name'`
  );
  const companyName = settingsRows[0]?.value || 'HelpDesk';

  const tickets = await query(`
    SELECT
      t.ticket_number AS "Ticket #",
      t.title AS "Title",
      t.description AS "Description",
      t.status AS "Status",
      t.priority AS "Priority",
      c.name AS "Category",
      s.name AS "Requested By",
      s.department AS "Department",
      a.name AS "Assigned To",
      cr.name AS "Created By",
      t.due_date AS "Due Date",
      t.created_at AS "Created At",
      t.updated_at AS "Updated At",
      t.resolved_at AS "Resolved At",
      t.closed_at AS "Closed At"
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN staff s ON t.requester_id = s.id
    LEFT JOIN admins a ON t.assigned_to = a.id
    LEFT JOIN admins cr ON t.created_by = cr.id
    ${where}
    ORDER BY t.created_at DESC
  `, params);

  const wb = XLSX.utils.book_new();

  // Header sheet with company name and export date
  const headerData = [
    [companyName],
    [`Ticket Report — Exported on ${new Date().toLocaleDateString('en-IN')}`],
    [],
  ];
  const headerWs = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(headerWs, tickets, { origin: 'A4' });
  XLSX.utils.book_append_sheet(wb, headerWs, 'Tickets');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="tickets-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
