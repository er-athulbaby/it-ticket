'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface SR {
  id: number; request_number: string; status: string;
  staff_name: string | null; association_name: string | null;
  department: string | null; created_at: string;
  employee_name: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

const emptyForm = {
  staff_id: '', association_id: '',
  employee_name: '', cpr_no: '', department: '', mobile_no: '', tel_no: '', fax_no: '',
  address: '', company: '',
  it_username: '', it_domain_id: '', it_security_group: '', it_membership: '',
  it_access_permissions: '', it_map_drives: '', it_duration: '',
};

interface Recipient { id: number; name: string }

export default function ServiceRequestsPage() {
  const [rows, setRows] = useState<SR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [recipientType, setRecipientType] = useState<'staff' | 'association'>('staff');
  const [staff, setStaff] = useState<Recipient[]>([]);
  const [associations, setAssociations] = useState<Recipient[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    const res = await fetch('/api/service-requests');
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/staff').then(r => r.json()).then(setStaff);
    fetch('/api/associations').then(r => r.json()).then(setAssociations);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const body = { ...form, staff_id: recipientType === 'staff' ? form.staff_id || null : null, association_id: recipientType === 'association' ? form.association_id || null : null };
      const res = await fetch('/api/service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { const sr = await res.json(); setShowForm(false); load(); window.open(`/service-requests/${sr.id}`, '_blank'); }
    } finally { setSaving(false); }
  }

  function f(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.request_number.toLowerCase().includes(q) || (r.staff_name || '').toLowerCase().includes(q) || (r.association_name || '').toLowerCase().includes(q) || (r.department || '').toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">{rows.length} total · {rows.filter(r => r.status === 'pending').length} pending</p>
          </div>
          <button onClick={() => { setForm(emptyForm); setRecipientType('staff'); setShowForm(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ New Request</button>
        </div>

        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by number, name, department…"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400"><div className="text-4xl mb-2">📋</div><div>No service requests</div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SR #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dept / Org</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-indigo-700">{r.request_number}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">{r.employee_name || r.staff_name || r.association_name || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.department || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/service-requests/${r.id}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="font-bold text-slate-900 text-lg mb-5">New Service Request</h2>

              {/* Recipient */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipient Type</label>
                <div className="flex gap-2">
                  {(['staff','association'] as const).map((t) => (
                    <button key={t} onClick={() => setRecipientType(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${recipientType === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-600'}`}>
                      {t === 'staff' ? '👤 Staff' : '🏢 Association'}
                    </button>
                  ))}
                </div>
              </div>

              {recipientType === 'staff' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Staff Member</label>
                  <select value={form.staff_id} onChange={(e) => { f('staff_id', e.target.value); const s = staff.find(x => x.id === Number(e.target.value)); if (s) f('employee_name', s.name); }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Select staff…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Association</label>
                  <select value={form.association_id} onChange={(e) => { f('association_id', e.target.value); const a = associations.find(x => x.id === Number(e.target.value)); if (a) f('employee_name', a.name); }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Select association…</option>
                    {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {[
                  {k:'employee_name',l:'Employee Name',ph:''},
                  {k:'cpr_no',l:'CPR No.',ph:''},
                  {k:'department',l:'Department',ph:''},
                  {k:'mobile_no',l:'Mobile',ph:''},
                  {k:'tel_no',l:'Tel',ph:''},
                  {k:'fax_no',l:'Fax',ph:''},
                  {k:'company',l:'Company',ph:''},
                  {k:'it_username',l:'IT Username',ph:''},
                  {k:'it_domain_id',l:'Domain ID',ph:''},
                  {k:'it_duration',l:'Duration',ph:'e.g. Permanent'},
                ].map(({k,l,ph}) => (
                  <div key={k}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label>
                    <input type="text" value={(form as Record<string,string>)[k]} onChange={(e) => f(k, e.target.value)} placeholder={ph}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                  <input type="text" value={form.address} onChange={(e) => f('address', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={save} disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">{saving ? 'Creating…' : 'Create & Open'}</button>
                <button onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
