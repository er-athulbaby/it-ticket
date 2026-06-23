import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import nodemailer from 'nodemailer';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','notification_email','company_name')`
  );
  const s: Record<string, string> = {};
  rows.forEach((r) => { s[r.key] = r.value; });

  if (!s.smtp_user || !s.smtp_pass || !s.notification_email) {
    return NextResponse.json({ error: 'SMTP settings not configured. Fill in all fields first.' }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: s.smtp_host || 'smtp-mail.outlook.com',
      port: parseInt(s.smtp_port || '587'),
      secure: false,
      auth: { user: s.smtp_user, pass: s.smtp_pass },
      tls: { ciphers: 'SSLv3' },
    });

    await transporter.sendMail({
      from: `"${s.company_name || 'HelpDesk'}" <${s.smtp_user}>`,
      to: s.notification_email,
      subject: 'HelpDesk — Test Email',
      html: `<p>This is a test email from your HelpDesk system. Email notifications are working correctly.</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
