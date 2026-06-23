import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
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
  const rows = XLSX.utils.sheet_to_json<{ name: string; department?: string }>(sheet);

  const results: { name: string; status: string }[] = [];

  for (const row of rows) {
    const { name, department } = row;
    if (!name?.trim()) {
      results.push({ name: '(missing)', status: 'skipped: no name' });
      continue;
    }

    await queryOne(
      'INSERT INTO staff (name, department) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
      [name.trim(), department?.trim() || null]
    );

    results.push({ name: name.trim(), status: 'imported' });
  }

  return NextResponse.json({ results, total: rows.length });
}
