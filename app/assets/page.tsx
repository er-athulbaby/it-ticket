'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';

interface AssetCategory { id: number; name: string; color: string }

const MAKES = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Samsung', 'LG', 'Cisco', 'TP-Link', 'Canon', 'Epson', 'Other'];
const OTHER = '__other__';

const CONDITIONS = ['new', 'good', 'fair', 'poor', 'retired'];

const CONDITION_STYLES: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-amber-100 text-amber-700',
  poor: 'bg-red-100 text-red-700',
  retired: 'bg-slate-100 text-slate-500',
};

interface Asset {
  id: number; asset_tag: string | null;
  make: string | null; vendor: string | null; model: string | null; serial_no: string | null;
  fru_part_no: string | null; condition: string; unit_price: number | null;
  purchase_date: string | null; warranty_expiry: string | null;
  notes: string | null; created_at: string; category_id: number | null;
  category_name: string | null; category_color: string | null;
  assigned_to_name: string | null; assigned_to_type: string | null;
  current_assigned_date: string | null;
}

const emptyForm = {
  category_id: '', asset_tag: '', make: '', vendor: '', model: '',
  serial_no: '', fru_part_no: '', condition: 'good', unit_price: '',
  purchase_date: '', warranty_expiry: '', notes: '',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [condFilter, setCondFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [makeCustom, setMakeCustom] = useState(false);
  const [modelCustom, setModelCustom] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (condFilter) params.set('condition', condFilter);
    if (catFilter) params.set('category', catFilter);
    const res = await fetch(`/api/assets?${params}`);
    setAssets(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/asset-categories').then(r => r.json()).then(setCategories);
  }, []);

  useEffect(() => { load(); }, [search, condFilter, catFilter]); // eslint-disable-line

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
      setMakeCustom(false); setModelCustom(false);
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

  const grouped = assets.reduce<Record<string, { count: number; color: string }>>((acc, a) => {
    const key = a.category_name || 'Uncategorised';
    if (!acc[key]) acc[key] = { count: 0, color: a.category_color || '#94a3b8' };
    acc[key].count++;
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
          <button onClick={() => { setShowForm(true); setForm(emptyForm); setMakeCustom(false); setModelCustom(false); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Asset
          </button>
        </div>

        {/* Summary chips */}
        {Object.keys(grouped).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(grouped).map(([name, { count, color }]) => (
              <span key={name}
                className="text-xs px-3 py-1.5 rounded-full border font-medium bg-white text-slate-600 border-slate-200 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                {name} · {count}
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="search" placeholder="Search tag, make, model, serial…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
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
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.category_color || '#94a3b8' }} />
                          <div>
                            <div className="font-medium text-slate-900">
                              {[a.make, a.model].filter(Boolean).join(' ') || a.category_name || 'Asset'}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                              {a.asset_tag && <span className="font-mono">{a.asset_tag}</span>}
                              {a.asset_tag && <span>·</span>}
                              <span>{a.category_name || 'Uncategorised'}</span>
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
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">
                  You need to create at least one category before adding assets.{' '}
                  <Link href="/assets/categories" className="text-indigo-600 font-medium hover:underline">Add a category →</Link>
                </p>
              ) : (
              <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                    <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Select category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
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
                    {makeCustom ? (
                      <input type="text" autoFocus placeholder="Type make" value={form.make}
                        onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                        onBlur={() => { if (!form.make) setMakeCustom(false); }}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : (
                      <select value={MAKES.includes(form.make) ? form.make : ''} onChange={(e) => {
                        if (e.target.value === OTHER) { setMakeCustom(true); setForm((f) => ({ ...f, make: '' })); }
                        else setForm((f) => ({ ...f, make: e.target.value }));
                      }}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="">Select make…</option>
                        {MAKES.map((m) => <option key={m} value={m === 'Other' ? OTHER : m}>{m}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
                    {modelCustom ? (
                      <input type="text" autoFocus placeholder="Type model" value={form.model}
                        onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                        onBlur={() => { if (!form.model) setModelCustom(false); }}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : (
                      <select value={form.model} onChange={(e) => {
                        if (e.target.value === OTHER) { setModelCustom(true); setForm((f) => ({ ...f, model: '' })); }
                        else setForm((f) => ({ ...f, model: e.target.value }));
                      }}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="">Select model…</option>
                        {Array.from(new Set(assets.map((a) => a.model).filter(Boolean))).sort().map((m) => (
                          <option key={m} value={m as string}>{m}</option>
                        ))}
                        <option value={OTHER}>Other (type new)…</option>
                      </select>
                    )}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor / Supplier <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                      placeholder="e.g. Bahrain IT Supplies Co." list="vendor-list"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <datalist id="vendor-list">{Array.from(new Set(assets.map((a) => a.vendor).filter(Boolean))).map((v) => <option key={v} value={v as string} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Price <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                      placeholder="0.00"
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
                <button onClick={save} disabled={saving || !form.category_id}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                  {saving ? 'Saving…' : 'Save Asset'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  Cancel
                </button>
              </div>
              </>
              )}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
