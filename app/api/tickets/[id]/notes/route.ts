import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { note } = await req.json();

  if (!note?.trim()) return NextResponse.json({ error: 'Note is required' }, { status: 400 });

  const created = await queryOne(`
    INSERT INTO ticket_notes (ticket_id, admin_id, note)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id, parseInt(session.user.id!), note.trim()]);

  return NextResponse.json(created, { status: 201 });
}
