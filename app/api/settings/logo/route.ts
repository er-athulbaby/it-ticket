import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('logo') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
  }

  const ext = path.extname(file.name) || '.png';
  const filename = `logo${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'settings');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  await query(
    'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
    ['logo_filename', filename]
  );

  return NextResponse.json({ filename });
}

export async function GET() {
  const rows = await query<{ value: string }>(`SELECT value FROM app_settings WHERE key = 'logo_filename'`);
  const filename = rows[0]?.value;
  if (!filename) return NextResponse.json({ error: 'No logo' }, { status: 404 });

  const filePath = path.join(process.cwd(), 'uploads', 'settings', filename);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

  return new NextResponse(buffer, {
    headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' },
  });
}
