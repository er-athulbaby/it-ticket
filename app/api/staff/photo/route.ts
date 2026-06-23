import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  const staffIdStr = formData.get('staffId') as string | null;

  if (!file || !staffIdStr) return NextResponse.json({ error: 'Missing file or staffId' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 400 });

  const staffId = parseInt(staffIdStr);
  const ext = path.extname(file.name) || '.jpg';
  const filename = `staff_${staffId}${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  await query('UPDATE staff SET photo_filename = $1 WHERE id = $2', [filename, staffId]);

  return NextResponse.json({ filename });
}
