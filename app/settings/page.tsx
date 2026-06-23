'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/AppLayout';
import Image from 'next/image';

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

  // Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setCompanyName(d.company_name || '');
        setTicketPrefix(d.ticket_prefix || 'IT');
        setHasLogo(!!d.logo_filename);
      });
  }, []);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setSavingBranding(true);
    setBrandingMsg('');
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
    const fd = new FormData();
    fd.append('logo', file);
    const res = await fetch('/api/settings/logo', { method: 'POST', body: fd });
    if (res.ok) setHasLogo(true);
    setUploadingLogo(false);
    if (logoRef.current) logoRef.current.value = '';
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
        id: parseInt(session?.user?.id ?? '0'),
        name: session?.user?.name,
        role: (session?.user as { role?: string })?.role,
        is_active: true,
        password,
      }),
    });
    setSavingPwd(false);
    setPwdMsg('Password changed successfully');
    setPassword('');
    setConfirm('');
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

        {/* Branding */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Company Branding</h2>

          {/* Logo upload */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
              {hasLogo ? (
                <Image src="/api/settings/logo" alt="Logo" width={64} height={64} className="object-contain" />
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
              <input
                type="text" required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ticket Number Prefix</label>
              <div className="flex items-center gap-3">
                <input
                  type="text" required maxLength={6}
                  value={ticketPrefix}
                  onChange={(e) => setTicketPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="IT"
                  className="w-28 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-500">→ next ticket will be <strong>{ticketPrefix || 'IT'}-00001</strong> format</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Only letters and numbers. Changing this affects new tickets only.</p>
            </div>

            {brandingMsg && (
              <div className="text-sm bg-green-50 text-green-700 px-3.5 py-2.5 rounded-lg">{brandingMsg}</div>
            )}

            <button type="submit" disabled={savingBranding}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
              {savingBranding ? 'Saving…' : 'Save Branding'}
            </button>
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
