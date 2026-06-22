'use client';

import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { formatDateTime } from '@/lib/utils';

interface Admin {
  id: number; name: string; email: string; role: string; is_active: boolean; created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ email: string; status: string }[] | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch('/api/users');
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'agent' });
    setShowForm(true);
  }

  function openEdit(u: Admin) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    if (editing) {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, name: form.name, role: form.role, is_active: true, password: form.password || undefined }),
      });
    } else {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function toggleActive(u: Admin) {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, name: u.name, role: u.role, is_active: !u.is_active }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this user?')) return;
    await fetch('/api/users', {
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
    const res = await fetch('/api/users/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImportResult(data.results);
    setImporting(false);
    load();
    if (fileRef.current) fileRef.current.value = '';
  }

  function downloadTemplate() {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { name: 'John Doe', email: 'john@company.com', password: 'Pass@123', role: 'agent' },
      { name: 'Jane Smith', email: 'jane@company.com', password: 'Pass@123', role: 'superadmin' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'users-import-template.xlsx');
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <div className="flex gap-2">
            <div className="relative">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" id="import-file" />
              <label
                htmlFor="import-file"
                className="cursor-pointer border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {importing ? 'Importing…' : 'Import Excel'}
              </label>
            </div>
            <button
              onClick={downloadTemplate}
              className="border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Template
            </button>
            <button
              onClick={openNew}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Import results */}
        {importResult && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Import Results</h3>
              <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600 text-sm">Dismiss</button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {importResult.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={r.status === 'imported' ? 'text-green-600' : 'text-slate-500'}>
                    {r.status === 'imported' ? '✓' : '—'}
                  </span>
                  <span className="text-slate-700">{r.email}</span>
                  <span className="text-slate-400">— {r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-4">{editing ? 'Edit User' : 'New User'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {!editing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                    <input
                      type="email" required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password {editing ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editing}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="agent">Agent</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-4xl mb-2">👥</div>
              <div>No users yet</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{u.name}</span>
                      {!u.is_active && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'superadmin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">{u.email}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Added {formatDateTime(u.created_at)}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(u)} className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded-lg">
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(u)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button onClick={() => remove(u.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          <strong>Excel Import format:</strong> Columns required: <code>name</code>, <code>email</code>. Optional: <code>password</code> (default: HelpDesk@123), <code>role</code> (agent or superadmin). Download the template to get started.
        </div>
      </div>
    </AppLayout>
  );
}
