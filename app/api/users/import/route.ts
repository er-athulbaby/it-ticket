import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<{ name: string; email: string; password?: string; role?: string }>(sheet);

  const results: { email: string; status: string }[] = [];

  for (const row of rows) {
    const { name, email, password, role } = row;
    if (!name || !email) {
      results.push({ email: email || '(missing)', status: 'skipped: missing name or email' });
      continue;
    }

    const existing = await queryOne('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing) {
      results.push({ email, status: 'skipped: email already exists' });
      continue;
    }

    const rawPassword = password || 'HelpDesk@123';
    const hashed = await bcrypt.hash(rawPassword, 10);

    await queryOne(
      'INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashed, role || 'agent']
    );

    results.push({ email, status: 'imported' });
  }

  return NextResponse.json({ results, total: rows.length });
}
