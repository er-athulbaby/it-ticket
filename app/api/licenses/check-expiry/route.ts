import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendLicenseExpiryEmail } from '@/lib/email';

// Call this once a day from an external cron (e.g. cron-job.org) with ?secret=<reminder_secret>.
// Reuses the same reminder_secret app_setting as /api/reminders/send.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') ?? '';

  const settingsRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key = 'reminder_secret'`
  );
  const configuredSecret = settingsRows[0]?.value || '';

  if (!configuredSecret || configuredSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const licenses = await query<{
    id: number; name: string; vendor: string | null; expiry_date: string;
    remind_90: boolean; remind_60: boolean; remind_30: boolean;
    last_reminder_sent_days: number | null;
  }>(`
    SELECT id, name, vendor, expiry_date, remind_90, remind_60, remind_30, last_reminder_sent_days
    FROM licenses
    WHERE expiry_date IS NOT NULL AND (remind_90 OR remind_60 OR remind_30)
  `);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toNotify: { id: number; name: string; vendor: string | null; expiry_date: string; days_left: number; threshold: number }[] = [];

  for (const l of licenses) {
    const expiry = new Date(l.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86400000);

    const thresholds = [l.remind_90 ? 90 : null, l.remind_60 ? 60 : null, l.remind_30 ? 30 : null].filter((t): t is number => t !== null);
    // Fire for the largest enabled threshold that's >= daysLeft and hasn't been notified yet at this or a closer threshold
    const dueThreshold = thresholds.filter((t) => daysLeft <= t).sort((a, b) => a - b)[0];
    if (dueThreshold === undefined) continue;
    if (l.last_reminder_sent_days !== null && l.last_reminder_sent_days <= dueThreshold) continue;

    toNotify.push({ id: l.id, name: l.name, vendor: l.vendor, expiry_date: l.expiry_date, days_left: daysLeft, threshold: dueThreshold });
  }

  if (toNotify.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  await sendLicenseExpiryEmail(toNotify.map((l) => ({ name: l.name, vendor: l.vendor, expiry_date: l.expiry_date, days_left: l.days_left })));

  for (const l of toNotify) {
    await query(`UPDATE licenses SET last_reminder_sent_days = $1 WHERE id = $2`, [l.threshold, l.id]);
  }

  return NextResponse.json({ sent: toNotify.length });
}
