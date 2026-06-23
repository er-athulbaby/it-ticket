import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const adminIdParam = new URL(req.url).searchParams.get('adminId');
  const id = adminIdParam ? parseInt(adminIdParam) : null;
  if (!id) return NextResponse.json({ error: 'adminId required' }, { status: 400 });

  const admin = await queryOne<{ photo_filename: string | null }>(
    'SELECT photo_filename FROM admins WHERE id = $1', [id]
  );
  if (!admin?.photo_filename) return NextResponse.json({ error: 'No photo' }, { status: 404 });

  const filePath = path.join(process.cwd(), 'uploads', 'profiles', admin.photo_filename);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = readFileSync(filePath);
  const ext = path.extname(admin.photo_filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';

  return new NextResponse(buffer, {
    headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' },
  });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rawId = token.id as string ?? '';
  const adminId = parseInt(rawId.replace('admin_', ''));
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 400 });

  const ext = path.extname(file.name) || '.jpg';
  const filename = `admin_${adminId}${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  await query('UPDATE admins SET photo_filename = $1 WHERE id = $2', [filename, adminId]);

  return NextResponse.json({ filename });
}
