'use client';

import { useEffect, useState, useCallback } from 'react';

interface StaffMember { id: number; name: string; department: string | null }
interface Settings { company_name?: string; logo_filename?: string }

export default function PublicTicketPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [captcha, setCaptcha] = useState<{ question: string; token: string } | null>(null);
  const [form, setForm] = useState({ requester_id: '', title: '', description: '', captcha_answer: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadCaptcha = useCallback(async () => {
    const res = await fetch('/api/public/captcha');
    setCaptcha(await res.json());
    setForm((f) => ({ ...f, captcha_answer: '' }));
  }, []);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setSettings);
    fetch('/api/public/staff').then((r) => r.json()).then(setStaff);
    loadCaptcha();
  }, [loadCaptcha]);

  const deptGroups = staff.reduce<Record<string, StaffMember[]>>((acc, s) => {
    const dept = s.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(s);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.requester_id) { setError('Please select your name'); return; }
    if (!captcha) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: parseInt(form.requester_id),
          title: form.title,
          description: form.description,
          captcha_answer: form.captcha_answer,
          captcha_token: captcha.token,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submission failed. Please try again.');
        await loadCaptcha();
        return;
      }

      setSuccess(data.ticket_number);
      setForm({ requester_id: '', title: '', description: '', captcha_answer: '' });
      await loadCaptcha();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Network error. Please try again.');
      await loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  const company = settings.company_name || 'HelpDesk';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          {settings.logo_filename ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/settings/logo" alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
          ) : (
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {company.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-slate-800">{company}</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Submit a Support Ticket</h1>
          <p className="text-sm text-slate-500 mt-1">Fill in the form below and our team will get back to you.</p>
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-green-50 border border-green-300 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
            <span className="text-green-500 text-xl mt-0.5">✓</span>
            <div>
              <p className="font-semibold text-green-800">Ticket submitted successfully!</p>
              <p className="text-sm text-green-700 mt-0.5">
                Your ticket number is <strong className="font-mono">{success}</strong>. Please save this for your records.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Name <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.requester_id}
                onChange={(e) => setForm((f) => ({ ...f, requester_id: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">— Select your name —</option>
                {Object.entries(deptGroups).map(([dept, members]) => (
                  <optgroup key={dept} label={dept}>
                    {members.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Brief description of your issue"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Details <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={4}
                placeholder="Describe the issue in more detail…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* CAPTCHA */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Security check <span className="text-red-500">*</span>
              </label>
              {captcha ? (
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-4 py-2 font-mono">
                    {captcha.question} = ?
                  </span>
                  <input
                    type="number"
                    required
                    placeholder="Answer"
                    value={form.captcha_answer}
                    onChange={(e) => setForm((f) => ({ ...f, captcha_answer: e.target.value }))}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={loadCaptcha}
                    className="text-xs text-slate-500 hover:text-slate-700 underline">
                    New question
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Loading…</div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Have an account? <a href="/login" className="text-indigo-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
