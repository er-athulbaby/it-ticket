'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/AppLayout';
import { THEMES, type ThemeKey } from '@/lib/themes';
import type { TicketStatus } from '@/lib/useStatuses';

const COLOR_OPTIONS = [
  { label: 'Yellow',  value: 'bg-yellow-100 text-yellow-700' },
  { label: 'Blue',    value: 'bg-blue-100 text-blue-700' },
  { label: 'Green',   value: 'bg-green-100 text-green-700' },
  { label: 'Orange',  value: 'bg-orange-100 text-orange-700' },
  { label: 'Red',     value: 'bg-red-100 text-red-700' },
  { label: 'Purple',  value: 'bg-purple-100 text-purple-700' },
  { label: 'Pink',    value: 'bg-pink-100 text-pink-700' },
  { label: 'Teal',    value: 'bg-teal-100 text-teal-700' },
  { label: 'Indigo',  value: 'bg-indigo-100 text-indigo-700' },
  { label: 'Gray',    value: 'bg-slate-100 text-slate-600' },
];

export default function SettingsPage() {
  const { data: session } = useSession();

  // Admin photo
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Statuses
  const [ticketStatuses, setTicketStatuses] = useState<TicketStatus[]>([]);
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatus, setNewStatus] = useState({ label: '', slug: '', color_class: 'bg-slate-100 text-slate-600' });
  const [savingStatus, setSavingStatus] = useState(false);

  const loadStatuses = useCallback(() => {
    fetch('/api/ticket-statuses').then((r) => r.json()).then(setTicketStatuses);
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  async function addStatus() {
    if (!newStatus.label.trim()) return;
    setSavingStatus(true);
    const slug = newStatus.slug.trim() || newStatus.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await fetch('/api/ticket-statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newStatus, slug }),
    });
    setNewStatus({ label: '', slug: '', color_class: 'bg-slate-100 text-slate-600' });
    setShowAddStatus(false);
    setSavingStatus(false);
    loadStatuses();
  }

  async function deleteStatus(id: number) {
    if (!window.confirm('Delete this status?')) return;
    await fetch('/api/ticket-statuses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadStatuses();
  }

  // Theme
  const [theme, setTheme] = useState<ThemeKey>('indigo');
  const [savingTheme, setSavingTheme] = useState(false);

  // Branding
  const [companyName, setCompanyName] = useState('');
  const [ticketPrefix, setTicketPrefix] = useState('');
  const [hasLogo, setHasLogo] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Email / SMTP
  const [smtp, setSmtp] = useState({ notification_email: '', smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '' });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Reminders
  const [reminderTime1, setReminderTime1] = useState('09:00');
  const [reminderTime2, setReminderTime2] = useState('15:00');
  const [reminderSecret, setReminderSecret] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  // Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    const rawId = (session?.user as { id?: string })?.id ?? '';
    const adminId = rawId.replace('admin_', '');
    if (adminId) setPhotoUrl(`/api/users/photo?adminId=${adminId}&t=${Date.now()}`);

    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setCompanyName(d.company_name || '');
      setTicketPrefix(d.ticket_prefix || 'IT');
      setHasLogo(!!d.logo_filename);
      if (d.theme) setTheme(d.theme as ThemeKey);
      setSmtp({
        notification_email: d.notification_email || '',
        smtp_host: d.smtp_host || 'smtp.gmail.com',
        smtp_port: d.smtp_port || '587',
        smtp_user: d.smtp_user || '',
        smtp_pass: d.smtp_pass || '',
      });
      if (d.reminder_time_1) setReminderTime1(d.reminder_time_1);
      if (d.reminder_time_2) setReminderTime2(d.reminder_time_2);
      if (d.reminder_secret) setReminderSecret(d.reminder_secret);
    });
  }, []);

  async function handleAdminPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData(); fd.append('photo', file);
    const res = await fetch('/api/users/photo', { method: 'POST', body: fd });
    if (res.ok) {
      const rawId = (session?.user as { id?: string })?.id ?? '';
      setPhotoUrl(`/api/users/photo?adminId=${rawId.replace('admin_', '')}&t=${Date.now()}`);
    }
    setUploadingPhoto(false);
    if (photoRef.current) photoRef.current.value = '';
  }

  async function saveTheme(t: ThemeKey) {
    setTheme(t);
    setSavingTheme(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    });
    setSavingTheme(false);
  }

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setSavingBranding(true); setBrandingMsg('');
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName, ticket_prefix: ticketPrefix.toUpperCase() }),
    });
    setSavingBranding(false);
    setBrandingMsg('Saved successfully');
    setTimeout(() => setBrandingMsg(''), 3000);
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData(); fd.append('logo', file);
    const res = await fetch('/api/settings/logo', { method: 'POST', body: fd });
    if (res.ok) setHasLogo(true);
    setUploadingLogo(false);
    if (logoRef.current) logoRef.current.value = '';
  }

  async function saveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSavingSmtp(true); setSmtpMsg(null);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtp),
    });
    setSavingSmtp(false);
    setSmtpMsg({ type: 'success', text: 'Email settings saved' });
  }

  async function saveReminder(e: React.FormEvent) {
    e.preventDefault();
    setSavingReminder(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminder_time_1: reminderTime1, reminder_time_2: reminderTime2 }),
    });
    setSavingReminder(false);
    setReminderMsg('Saved');
    setTimeout(() => setReminderMsg(''), 3000);
  }

  async function generateSecret() {
    const res = await fetch('/api/settings/generate-secret', { method: 'POST' });
    const d = await res.json();
    if (d.secret) setReminderSecret(d.secret);
  }

  async function testEmail() {
    setTesting(true); setSmtpMsg(null);
    const res = await fetch('/api/settings/test-email', { method: 'POST' });
    const d = await res.json();
    setSmtpMsg(res.ok ? { type: 'success', text: 'Test email sent! Check your inbox.' } : { type: 'error', text: d.error || 'Failed to send test email' });
    setTesting(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setPwdMsg('Passwords do not match'); return; }
    if (password.length < 6) { setPwdMsg('Minimum 6 characters'); return; }
    setSavingPwd(true);
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: parseInt(session?.user?.id?.replace('admin_', '') ?? '0'),
        name: session?.user?.name,
        role: (session?.user as { role?: string })?.role,
        is_active: true,
        password,
      }),
    });
    setSavingPwd(false);
    setPwdMsg('Password changed successfully');
    setPassword(''); setConfirm('');
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

        {/* Theme */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Site Theme</h2>
          <p className="text-sm text-slate-500 mb-4">Choose the colour scheme for the sidebar and buttons. {savingTheme && <span className="text-indigo-600">Saving…</span>}</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
              <button key={key} onClick={() => saveTheme(key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme === key ? 'border-slate-900 shadow-md scale-105' : 'border-slate-200 hover:border-slate-400'}`}>
                <div className="w-10 h-10 rounded-full shadow-inner" style={{ backgroundColor: THEMES[key].preview }} />
                <span className="text-xs font-medium text-slate-700">{THEMES[key].label}</span>
                {theme === key && <span className="text-xs text-slate-500">✓</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Reload the page after changing to see the new theme in the sidebar.</p>
        </div>

        {/* Ticket Statuses */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Ticket Statuses</h2>
              <p className="text-sm text-slate-500 mt-0.5">Add custom statuses like SG, Finance, Other</p>
            </div>
            <button onClick={() => setShowAddStatus(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              + Add Status
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {ticketStatuses.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color_class}`}>{s.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{s.slug}</span>
                  {s.is_system && <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">system</span>}
                </div>
                {!s.is_system && (
                  <button onClick={() => deleteStatus(s.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Delete</button>
                )}
              </div>
            ))}
          </div>

          {showAddStatus && (
            <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">New Status</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Label <span className="text-red-500">*</span></label>
                  <input type="text" value={newStatus.label} onChange={(e) => setNewStatus((n) => ({ ...n, label: e.target.value }))}
                    placeholder="e.g. SG, Finance, Other"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Slug (auto if blank)</label>
                  <input type="text" value={newStatus.slug} onChange={(e) => setNewStatus((n) => ({ ...n, slug: e.target.value }))}
                    placeholder="e.g. sg, finance"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Colour</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c.value} onClick={() => setNewStatus((n) => ({ ...n, color_class: c.value }))}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${c.value} ${newStatus.color_class === c.value ? 'ring-2 ring-offset-1 ring-slate-800 scale-110' : ''}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addStatus} disabled={savingStatus || !newStatus.label.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {savingStatus ? 'Saving…' : 'Add Status'}
                </button>
                <button onClick={() => setShowAddStatus(false)}
                  className="border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Company Branding</h2>
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
              {hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/api/settings/logo" alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl text-slate-300">🖼️</span>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700 mb-1">Company Logo</div>
              <div className="text-xs text-slate-400 mb-2">PNG or JPG, shown in sidebar and login page</div>
              <input ref={logoRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" id="logo-upload" />
              <label htmlFor="logo-upload" className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                {uploadingLogo ? 'Uploading…' : hasLogo ? 'Change Logo' : 'Upload Logo'}
              </label>
            </div>
          </div>

          <form onSubmit={saveBranding} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
              <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ticket Number Prefix</label>
              <div className="flex items-center gap-3">
                <input type="text" required maxLength={6} value={ticketPrefix}
                  onChange={(e) => setTicketPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="IT"
                  className="w-28 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-sm text-slate-500">→ <strong>{ticketPrefix || 'IT'}-00001</strong></span>
              </div>
            </div>
            {brandingMsg && <div className="text-sm bg-green-50 text-green-700 px-3.5 py-2.5 rounded-lg">{brandingMsg}</div>}
            <button type="submit" disabled={savingBranding}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
              {savingBranding ? 'Saving…' : 'Save Branding'}
            </button>
          </form>
        </div>

        {/* Email / SMTP */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Email Notifications</h2>
          <p className="text-sm text-slate-500 mb-4">Sends an email when a new ticket is submitted. Uses Gmail SMTP with an App Password.</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">How to set up Gmail:</p>
            <p>1. Enable 2-Step Verification on your Google account</p>
            <p>2. Go to Google Account → Security → App Passwords</p>
            <p>3. Create an app password for "Mail" — paste it in the password field below</p>
          </div>

          <form onSubmit={saveSmtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notify Email (recipient)</label>
              <input type="email" value={smtp.notification_email} onChange={(e) => setSmtp((s) => ({ ...s, notification_email: e.target.value }))}
                placeholder="admin@company.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-slate-400 mt-1">New ticket alerts and reminders will be sent to this address.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Host</label>
                <input type="text" value={smtp.smtp_host} onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Port</label>
                <input type="number" value={smtp.smtp_port} onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gmail Address (sender)</label>
              <input type="email" value={smtp.smtp_user} onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))}
                placeholder="yourname@gmail.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">App Password</label>
              <input type="password" value={smtp.smtp_pass} onChange={(e) => setSmtp((s) => ({ ...s, smtp_pass: e.target.value }))}
                placeholder="Google App Password (16 characters)"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-slate-400 mt-1">Use the App Password generated from Google Account → Security. Not your regular Gmail password.</p>
            </div>

            {smtpMsg && (
              <div className={`text-sm px-3.5 py-2.5 rounded-lg ${smtpMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {smtpMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={savingSmtp}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
                {savingSmtp ? 'Saving…' : 'Save Email Settings'}
              </button>
              <button type="button" onClick={testEmail} disabled={testing || !smtp.smtp_user}
                className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">
                {testing ? 'Sending…' : 'Send Test Email'}
              </button>
            </div>
          </form>
        </div>

        {/* Reminder Schedule */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Reminder Schedule</h2>
          <p className="text-sm text-slate-500 mb-4">Set the times when reminder emails are sent for unresolved tickets. Times are in UTC.</p>

          <form onSubmit={saveReminder} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First reminder time (UTC)</label>
                <input type="time" value={reminderTime1} onChange={(e) => setReminderTime1(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Second reminder time (UTC)</label>
                <input type="time" value={reminderTime2} onChange={(e) => setReminderTime2(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-slate-400 mt-1">Used for &quot;Twice daily&quot; tickets only.</p>
              </div>
            </div>
            {reminderMsg && <p className="text-sm text-green-600">{reminderMsg}</p>}
            <button type="submit" disabled={savingReminder}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
              {savingReminder ? 'Saving…' : 'Save Times'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-2">Cron Secret Token</p>
            <p className="text-xs text-slate-500 mb-3">A secret token protects the reminder endpoint so only your cron job can trigger it.</p>
            <div className="flex gap-2 items-center mb-3">
              <input readOnly value={reminderSecret || '(not generated yet)'}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-600 truncate" />
              <button type="button" onClick={() => { if (reminderSecret) { navigator.clipboard.writeText(reminderSecret); } }}
                disabled={!reminderSecret}
                className="border border-slate-300 text-slate-600 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Copy
              </button>
              <button type="button" onClick={generateSecret}
                className="border border-indigo-300 text-indigo-600 text-xs px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                {reminderSecret ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            {reminderSecret && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Server cron setup (run on your Ubuntu server):</p>
                <p className="text-xs text-slate-500">Run <code className="bg-white border border-slate-200 px-1 rounded">crontab -e</code> and add this line:</p>
                <code className="block text-xs bg-white border border-slate-200 rounded px-3 py-2 text-slate-700 break-all">
                  {`*/15 * * * * curl -s "http://localhost:3000/api/reminders/send?secret=${reminderSecret}" >> /var/log/helpdesk-reminders.log 2>&1`}
                </code>
                <p className="text-xs text-slate-400">This runs every 15 minutes. Emails only send when the current time (UTC) is within 15 minutes of your configured reminder times above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Account</h2>
          <p className="text-sm text-slate-500 mb-4">Signed in as <strong>{session?.user?.email}</strong></p>

          {/* Profile photo */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="relative">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Profile"
                  onError={() => setPhotoUrl('')}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                  {session?.user?.name?.slice(0, 1).toUpperCase() ?? 'A'}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">{session?.user?.name}</p>
              <input ref={photoRef} type="file" accept="image/*" onChange={handleAdminPhoto} className="hidden" id="admin-photo" />
              <label htmlFor="admin-photo" className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                {uploadingPhoto ? 'Uploading…' : photoUrl ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {pwdMsg && (
              <div className={`text-sm px-3.5 py-2.5 rounded-lg ${pwdMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {pwdMsg}
              </div>
            )}
            <button type="submit" disabled={savingPwd}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
              {savingPwd ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
