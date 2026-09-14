'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface Staff {
  id: number; name: string; department: string | null; email: string | null;
  mobile: string | null; staff_code: string | null; ms_license: string | null;
  association_id: number | null; association_name: string | null;
  is_active: boolean; created_at: string; photo_filename: string | null;
}

interface AssociationOption { id: number; name: string }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ name: string; status: string }[] | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [assocFilter, setAssocFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState<'boc' | 'associations' | 'all'>('boc');
  const [associations, setAssociations] = useState<AssociationOption[]>([]);
  const [form, setForm] = useState({ name: '', department: '', email: '', password: '', mobile: '', association_id: '', ms_license: '', is_active: true });
  const [photoUploading, setPhotoUploading] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<number | null>(null);

  async function load() {
    const res = await fetch('/api/staff');
    setStaff(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/associations').then((r) => r.json()).then(setAssociations);
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', department: '', email: '', password: '', mobile: '', association_id: '', ms_license: '', is_active: true });
    setShowForm(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({
      name: s.name, department: s.department || '', email: s.email || '', password: '',
      mobile: s.mobile || '', association_id: s.association_id ? String(s.association_id) : '', ms_license: s.ms_license || '',
      is_active: s.is_active,
    });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      department: form.department,
      email: form.email.trim() || null,
      password: form.password || undefined,
      mobile: form.mobile.trim() || null,
      association_id: form.association_id ? Number(form.association_id) : null,
      ms_license: form.ms_license.trim() || null,
    };
    if (editing) {
      payload.id = editing.id;
      payload.is_active = form.is_active;
      await fetch('/api/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this staff member?')) return;
    await fetch('/api/staff', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/staff/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImportResult(data.results);
    setImporting(false); load();
    if (fileRef.current) fileRef.current.value = '';
  }

  function triggerPhotoUpload(staffId: number) {
    setPhotoTargetId(staffId);
    photoRef.current?.click();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !photoTargetId) return;
    setPhotoUploading(photoTargetId);
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('staffId', String(photoTargetId));
    await fetch('/api/staff/photo', { method: 'POST', body: fd });
    setPhotoUploading(null);
    setPhotoTargetId(null);
    if (photoRef.current) photoRef.current.value = '';
    load();
  }

  function downloadTemplate() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { name: 'John Doe', department: 'IT', email: 'john.doe@company.com', password: 'password123' },
      { name: 'Jane Smith', department: 'HR', email: 'jane.smith@company.com', password: 'password123' },
      { name: 'Bob Wilson', department: 'Finance', email: '', password: '' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    XLSX.writeFile(wb, 'staff-import-template.xlsx');
  }

  const departments = [...new Set(staff.map((s) => s.department).filter(Boolean))].sort() as string[];

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.staff_code || '').toLowerCase().includes(q);
    const matchesDept = !deptFilter || s.department === deptFilter;
    const matchesAssoc = !assocFilter || String(s.association_id) === assocFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? s.is_active : !s.is_active);
    const matchesOrg = orgFilter === 'all' || (orgFilter === 'boc' ? !s.association_id : !!s.association_id);
    return matchesSearch && matchesDept && matchesAssoc && matchesStatus && matchesOrg;
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {staff.length} staff</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" id="staff-import" />
            <label htmlFor="staff-import" className="cursor-pointer border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              {importing ? 'Importing…' : 'Import Excel'}
            </label>
            <button onClick={downloadTemplate} className="border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Template</button>
            <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">+ Add Staff</button>
          </div>
        </div>

        {/* Hidden photo input */}
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

        {/* Import results */}
        {importResult && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Import Results ({importResult.length} rows)</h3>
              <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600 text-sm">Dismiss</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {importResult.map((r, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">{r.name}</span>
                  <span className="text-slate-400">— {r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="font-bold text-slate-900 text-lg mb-4">{editing ? 'Edit Staff' : 'Add Staff Member'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                  <input type="text" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. IT, HR, Finance" list="dept-list" />
                  <datalist id="dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Association / Federation</label>
                  <select value={form.association_id} onChange={(e) => setForm((f) => ({ ...f, association_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">None (internal BOC staff)</option>
                    {associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile</label>
                  <input type="text" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 33137593" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Microsoft License</label>
                  <input type="text" value={form.ms_license} onChange={(e) => setForm((f) => ({ ...f, ms_license: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Microsoft 365 Business Premium" />
                  {editing?.staff_code && <p className="text-xs text-slate-400 mt-1">Staff ID: <span className="font-mono">{editing.staff_code}</span></p>}
                </div>

                {editing && (
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Active (uncheck to deactivate this staff member)
                  </label>
                )}

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Portal Login (optional)</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="staff@company.com" />
                    <p className="text-xs text-slate-400 mt-1">Leave blank if this staff member does not need login access.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {editing ? 'New Password (leave blank to keep)' : 'Password'}
                    </label>
                    <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="At least 6 characters" minLength={6} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={save} disabled={saving || !form.name.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Org toggle */}
        <div className="flex gap-2">
          {[{v:'boc',l:'BOC Staff'},{v:'associations',l:'Associations'},{v:'all',l:'All'}].map(({v,l}) => (
            <button key={v} onClick={() => setOrgFilter(v as 'boc' | 'associations' | 'all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${orgFilter === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="search" placeholder="Search by name, department, email, staff ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={assocFilter} onChange={(e) => setAssocFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All associations</option>
            {associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-4xl mb-2">👤</div>
              <div>{staff.length === 0 ? 'No staff added yet' : 'No results found'}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department / Association</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mobile</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0 group cursor-pointer" onClick={(e) => { e.stopPropagation(); triggerPhotoUpload(s.id); }}>
                            {s.photo_filename ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/profile/photo?staffId=${s.id}`} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              {photoUploading === s.id ? <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="text-white text-[10px]">📷</span>}
                            </div>
                          </div>
                          <Link href={`/staff/${s.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{s.name}</Link>
                          {s.email && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Portal</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.staff_code || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.department || '—'}
                        {s.association_name && <span className="block text-xs text-indigo-600">{s.association_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.mobile || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 justify-end">
                          <Link href={`/staff/${s.id}`} className="text-sm text-slate-500 hover:text-slate-700 font-medium">View</Link>
                          <button onClick={() => openEdit(s)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                          <button onClick={() => remove(s.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 space-y-1">
          <p><strong>Excel import columns:</strong> <code>name</code> (required), <code>department</code>, <code>email</code>, <code>password</code> — leave email/password blank for staff without portal access.</p>
          <p><strong>Tip:</strong> Click a name or &quot;View&quot; to open their full profile (assets, licenses, tickets, service requests). Click the avatar to upload a photo.</p>
        </div>
      </div>
    </AppLayout>
  );
}
