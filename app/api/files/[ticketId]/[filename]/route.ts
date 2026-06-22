import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string; filename: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticketId, filename } = await params;

  // Prevent path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), 'uploads', ticketId, safeName);

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
