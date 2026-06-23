'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/utils';
import type { Priority } from '@/lib/utils';

interface Category { id: number; name: string }
interface Admin { id: number; name: string }
interface Staff { id: number; name: string; department: string | null }

export default function NewTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    category_id: '', assigned_to: '', due_date: '', requester_id: '',
  });

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
    fetch('/api/users').then((r) => r.json()).then(setAdmins);
    fetch('/api/staff').then((r) => r.json()).then(setStaff);
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        requester_id: form.requester_id ? parseInt(form.requester_id) : null,
        due_date: form.due_date || null,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create ticket');
      return;
    }

    const ticket = await res.json();
    router.push(`/tickets/${ticket.id}`);
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-slate-900">New Ticket</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input
                type="text" required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Detailed description of the issue (optional)…"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Requested By <span className="text-red-500">*</span></label>
              <select
                required
                value={form.requester_id}
                onChange={(e) => set('requester_id', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select requester —</option>
                {staff.filter(s => s.department).reduce((depts: string[], s) => {
                  if (!depts.includes(s.department!)) depts.push(s.department!);
                  return depts;
                }, []).map(dept => (
                  <optgroup key={dept} label={dept}>
                    {staff.filter(s => s.department === dept).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
                {staff.filter(s => !s.department).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority <span className="text-red-500">*</span></label>
                <select
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p as Priority]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Assign To</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => set('assigned_to', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Unassigned —</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set('due_date', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {saving ? 'Creating…' : 'Create Ticket'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-slate-300 text-slate-700 font-medium px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
