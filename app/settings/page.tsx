'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMsg('Passwords do not match'); return; }
    if (password.length < 6) { setMsg('Password must be at least 6 characters'); return; }
    setSaving(true);
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
    setSaving(false);
    setMsg('Password changed successfully');
    setPassword('');
    setConfirm('');
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Account</h2>
          <p className="text-sm text-slate-500 mb-4">Signed in as <strong>{session?.user?.email}</strong></p>

          <form onSubmit={changePassword} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <input
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
              <input
                type="password" required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {msg && (
              <div className={`text-sm px-3.5 py-2.5 rounded-lg ${msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg}
              </div>
            )}
            <button
              type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Ticket Statuses</h2>
          <div className="space-y-2 text-sm text-slate-600">
            {[
              { label: 'Open', desc: 'New ticket, not yet being worked on' },
              { label: 'In Progress', desc: 'Actively being worked on' },
              { label: 'Resolved', desc: 'Issue has been fixed' },
              { label: 'Closed', desc: 'Ticket is complete and archived' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-24 font-medium text-slate-700">{s.label}</div>
                <div className="text-slate-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
