import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { query, queryOne } from '@/lib/db';
import { sendNewTicketEmail } from '@/lib/email';

function verify(answer: string, token: string): boolean {
  const expected = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'secret')
    .update(answer)
    .digest('hex');
  return expected === token;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requester_id, title, description, captcha_answer, captcha_token } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!requester_id) return NextResponse.json({ error: 'Please select your name' }, { status: 400 });

    if (!captcha_answer || !captcha_token || !verify(String(captcha_answer), captcha_token)) {
      return NextResponse.json({ error: 'Incorrect answer — please try again' }, { status: 400 });
    }

    // Generate ticket number
    const settingsRows = await query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key IN ('ticket_prefix', 'ticket_counter')`
    );
    const settings: Record<string, string> = {};
    settingsRows.forEach((r) => { settings[r.key] = r.value; });
    const prefix = settings['ticket_prefix'] || 'IT';
    const nextCounter = (parseInt(settings['ticket_counter'] || '0') + 1);
    await query(`UPDATE app_settings SET value = $1 WHERE key = 'ticket_counter'`, [String(nextCounter)]);
    const ticketNumber = `${prefix}-${String(nextCounter).padStart(5, '0')}`;

    const ticket = await queryOne<{ id: number }>(`
      INSERT INTO tickets (ticket_number, title, description, priority, status, requester_id)
      VALUES ($1, $2, $3, 'medium', 'open', $4)
      RETURNING id, ticket_number
    `, [ticketNumber, title.trim(), description?.trim() || '', requester_id]);

    const requester = await queryOne<{ name: string }>(
      'SELECT name FROM staff WHERE id = $1', [requester_id]
    );

    sendNewTicketEmail({
      ticket_number: ticketNumber,
      title: title.trim(),
      priority: 'medium',
      requester_name: requester?.name ?? null,
      category_name: null,
    }).catch(() => {});

    return NextResponse.json({ ticket_number: ticketNumber, id: ticket?.id }, { status: 201 });
  } catch (err) {
    console.error('Public submit error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
