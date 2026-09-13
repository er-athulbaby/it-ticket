'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface AssetCategory { id: number; name: string; color: string; created_at: string }

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#ef4444','#f97316','#eab308','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#64748b'];

export default function AssetCategoriesPage() {
  const [cats, setCats] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/asset-categories');
    setCats(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/asset-categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ name: '', color: '#6366f1' });
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this category? Assets in this category will become uncategorised.')) return;
    await fetch('/api/asset-categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Asset Categories</h1>

        {/* Add form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Add Category</h2>
          <div className="flex gap-3 flex-wrap">
            <input type="text" placeholder="Category name" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="flex-1 min-w-40 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-1.5 items-center flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{ background: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`} />
              ))}
            </div>
            <button onClick={save} disabled={saving || !form.name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Loading…</div>
          ) : cats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400">No categories yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cats.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 text-sm font-medium text-slate-800">{c.name}</span>
                  <button onClick={() => remove(c.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
