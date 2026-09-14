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

function createTransport(s: Record<string, string>) {
  return nodemailer.createTransport({
    host: s.smtp_host || 'smtp.gmail.com',
    port: parseInt(s.smtp_port || '587'),
    secure: false,
    auth: { user: s.smtp_user, pass: s.smtp_pass },
  });
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

  const transporter = createTransport(s);
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

export async function sendServiceRequestCreatedEmail(to: string, sr: {
  request_number: string;
  employee_name: string | null;
  duration_type: string;
  return_by_date: string | null;
}) {
  const s = await getSmtpSettings();
  if (!s.smtp_user || !s.smtp_pass) return;

  const transporter = createTransport(s);
  const company = s.company_name || 'HelpDesk';
  const durationLine = sr.duration_type === 'temporary'
    ? `Temporary${sr.return_by_date ? ` — expected return by ${new Date(sr.return_by_date).toLocaleDateString()}` : ''}`
    : 'Permanent';

  await transporter.sendMail({
    from: `"${company}" <${s.smtp_user}>`,
    to,
    subject: `[${sr.request_number}] Your IT Service Request has been submitted`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;font-size:18px;">${company} — Service Request Received</h2>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">Hi ${sr.employee_name || 'there'}, your IT service / asset request has been recorded.</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;">Request #</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${sr.request_number}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Duration</td><td style="padding:6px 0;color:#1e293b;">${durationLine}</td></tr>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#64748b;">You will receive another email once the asset is returned or the request is completed.</p>
        </div>
      </div>
    `,
  });
}

export async function sendServiceRequestReturnedEmail(to: string, sr: {
  request_number: string;
  employee_name: string | null;
  device_return_date: string | null;
  received_by_name: string | null;
}) {
  const s = await getSmtpSettings();
  if (!s.smtp_user || !s.smtp_pass) return;

  const transporter = createTransport(s);
  const company = s.company_name || 'HelpDesk';

  await transporter.sendMail({
    from: `"${company}" <${s.smtp_user}>`,
    to,
    subject: `[${sr.request_number}] Device return confirmed`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#059669;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;font-size:18px;">${company} — Return Confirmed</h2>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">Hi ${sr.employee_name || 'there'}, this confirms the device(s) under your service request have been returned.</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;">Request #</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${sr.request_number}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Returned On</td><td style="padding:6px 0;color:#1e293b;">${sr.device_return_date ? new Date(sr.device_return_date).toLocaleDateString() : '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Received By</td><td style="padding:6px 0;color:#1e293b;">${sr.received_by_name || '—'}</td></tr>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#64748b;">Thank you.</p>
        </div>
      </div>
    `,
  });
}

interface ReminderTicket {
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  notification_frequency: string;
}

export async function sendReminderEmail(tickets: ReminderTicket[]) {
  const s = await getSmtpSettings();
  if (!s.smtp_user || !s.smtp_pass || !s.notification_email) return;

  const transporter = createTransport(s);
  const company = s.company_name || 'HelpDesk';

  const rows = tickets.map((t) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:12px;color:#64748b;">${t.ticket_number}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${t.title}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;text-transform:capitalize;">${t.priority}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;text-transform:capitalize;">${t.status.replace(/_/g, ' ')}</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: `"${company}" <${s.smtp_user}>`,
    to: s.notification_email,
    subject: `[${company}] Reminder: ${tickets.length} unresolved ticket${tickets.length > 1 ? 's' : ''}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">
        <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;font-size:18px;">${company} — Ticket Reminder</h2>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">The following <strong>${tickets.length} ticket${tickets.length > 1 ? 's' : ''}</strong> still need attention:</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Ticket #</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Title</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Priority</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#64748b;">Login to your HelpDesk to update or resolve these tickets.</p>
        </div>
      </div>
    `,
  });
}

interface ExpiringLicense {
  name: string;
  vendor: string | null;
  expiry_date: string;
  days_left: number;
}

export async function sendLicenseExpiryEmail(licenses: ExpiringLicense[]) {
  const s = await getSmtpSettings();
  if (!s.smtp_user || !s.smtp_pass || !s.notification_email) return;

  const transporter = createTransport(s);
  const company = s.company_name || 'HelpDesk';

  const rows = licenses.map((l) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${l.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">${l.vendor || '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${new Date(l.expiry_date).toLocaleDateString()}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#b91c1c;font-weight:600;">${l.days_left} days</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: `"${company}" <${s.smtp_user}>`,
    to: s.notification_email,
    subject: `[${company}] License Expiry Reminder: ${licenses.length} license${licenses.length > 1 ? 's' : ''} expiring soon`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">
        <div style="background:#dc2626;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;font-size:18px;">${company} — License Expiry Reminder</h2>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">The following <strong>${licenses.length} license${licenses.length > 1 ? 's' : ''}</strong> are expiring soon:</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">License</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Vendor</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Expiry</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Days Left</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#64748b;">Login to your HelpDesk to renew or update these licenses.</p>
        </div>
      </div>
    `,
  });
}
