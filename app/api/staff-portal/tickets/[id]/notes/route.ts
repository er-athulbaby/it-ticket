import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { queryOne } from '@/lib/db';

async function getStaffId(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const id = token?.id as string | undefined;
  if (!id?.startsWith('staff_')) return null;
  return parseInt(id.replace('staff_', ''));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staffId = await getStaffId(req);
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { note } = await req.json();
  if (!note?.trim()) return NextResponse.json({ error: 'Note is required' }, { status: 400 });

  const created = await queryOne(`
    INSERT INTO ticket_notes (ticket_id, staff_id, note)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id, staffId, note.trim()]);

  return NextResponse.json(created, { status: 201 });
}
