import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const assetIdParam = new URL(req.url).searchParams.get('assetId');
  const id = assetIdParam ? parseInt(assetIdParam) : null;
  if (!id) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

  const asset = await queryOne<{ photo_filename: string | null }>(
    'SELECT photo_filename FROM assets WHERE id = $1', [id]
  );
  if (!asset?.photo_filename) return NextResponse.json({ error: 'No photo' }, { status: 404 });

  const filePath = path.join(process.cwd(), 'uploads', 'assets', asset.photo_filename);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = readFileSync(filePath);
  const ext = path.extname(asset.photo_filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';

  return new NextResponse(buffer, {
    headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' },
  });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (token.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  const assetIdStr = formData.get('assetId') as string | null;

  if (!file || !assetIdStr) return NextResponse.json({ error: 'Missing file or assetId' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 400 });

  const assetId = parseInt(assetIdStr);
  const ext = path.extname(file.name) || '.jpg';
  const filename = `asset_${assetId}${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'assets');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  await query('UPDATE assets SET photo_filename = $1 WHERE id = $2', [filename, assetId]);

  return NextResponse.json({ filename });
}
