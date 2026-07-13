'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface Association { id: number; name: string; created_at: string }

export default function AssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to add');
      return;
    }
    setName('');
    await load();
  }

  async function handleDelete(id: number, assocName: string) {
    if (!window.confirm(`Delete "${assocName}"? Tickets linked to this association will lose the requester reference.`)) return;
    await fetch(`/api/associations/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Associations / Federations</h1>

        {/* Add form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Add Association / Federation</h2>
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              required
              placeholder="Association or federation name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <li key={a.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-medium text-slate-800">{a.name}</span>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
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
