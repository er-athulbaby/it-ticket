'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const { data: session } = useSession();

  // Branding
  const [companyName, setCompanyName] = useState('');
  const [ticketPrefix, setTicketPrefix] = useState('');
  const [hasLogo, setHasLogo] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Email / SMTP
  const [smtp, setSmtp] = useState({ notification_email: '', smtp_host: 'smtp-mail.outlook.com', smtp_port: '587', smtp_user: '', smtp_pass: '' });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setCompanyName(d.company_name || '');
      setTicketPrefix(d.ticket_prefix || 'IT');
      setHasLogo(!!d.logo_filename);
      setSmtp({
        notification_email: d.notification_email || '',
        smtp_host: d.smtp_host || 'smtp-mail.outlook.com',
        smtp_port: d.smtp_port || '587',
        smtp_user: d.smtp_user || '',
        smtp_pass: d.smtp_pass || '',
      });
    });
  }, []);

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
          <p className="text-sm text-slate-500 mb-4">Sends an email when a new ticket is submitted. Uses Outlook / Microsoft 365 SMTP.</p>

          <form onSubmit={saveSmtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notify Email (recipient)</label>
              <input type="email" value={smtp.notification_email} onChange={(e) => setSmtp((s) => ({ ...s, notification_email: e.target.value }))}
                placeholder="admin@company.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-slate-400 mt-1">New ticket alerts will be sent to this address.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Host</label>
                <input type="text" value={smtp.smtp_host} onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Port</label>
                <input type="number" value={smtp.smtp_port} onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Microsoft 365 Email (sender)</label>
              <input type="email" value={smtp.smtp_user} onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))}
                placeholder="helpdesk@company.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Password</label>
              <input type="password" value={smtp.smtp_pass} onChange={(e) => setSmtp((s) => ({ ...s, smtp_pass: e.target.value }))}
                placeholder="Your Microsoft 365 account password"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-slate-400 mt-1">For Microsoft 365, use your account password. Basic auth must be enabled by your admin.</p>
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

        {/* Change password */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Account</h2>
          <p className="text-sm text-slate-500 mb-4">Signed in as <strong>{session?.user?.email}</strong></p>
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
