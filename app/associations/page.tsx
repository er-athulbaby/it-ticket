'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface Association { id: number; name: string; email: string | null; created_at: string }

export default function AssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');

  async function load() {
    const res = await fetch('/api/associations');
    setAssociations(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setSaving(true);
    const res = await fetch('/api/associations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to add');
      return;
    }
    setName(''); setEmail('');
    await load();
  }

  async function handleDelete(id: number, assocName: string) {
    if (!window.confirm(`Delete "${assocName}"? Tickets linked to this association will lose the requester reference.`)) return;
    await fetch(`/api/associations/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveEmail(id: number) {
    await fetch(`/api/associations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editEmail }),
    });
    setEditingId(null);
    await load();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Associations / Federations</h1>

        {/* Add form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Add Association / Federation</h2>
          <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
            <input
              type="text"
              required
              placeholder="Association or federation name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-40 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              placeholder="Contact email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-40 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Loading…</div>
          ) : associations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <div className="text-3xl mb-2">🏢</div>
              <div className="text-sm">No associations yet</div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {associations.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{a.name}</div>
                    {editingId === a.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input type="email" autoFocus value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Contact email" className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        <button onClick={() => saveEmail(a.id)} className="text-xs text-indigo-600 font-medium hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(a.id); setEditEmail(a.email || ''); }}
                        className="text-xs text-slate-400 hover:text-indigo-600 mt-0.5">
                        {a.email || '+ Add contact email'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors flex-shrink-0"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
