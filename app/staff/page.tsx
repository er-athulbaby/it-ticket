'use client';

import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface Staff {
  id: number; name: string; department: string | null; is_active: boolean; created_at: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ name: string; status: string }[] | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', department: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch('/api/staff');
    setStaff(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', department: '' });
    setShowForm(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({ name: s.name, department: s.department || '' });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    if (editing) {
      await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, name: form.name, department: form.department, is_active: editing.is_active }),
      });
    } else {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this staff member?')) return;
    await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/staff/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImportResult(data.results);
    setImporting(false);
    load();
    if (fileRef.current) fileRef.current.value = '';
  }

  function downloadTemplate() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { name: 'John Doe', department: 'IT' },
      { name: 'Jane Smith', department: 'HR' },
      { name: 'Bob Wilson', department: 'Finance' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    XLSX.writeFile(wb, 'staff-import-template.xlsx');
  }

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const departments = [...new Set(staff.map((s) => s.department).filter(Boolean))].sort();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" id="staff-import" />
            <label htmlFor="staff-import" className="cursor-pointer border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              {importing ? 'Importing…' : 'Import Excel'}
            </label>
            <button onClick={downloadTemplate} className="border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Template
            </button>
            <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + Add Staff
            </button>
          </div>
        </div>

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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-4">{editing ? 'Edit Staff' : 'Add Staff Member'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. IT, HR, Finance"
                    list="dept-list"
                  />
                  <datalist id="dept-list">
                    {departments.map((d) => <option key={d} value={d!} />)}
                  </datalist>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={save} disabled={saving || !form.name.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-4xl mb-2">👤</div>
              <div>{staff.length === 0 ? 'No staff added yet' : 'No results found'}</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{s.name}</div>
                    {s.department && <div className="text-sm text-slate-500">{s.department}</div>}
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button onClick={() => remove(s.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          <strong>Excel import format:</strong> Columns: <code>name</code> (required), <code>department</code> (optional). Download the template to get started.
        </div>
      </div>
    </AppLayout>
  );
}
