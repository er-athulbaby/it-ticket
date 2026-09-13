import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

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

  const { name, vendor, product, license_key, seats, purchase_date, expiry_date, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const row = await queryOne(
    `INSERT INTO licenses (name, vendor, product, license_key, seats, purchase_date, expiry_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name.trim(), vendor?.trim() || null, product?.trim() || null, license_key?.trim() || null,
     seats || 1, purchase_date || null, expiry_date || null, notes?.trim() || null]
  );
  return NextResponse.json(row, { status: 201 });
}
