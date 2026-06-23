'use client';

import { useState, useEffect, useRef } from 'react';
import StaffLayout from '@/components/staff/StaffLayout';
import { useSession } from 'next-auth/react';

interface StaffProfile {
  id: number; name: string; email: string; department: string | null; photo_filename: string | null;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      setProfile(d);
      if (d.id) setPhotoUrl(`/api/profile/photo?staffId=${d.id}&t=${Date.now()}`);
    });
  }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch('/api/profile/photo', { method: 'POST', body: fd });
    if (res.ok) {
      setPhotoUrl(`/api/profile/photo?staffId=${profile?.id}&t=${Date.now()}`);
    }
    setUploading(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    setSaving(true); setMsg(null);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const d = await res.json();
    if (res.ok) { setMsg({ type: 'success', text: 'Password updated successfully' }); setPassword(''); setConfirm(''); }
    else setMsg({ type: 'error', text: d.error || 'Failed to update password' });
    setSaving(false);
  }

  return (
    <StaffLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

        {/* Profile card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
          <div className="flex items-center gap-6">
            <div className="relative">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                  {profile?.name?.slice(0, 1).toUpperCase() ?? '?'}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-indigo-700 transition-colors"
                title="Change photo">
                {uploading ? '…' : '✏️'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile?.name}</h2>
              {profile?.department && <p className="text-sm text-slate-500">{profile.department}</p>}
              <p className="text-sm text-slate-400">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Change Password</h2>

          {msg && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password <span className="text-red-500">*</span></label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
              <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </StaffLayout>
  );
}
