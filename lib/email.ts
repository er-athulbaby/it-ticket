import nodemailer from 'nodemailer';
import { query } from './db';

async function getSmtpSettings() {
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','notification_email','company_name')`
  );
  const s: Record<string, string> = {};
  rows.forEach((r) => { s[r.key] = r.value; });
  return s;
}

export async function sendNewTicketEmail(ticket: {
  ticket_number: string;
  title: string;
  priority: string;
  requester_name: string | null;
  category_name: string | null;
}) {
  const s = await getSmtpSettings();
  if (!s.smtp_user || !s.smtp_pass || !s.notification_email) return;

  const transporter = nodemailer.createTransport({
    host: s.smtp_host || 'smtp-mail.outlook.com',
    port: parseInt(s.smtp_port || '587'),
    secure: false,
    auth: { user: s.smtp_user, pass: s.smtp_pass },
    tls: { ciphers: 'SSLv3' },
  });

  const company = s.company_name || 'HelpDesk';

  await transporter.sendMail({
    from: `"${company}" <${s.smtp_user}>`,
    to: s.notification_email,
    subject: `[${ticket.ticket_number}] New Ticket: ${ticket.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;font-size:18px;">${company} — New Ticket</h2>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;">Ticket #</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${ticket.ticket_number}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Title</td><td style="padding:6px 0;color:#1e293b;">${ticket.title}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Priority</td><td style="padding:6px 0;color:#1e293b;text-transform:capitalize;">${ticket.priority}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Requested By</td><td style="padding:6px 0;color:#1e293b;">${ticket.requester_name || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Category</td><td style="padding:6px 0;color:#1e293b;">${ticket.category_name || '—'}</td></tr>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#64748b;">Login to your HelpDesk to view and respond to this ticket.</p>
        </div>
      </div>
    `,
  });
}
