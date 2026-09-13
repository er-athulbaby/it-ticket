'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';

const ASSET_TYPES = [
  'Desktop Computer', 'Laptop', 'Monitor', 'Printer', 'Phone / Mobile',
  'Tablet', 'Server', 'Network Device', 'UPS', 'Keyboard', 'Mouse', 'Other',
];

interface AssetCategory { id: number; name: string; color: string }

const ASSET_TYPE_ICONS: Record<string, string> = {
  'Desktop Computer': '🖥️', 'Laptop': '💻', 'Monitor': '🖥️',
  'Printer': '🖨️', 'Phone / Mobile': '📱', 'Tablet': '📱',
  'Server': '🗄️', 'Network Device': '🔌', 'UPS': '🔋',
  'Keyboard': '⌨️', 'Mouse': '🖱️', 'Other': '📦',
};

const CONDITIONS = ['new', 'good', 'fair', 'poor', 'retired'];

const CONDITION_STYLES: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-amber-100 text-amber-700',
  poor: 'bg-red-100 text-red-700',
  retired: 'bg-slate-100 text-slate-500',
};

interface Asset {
  id: number; asset_tag: string | null; asset_type: string;
  make: string | null; model: string | null; serial_no: string | null;
  fru_part_no: string | null; condition: string;
  purchase_date: string | null; warranty_expiry: string | null;
  notes: string | null; created_at: string; category_id: number | null;
  category_name: string | null; category_color: string | null;
  assigned_to_name: string | null; assigned_to_type: string | null;
  current_assigned_date: string | null;
}

const emptyForm = {
  asset_type: 'Desktop Computer', asset_tag: '', make: '', model: '',
  serial_no: '', fru_part_no: '', condition: 'good',
  purchase_date: '', warranty_expiry: '', notes: '', category_id: '',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [condFilter, setCondFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (condFilter) params.set('condition', condFilter);
    if (catFilter) params.set('category', catFilter);
    const res = await fetch(`/api/assets?${params}`);
    setAssets(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/asset-categories').then(r => r.json()).then(setCategories);
  }, []);

  useEffect(() => { load(); }, [search, typeFilter, condFilter, catFilter]); // eslint-disable-line

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this asset? This will also remove all assignment history.')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    load();
  }

  const grouped = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.asset_type] = (acc[a.asset_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
            <p className="text-sm text-slate-500 mt-0.5">{assets.length} device{assets.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button onClick={() => { setShowForm(true); setForm(emptyForm); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Asset
          </button>
        </div>

        {/* Summary chips */}
        {Object.keys(grouped).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(grouped).map(([type, count]) => (
              <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  typeFilter === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}>
                {ASSET_TYPE_ICONS[type] || '📦'} {type} · {count}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="search" placeholder="Search tag, make, model, serial…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All types</option>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={condFilter} onChange={(e) => setCondFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All conditions</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          {categories.length > 0 && (
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-4xl mb-2">🖥️</div>
              <div>No assets found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serial No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Condition</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned To</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Warranty</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{ASSET_TYPE_ICONS[a.asset_type] || '📦'}</span>
                          <div>
                            <div className="font-medium text-slate-900">
                              {[a.make, a.model].filter(Boolean).join(' ') || a.asset_type}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                              {a.asset_tag && <span className="font-mono">{a.asset_tag}</span>}
                              {a.asset_tag && <span>·</span>}
                              <span>{a.asset_type}</span>
                              {a.category_name && (
                                <span className="inline-flex items-center gap-1">
                                  <span>·</span>
                                  <span className="w-2 h-2 rounded-full inline-block" style={{background: a.category_color || '#6366f1'}} />
                                  <span>{a.category_name}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{a.serial_no || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_STYLES[a.condition] || 'bg-slate-100 text-slate-500'}`}>
                          {a.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {a.assigned_to_name ? (
                          <div>
                            <div className="text-slate-700 font-medium text-xs">{a.assigned_to_name}</div>
                            <div className="text-xs text-slate-400">since {a.current_assigned_date ? new Date(a.current_assigned_date).toLocaleDateString() : '—'}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {a.warranty_expiry ? (
                          <span className={new Date(a.warranty_expiry) < new Date() ? 'text-red-500 font-medium' : ''}>
                            {new Date(a.warranty_expiry).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 justify-end">
                          <Link href={`/assets/${a.id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">View</Link>
                          <button onClick={() => remove(a.id)}
                            className="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Asset Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="font-bold text-slate-900 text-lg mb-5">Add Asset</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Asset Type <span className="text-red-500">*</span></label>
                    <select value={form.asset_type} onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {categories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                    <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">No category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Asset Tag</label>
                    <input type="text" placeholder="e.g. BOC-PC-001" value={form.asset_tag}
                      onChange={(e) => setForm((f) => ({ ...f, asset_tag: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Condition</label>
                    <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Make</label>
                    <input type="text" placeholder="e.g. Dell, HP, Apple" value={form.make}
                      onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
                    <input type="text" placeholder="e.g. Latitude 5540" value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Serial No.</label>
                    <input type="text" value={form.serial_no}
                      onChange={(e) => setForm((f) => ({ ...f, serial_no: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">FRU / Part No.</label>
                    <input type="text" value={form.fru_part_no}
                      onChange={(e) => setForm((f) => ({ ...f, fru_part_no: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase Date</label>
                    <input type="date" value={form.purchase_date}
                      onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Warranty Expiry</label>
                    <input type="date" value={form.warranty_expiry}
                      onChange={(e) => setForm((f) => ({ ...f, warranty_expiry: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                    <textarea rows={3} value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={save} disabled={saving || !form.asset_type}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                  {saving ? 'Saving…' : 'Save Asset'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
