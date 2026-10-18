'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface Consumable {
  id: number; name: string; category: string | null; unit: string;
  quantity: number; low_stock_threshold: number; notes: string | null;
  total_in: number; total_out: number;
}

interface StaffOption { id: number; name: string; department: string | null }

const emptyForm = { name: '', category: '', unit: 'piece', quantity: 0, low_stock_threshold: 5, notes: '' };

export default function ConsumablesPage() {
  const [items, setItems] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Consumable | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [txModal, setTxModal] = useState<Consumable | null>(null);
  const [txForm, setTxForm] = useState({ type: 'in', quantity: 1, notes: '', ticket_id: '', recipientType: 'none', staff_id: '', department: '' });
  const [txSaving, setTxSaving] = useState(false);
  const [txError, setTxError] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  async function load() {
    const res = await fetch('/api/consumables');
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/staff').then((r) => r.json()).then(setStaffOptions);
  }, []);

  const departments = [...new Set(staffOptions.map((s) => s.department).filter(Boolean))].sort() as string[];

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(c: Consumable) {
    setEditing(c);
    setForm({ name: c.name, category: c.category || '', unit: c.unit, quantity: c.quantity, low_stock_threshold: c.low_stock_threshold, notes: c.notes || '' });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/consumables/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await fetch('/api/consumables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setShowForm(false); load();
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this consumable?')) return;
    await fetch(`/api/consumables/${id}`, { method: 'DELETE' });
    load();
  }

  async function submitTransaction() {
    if (!txModal) return;
    setTxSaving(true); setTxError('');
    try {
      const res = await fetch(`/api/consumables/${txModal.id}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_type: txForm.type, quantity: Number(txForm.quantity), notes: txForm.notes,
          ticket_id: txForm.ticket_id ? Number(txForm.ticket_id) : null,
          staff_id: txForm.recipientType === 'staff' && txForm.staff_id ? Number(txForm.staff_id) : null,
          department: txForm.recipientType === 'department' ? txForm.department : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setTxError(d.error || 'Failed'); return; }
      setTxModal(null); setTxForm({ type: 'in', quantity: 1, notes: '', ticket_id: '', recipientType: 'none', staff_id: '', department: '' }); load();
    } finally { setTxSaving(false); }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consumables</h1>
            <p className="text-sm text-slate-500 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} · {items.filter(i => i.quantity <= i.low_stock_threshold).length} low stock</p>
          </div>
          <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Add Item</button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400"><div className="text-4xl mb-2">📦</div><div>No consumables yet</div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">In / Out</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((c) => {
                    const low = c.quantity <= c.low_stock_threshold;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{c.name}</div>
                          <div className="text-xs text-slate-400">{c.category || '—'} · {c.unit}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className={`text-lg font-bold font-variant-numeric ${low ? 'text-red-600' : 'text-slate-800'}`}>{c.quantity}</div>
                          {low && <div className="text-xs text-red-500 font-medium">Low stock ≤{c.low_stock_threshold}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          <span className="text-emerald-600 font-medium">↑{c.total_in}</span>
                          <span className="mx-1">·</span>
                          <span className="text-red-500 font-medium">↓{c.total_out}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setTxModal(c); setTxForm({ type: 'in', quantity: 1, notes: '', ticket_id: '', recipientType: 'none', staff_id: '', department: '' }); }}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium">Stock</button>
                            <button onClick={() => openEdit(c)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                            <button onClick={() => remove(c.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
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

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-5">{editing ? 'Edit Item' : 'Add Consumable'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. HP 85A Toner" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                    <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Select category…</option>
                      <option value="Toner">Toner</option>
                      <option value="Waste Toner">Waste Toner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
                    <select value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {['piece','box','pack','roll','bottle','set'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Quantity</label>
                    <input type="number" min="0" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Low Stock Alert ≤</label>
                    <input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm(f => ({ ...f, low_stock_threshold: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
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

        {/* Stock In/Out Modal */}
        {txModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-1">Stock Movement</h2>
              <p className="text-sm text-slate-500 mb-5">{txModal.name} · Current: <strong>{txModal.quantity} {txModal.unit}</strong></p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  {[{v:'in',l:'Stock In ↑',cls:'bg-emerald-600 text-white'},{v:'out',l:'Stock Out ↓',cls:'bg-red-500 text-white'}].map(({v,l,cls}) => (
                    <button key={v} type="button" onClick={() => setTxForm(f => ({ ...f, type: v }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${txForm.type === v ? cls + ' border-transparent' : 'border-slate-300 text-slate-700'}`}>{l}</button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                  <input type="number" min="1" value={txForm.quantity} onChange={(e) => setTxForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {txForm.type === 'out' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Issued To</label>
                    <div className="flex gap-2 mb-2">
                      {[{v:'none',l:'General'},{v:'staff',l:'Staff'},{v:'department',l:'Department'}].map(({v,l}) => (
                        <button key={v} type="button" onClick={() => setTxForm(f => ({ ...f, recipientType: v }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${txForm.recipientType === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600'}`}>{l}</button>
                      ))}
                    </div>
                    {txForm.recipientType === 'staff' && (
                      <select value={txForm.staff_id} onChange={(e) => setTxForm(f => ({ ...f, staff_id: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="">Select staff…</option>
                        {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ''}</option>)}
                      </select>
                    )}
                    {txForm.recipientType === 'department' && (
                      <input type="text" value={txForm.department} onChange={(e) => setTxForm(f => ({ ...f, department: e.target.value }))}
                        placeholder="e.g. Information Technology" list="consumable-dept-list"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    )}
                    <datalist id="consumable-dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="text" value={txForm.notes} onChange={(e) => setTxForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Used for printer repair"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {txError && <p className="text-sm text-red-600">{txError}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={submitTransaction} disabled={txSaving || txForm.quantity <= 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">{txSaving ? 'Saving…' : 'Confirm'}</button>
                <button onClick={() => { setTxModal(null); setTxError(''); }} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
