import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<{ name: string; department?: string; email?: string; password?: string }>(sheet);

  const results: { name: string; status: string }[] = [];

  for (const row of rows) {
    const { name, department, email, password } = row;
    if (!name?.trim()) {
      results.push({ name: '(missing)', status: 'skipped: no name' });
      continue;
    }

    const emailVal = email?.toString().trim() || null;
    const passwordVal = password?.toString().trim() || null;

    if (emailVal && !passwordVal) {
      results.push({ name: name.trim(), status: 'skipped: email provided but no password' });
      continue;
    }

    const hashed = emailVal && passwordVal ? await bcrypt.hash(passwordVal, 10) : null;

    await queryOne(
      `INSERT INTO staff (name, department, email, password)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, password = COALESCE(EXCLUDED.password, staff.password)`,
      [name.trim(), department?.toString().trim() || null, emailVal, hashed]
    );

    results.push({ name: name.trim(), status: emailVal ? 'imported with portal access' : 'imported' });
  }

  return NextResponse.json({ results, total: rows.length });
}
