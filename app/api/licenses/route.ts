import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await query(`SELECT * FROM licenses ORDER BY expiry_date ASC NULLS LAST, name ASC`);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, vendor, software_type, license_key, seats, purchase_date, expiry_date, remind_90, remind_60, remind_30, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const row = await queryOne<{ id: number; name: string }>(
    `INSERT INTO licenses (name, vendor, software_type, license_key, seats, purchase_date, expiry_date, remind_90, remind_60, remind_30, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [name.trim(), vendor?.trim() || null, software_type?.trim() || null, license_key?.trim() || null,
     seats || 1, purchase_date || null, expiry_date || null,
     !!remind_90, !!remind_60, !!remind_30, notes?.trim() || null]
  );

  if (row) {
    logAudit({
      entityType: 'license', entityId: row.id, entityLabel: row.name,
      action: 'create', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
    });
  }

  return NextResponse.json(row, { status: 201 });
}
