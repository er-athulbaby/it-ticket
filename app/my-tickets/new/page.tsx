'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StaffLayout from '@/components/staff/StaffLayout';
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/utils';

interface Category { id: number; name: string; }

export default function NewMyTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(d));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError('');
    const res = await fetch('/api/staff-portal/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category_id: form.category_id || null }),
    });
    if (res.ok) {
      router.push('/my-tickets');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to submit ticket');
      setSubmitting(false);
    }
  }

  return (
    <StaffLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">New Ticket</h1>
          <p className="text-sm text-slate-500 mt-1">Submit a support request</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Detailed description of the issue (optional)…"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Priority <span className="text-red-500">*</span>
              </label>
              <select required value={form.priority} onChange={(e) => set('priority', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Select category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
            <button type="button" onClick={() => router.push('/my-tickets')}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
}
