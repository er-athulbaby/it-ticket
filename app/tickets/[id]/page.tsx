'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITIES, formatDateTime, formatDate, formatFileSize } from '@/lib/utils';
import type { Priority } from '@/lib/utils';
import { useStatuses, statusColor, statusLabel } from '@/lib/useStatuses';

interface Ticket {
  id: number; ticket_number: string; title: string; description: string;
  status: string; priority: string; category_id: number | null; assigned_to: number | null;
  due_date: string | null; created_at: string; updated_at: string;
  category_name: string | null; assigned_name: string | null; creator_name: string | null;
  requester_id: number | null; requester_name: string | null; requester_department: string | null;
  association_id: number | null; association_name: string | null;
}
interface Note { id: number; note: string; admin_name: string; created_at: string }
interface Attachment { id: number; filename: string; original_name: string; file_size: number; mime_type: string; created_at: string; admin_name: string; }
interface HistoryItem { id: number; action: string; old_value: string | null; new_value: string | null; admin_name: string; created_at: string; }
interface Category { id: number; name: string; }
interface Admin { id: number; name: string; }
interface Staff { id: number; name: string; department: string | null; }
interface Association { id: number; name: string; }

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const statuses = useStatuses();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [associationList, setAssociationList] = useState<Association[]>([]);
  const [editRequesterType, setEditRequesterType] = useState<'staff' | 'association'>('staff');
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: '', category_id: '', assigned_to: '', due_date: '', requester_id: '', association_id: '' });
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/tickets/${id}`);
    if (!res.ok) { router.push('/tickets'); return; }
    const data = await res.json();
    setTicket(data.ticket);
    setNotes(data.notes);
    setAttachments(data.attachments);
    setHistory(data.history);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function openEdit() {
    if (!ticket) return;
    const type = ticket.association_id ? 'association' : 'staff';
    setEditRequesterType(type);
    setEditForm({
      title: ticket.title,
      description: ticket.description ?? '',
      priority: ticket.priority,
      category_id: ticket.category_id ? String(ticket.category_id) : '',
      assigned_to: ticket.assigned_to ? String(ticket.assigned_to) : '',
      due_date: ticket.due_date ? ticket.due_date.slice(0, 10) : '',
      requester_id: ticket.requester_id ? String(ticket.requester_id) : '',
      association_id: ticket.association_id ? String(ticket.association_id) : '',
    });
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/staff').then((r) => r.json()),
      fetch('/api/associations').then((r) => r.json()),
    ]).then(([cats, adms, stf, assocs]) => {
      setCategories(cats); setAdmins(adms); setStaffList(stf); setAssociationList(assocs);
    });
    setShowEdit(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        category_id: editForm.category_id || null,
        assigned_to: editForm.assigned_to || null,
        due_date: editForm.due_date || null,
        requester_id: editRequesterType === 'staff' ? (editForm.requester_id || null) : null,
        association_id: editRequesterType === 'association' ? (editForm.association_id || null) : null,
      }),
    });
    setEditSaving(false);
    setShowEdit(false);
    await load();
  }

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
    setSaving(false);
  }

  async function addNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    await fetch(`/api/tickets/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setNote('');
    await load();
    setAddingNote(false);
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    await fetch(`/api/tickets/${id}/attachments`, { method: 'POST', body: fd });
    await load();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deleteTicket() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
    router.push('/tickets');
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-48 text-slate-400">Loading…</div></AppLayout>;
  if (!ticket) return null;

  const deptGroups = staffList.reduce<Record<string, Staff[]>>((acc, s) => {
    const dept = s.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(s);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-2">← Back to Tickets</button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-slate-400">{ticket.ticket_number}</span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{ticket.title}</h1>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={openEdit}
                className="text-indigo-600 hover:text-indigo-800 text-sm border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                Edit
              </button>
              <button onClick={deleteTicket}
                className="text-red-500 hover:text-red-700 text-sm border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="font-bold text-slate-900 text-lg mb-4">Edit Ticket</h2>
              <form onSubmit={saveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority <span className="text-red-500">*</span></label>
                    <select required value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p as Priority]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                    <select value={editForm.category_id} onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— None —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Assigned To</label>
                    <select value={editForm.assigned_to} onChange={(e) => setEditForm((f) => ({ ...f, assigned_to: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Unassigned —</option>
                      {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                    <input type="date" value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Requested By</label>
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden mb-2 w-fit">
                    <button type="button"
                      onClick={() => { setEditRequesterType('staff'); setEditForm((f) => ({ ...f, association_id: '' })); }}
                      className={`px-3 py-1 text-sm font-medium transition-colors ${editRequesterType === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      Staff
                    </button>
                    <button type="button"
                      onClick={() => { setEditRequesterType('association'); setEditForm((f) => ({ ...f, requester_id: '' })); }}
                      className={`px-3 py-1 text-sm font-medium border-l border-slate-300 transition-colors ${editRequesterType === 'association' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      Association / Federation
                    </button>
                  </div>
                  {editRequesterType === 'staff' ? (
                    <select value={editForm.requester_id} onChange={(e) => setEditForm((f) => ({ ...f, requester_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— None —</option>
                      {Object.entries(deptGroups).map(([dept, members]) => (
                        <optgroup key={dept} label={dept}>
                          {members.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <select value={editForm.association_id} onChange={(e) => setEditForm((f) => ({ ...f, association_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— None —</option>
                      {associationList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={editSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setShowEdit(false)}
                    className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Description</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description || <span className="text-slate-400 italic">No description</span>}</p>
            </div>

            {/* Notes */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Notes ({notes.length})</h2>
              <div className="space-y-3 mb-4">
                {notes.map((n) => (
                  <div key={n.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-700">{n.admin_name}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                <button onClick={addNote} disabled={addingNote || !note.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {addingNote ? 'Adding…' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Attachments ({attachments.length})</h2>
              {attachments.length > 0 && (
                <div className="space-y-2 mb-4">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{a.original_name}</div>
                        <div className="text-xs text-slate-500">{formatFileSize(a.file_size)} · {a.admin_name}</div>
                      </div>
                      <a href={`/uploads/${id}/${a.filename}`} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium ml-3 flex-shrink-0">Download</a>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <input ref={fileRef} type="file" onChange={uploadFile} className="hidden" id="file-upload" />
                <label htmlFor="file-upload"
                  className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  {uploading ? 'Uploading…' : '+ Attach File'}
                </label>
                <span className="text-xs text-slate-400 ml-2">Max 10 MB</span>
              </div>
            </div>

            {/* History */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Activity</h2>
              {history.length === 0 ? <p className="text-sm text-slate-400">No activity yet</p> : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-slate-700">{h.admin_name}</span>{' '}
                        {h.action === 'status_changed' && <span className="text-slate-600">changed status from <b>{h.old_value}</b> to <b>{h.new_value}</b></span>}
                        {h.action === 'created' && <span className="text-slate-600">created this ticket</span>}
                        {h.action === 'assigned' && <span className="text-slate-600">assigned the ticket</span>}
                        <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(h.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status</h3>
              <div className="space-y-1.5">
                {statuses.map((s) => (
                  <button key={s.slug} disabled={saving || ticket.status === s.slug} onClick={() => updateStatus(s.slug)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors font-medium ${
                      ticket.status === s.slug ? s.color_class + ' ring-1 ring-current' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</h3>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Priority</div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[ticket.priority as Priority]}`}>
                  {PRIORITY_LABELS[ticket.priority as Priority]}
                </span>
              </div>
              <div><div className="text-xs text-slate-400 mb-0.5">Category</div><div className="text-sm text-slate-700">{ticket.category_name ?? '—'}</div></div>
              <div><div className="text-xs text-slate-400 mb-0.5">Assigned To</div><div className="text-sm text-slate-700">{ticket.assigned_name ?? 'Unassigned'}</div></div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Requested By</div>
                {ticket.association_id ? (
                  <div className="text-sm text-slate-700">
                    {ticket.association_name ?? '—'}
                    <span className="text-xs text-slate-400 ml-1">(Association)</span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700">
                    {ticket.requester_name ?? '—'}
                    {ticket.requester_department && <span className="text-xs text-slate-400 ml-1">({ticket.requester_department})</span>}
                  </div>
                )}
              </div>
              <div><div className="text-xs text-slate-400 mb-0.5">Created By</div><div className="text-sm text-slate-700">{ticket.creator_name ?? '—'}</div></div>
              {ticket.due_date && <div><div className="text-xs text-slate-400 mb-0.5">Due Date</div><div className="text-sm text-slate-700">{formatDate(ticket.due_date)}</div></div>}
              <div><div className="text-xs text-slate-400 mb-0.5">Created</div><div className="text-sm text-slate-700">{formatDateTime(ticket.created_at)}</div></div>
              <div><div className="text-xs text-slate-400 mb-0.5">Last Updated</div><div className="text-sm text-slate-700">{formatDateTime(ticket.updated_at)}</div></div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
