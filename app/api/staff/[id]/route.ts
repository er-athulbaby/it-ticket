import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const staff = await queryOne(`
    SELECT s.*, a.name AS association_name
    FROM staff s
    LEFT JOIN associations a ON s.association_id = a.id
    WHERE s.id = $1
  `, [id]);

  if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const assets = await query(`
    SELECT aa.id AS assignment_id, aa.assigned_date, aa.returned_date, aa.notes,
           ast.id AS asset_id, ast.asset_tag, ast.make, ast.model, ast.serial_no, ast.condition,
           ac.name AS category_name, ac.color AS category_color
    FROM asset_assignments aa
    JOIN assets ast ON aa.asset_id = ast.id
    LEFT JOIN asset_categories ac ON ast.category_id = ac.id
    WHERE aa.staff_id = $1
    ORDER BY aa.returned_date IS NULL DESC, aa.assigned_date DESC
  `, [id]);

  const licenses = await query(`
    SELECT la.id AS assignment_id, la.assigned_date, la.returned_date,
           l.id AS license_id, l.name, l.vendor, l.expiry_date
    FROM license_assignments la
    JOIN licenses l ON la.license_id = l.id
    WHERE la.staff_id = $1
    ORDER BY la.returned_date IS NULL DESC, l.name ASC
  `, [id]);

  const tickets = await query(`
    SELECT id, ticket_number, title, status, priority, created_at
    FROM tickets
    WHERE requester_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [id]);

  const serviceRequests = await query(`
    SELECT id, request_number, status, created_at
    FROM service_requests
    WHERE staff_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [id]);

  return NextResponse.json({ ...staff, assets, licenses, tickets, serviceRequests });
}
