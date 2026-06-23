import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

async function getStaffId(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const id = token?.id as string | undefined;
  if (!id?.startsWith('staff_')) return null;
  return parseInt(id.replace('staff_', ''));
}

export async function GET(req: NextRequest) {
  const staffIdParam = new URL(req.url).searchParams.get('staffId');
  const id = staffIdParam ? parseInt(staffIdParam) : null;
  if (!id) return NextResponse.json({ error: 'staffId required' }, { status: 400 });

  const staff = await queryOne<{ photo_filename: string | null }>(
    'SELECT photo_filename FROM staff WHERE id = $1', [id]
  );
  if (!staff?.photo_filename) return NextResponse.json({ error: 'No photo' }, { status: 404 });

  const filePath = path.join(process.cwd(), 'uploads', 'profiles', staff.photo_filename);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = readFileSync(filePath);
  const ext = path.extname(staff.photo_filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';

  return new NextResponse(buffer, {
    headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' },
  });
}

export async function POST(req: NextRequest) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 400 });

  const ext = path.extname(file.name) || '.jpg';
  const filename = `staff_${staffId}${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  await query('UPDATE staff SET photo_filename = $1 WHERE id = $2', [filename, staffId]);

  return NextResponse.json({ filename });
}
