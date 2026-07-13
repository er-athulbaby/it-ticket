import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendReminderEmail } from '@/lib/email';

function minutesFromMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function isWithin15Min(currentHHMM: string, targetHHMM: string): boolean {
  return Math.abs(minutesFromMidnight(currentHHMM) - minutesFromMidnight(targetHHMM)) <= 15;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') ?? '';

  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('reminder_secret','reminder_time_1','reminder_time_2')`
  );
  const s: Record<string, string> = {};
  rows.forEach((r) => { s[r.key] = r.value; });

  if (!s.reminder_secret || s.reminder_secret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Current time in UTC HH:MM
  const now = new Date();
  const currentHHMM = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

  const slot1 = s.reminder_time_1 || '09:00';
  const slot2 = s.reminder_time_2 || '15:00';
  const inWindow = isWithin15Min(currentHHMM, slot1) || isWithin15Min(currentHHMM, slot2);

  if (!inWindow) {
    return NextResponse.json({ skipped: true, currentTime: currentHHMM, slots: [slot1, slot2] });
  }

  // once_daily: send if not reminded in last 20 hours
  // twice_daily: send if not reminded in last 10 hours
  const tickets = await query<{
    id: number; ticket_number: string; title: string;
    status: string; priority: string; notification_frequency: string;
  }>(`
    SELECT id, ticket_number, title, status, priority, notification_frequency
    FROM tickets
    WHERE notification_frequency != 'none'
      AND status NOT IN ('resolved', 'closed')
      AND (
        (notification_frequency = 'once_daily'  AND (reminder_last_sent IS NULL OR reminder_last_sent < NOW() - INTERVAL '20 hours'))
        OR
        (notification_frequency = 'twice_daily' AND (reminder_last_sent IS NULL OR reminder_last_sent < NOW() - INTERVAL '10 hours'))
      )
    ORDER BY created_at ASC
  `);

  if (tickets.length === 0) {
    return NextResponse.json({ sent: 0, currentTime: currentHHMM });
  }

  await sendReminderEmail(tickets);

  const ids = tickets.map((t) => t.id);
  await query(`UPDATE tickets SET reminder_last_sent = NOW() WHERE id = ANY($1::int[])`, [ids]);

  return NextResponse.json({ sent: tickets.length, currentTime: currentHHMM });
}
