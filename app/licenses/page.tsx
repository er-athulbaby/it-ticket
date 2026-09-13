'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface License {
  id: number; name: string; vendor: string | null; product: string | null;
  license_key: string | null; seats: number | null;
  purchase_date: string | null; expiry_date: string | null; notes: string | null;
}

function expiryStatus(expiry: string | null): { label: string; cls: string } {
  if (!expiry) return { label: 'No Expiry', cls: 'bg-slate-100 text-slate-500' };
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
  if (days <= 30) return { label: `Expires in ${days}d`, cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' };
}

const emptyForm = { name: '', vendor: '', product: '', license_key: '', seats: 1, purchase_date: '', expiry_date: '', notes: '' };

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState<number | null>(null);

  async function load() {
    const res = await fetch('/api/licenses');
    setLicenses(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(l: License) {
    setEditing(l);
    setForm({ name: l.name, vendor: l.vendor || '', product: l.product || '', license_key: l.license_key || '', seats: l.seats || 1, purchase_date: l.purchase_date?.slice(0,10) || '', expiry_date: l.expiry_date?.slice(0,10) || '', notes: l.notes || '' });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/licenses/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await fetch('/api/licenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setShowForm(false); load();
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this license?')) return;
    await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
    load();
  }

  const expired = licenses.filter(l => l.expiry_date && new Date(l.expiry_date) < new Date()).length;
  const expiring = licenses.filter(l => { if (!l.expiry_date) return false; const d = Math.floor((new Date(l.expiry_date).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 30; }).length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Licenses</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {licenses.length} total
              {expired > 0 && <span className="text-red-600 font-medium"> · {expired} expired</span>}
              {expiring > 0 && <span className="text-amber-600 font-medium"> · {expiring} expiring soon</span>}
            </p>
          </div>
          <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Add License</button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400"><div className="text-4xl mb-2">🔑</div><div>No licenses yet</div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Software</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seats</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {licenses.map((l) => {
                    const status = expiryStatus(l.expiry_date);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{l.name}</div>
                          <div className="text-xs text-slate-400">{[l.vendor, l.product].filter(Boolean).join(' · ') || '—'}</div>
                          {l.license_key && (
                            <div className="text-xs mt-1 flex items-center gap-1">
                              <span className="font-mono text-slate-500">{showKey === l.id ? l.license_key : '••••••••••••'}</span>
                              <button onClick={() => setShowKey(showKey === l.id ? null : l.id)} className="text-indigo-500 hover:text-indigo-700 text-xs underline">{showKey === l.id ? 'hide' : 'show'}</button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-variant-numeric">{l.seats ?? '—'}</td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">{l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span></td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-3 justify-end">
                            <button onClick={() => openEdit(l)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                            <button onClick={() => remove(l.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="font-bold text-slate-900 text-lg mb-5">{editing ? 'Edit License' : 'Add License'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Microsoft Office 365"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[{k:'vendor',l:'Vendor',ph:'e.g. Microsoft'},{k:'product',l:'Product',ph:'e.g. Office 365'}].map(({k,l,ph}) => (
                    <div key={k}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label>
                      <input type="text" value={(form as Record<string,unknown>)[k] as string} onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Seats</label>
                    <input type="number" min="1" value={form.seats} onChange={(e) => setForm(f => ({ ...f, seats: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase Date</label>
                    <input type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                    <input type="date" value={form.expiry_date} onChange={(e) => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">License Key</label>
                  <input type="text" value={form.license_key} onChange={(e) => setForm(f => ({ ...f, license_key: e.target.value }))} placeholder="XXXXX-XXXXX-XXXXX"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={save} disabled={saving || !form.name.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
