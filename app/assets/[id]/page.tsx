'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';

interface AssetCategory { id: number; name: string; color: string }

const CONDITIONS = ['new', 'good', 'fair', 'poor', 'retired'];

const CONDITION_STYLES: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-amber-100 text-amber-700',
  poor: 'bg-red-100 text-red-700',
  retired: 'bg-slate-100 text-slate-500',
};

interface Asset {
  id: number; asset_tag: string | null; category_id: number | null;
  category_name: string | null; category_color: string | null;
  make: string | null; model: string | null; serial_no: string | null;
  fru_part_no: string | null; condition: string;
  purchase_date: string | null; warranty_expiry: string | null;
  notes: string | null; created_at: string;
  assigned_to_name: string | null; assigned_to_type: string | null;
  current_assignment_id: number | null;
  current_staff_id: number | null; current_association_id: number | null;
  current_assigned_date: string | null; current_assignment_notes: string | null;
  history: AssignmentRow[];
}

interface AssignmentRow {
  id: number; staff_id: number | null; association_id: number | null;
  holder_name: string | null; holder_type: string;
  assigned_date: string; returned_date: string | null;
  assigned_by_name: string | null; notes: string | null;
}

interface StaffRow { id: number; name: string; department: string | null }
interface AssocRow { id: number; name: string }

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [assocs, setAssocs] = useState<AssocRow[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ type: 'staff', staff_id: '', association_id: '', assigned_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [assigning, setAssigning] = useState(false);
  const [returning, setReturning] = useState(false);

  async function load() {
    const res = await fetch(`/api/assets/${id}`);
    if (!res.ok) { router.push('/assets'); return; }
    const data = await res.json();
    setAsset(data);
    setEditForm(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/staff').then((r) => r.json()).then(setStaff);
    fetch('/api/associations').then((r) => r.json()).then(setAssocs);
    fetch('/api/asset-categories').then((r) => r.json()).then(setCategories);
  }, []); // eslint-disable-line

  async function saveEdit() {
    setSaving(true);
    try {
      await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setEditing(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function assign() {
    setAssigning(true);
    try {
      const payload = assignForm.type === 'staff'
        ? { staff_id: parseInt(assignForm.staff_id), assigned_date: assignForm.assigned_date, notes: assignForm.notes }
        : { association_id: parseInt(assignForm.association_id), assigned_date: assignForm.assigned_date, notes: assignForm.notes };
      await fetch(`/api/assets/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setShowAssign(false);
      load();
    } finally {
      setAssigning(false);
    }
  }

  async function returnAsset() {
    if (!confirm('Mark this asset as returned?')) return;
    setReturning(true);
    try {
      await fetch(`/api/assets/${id}/assign`, { method: 'DELETE' });
      load();
    } finally {
      setReturning(false);
    }
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64 text-slate-400">Loading…</div></AppLayout>;
  if (!asset) return null;

  const warrantyExpired = asset.warranty_expiry && new Date(asset.warranty_expiry) < new Date();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/assets" className="hover:text-indigo-600">Assets</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">
            {[asset.make, asset.model].filter(Boolean).join(' ') || asset.category_name || 'Asset'}
          </span>
        </div>

        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: (asset.category_color || '#6366f1') + '1a' }}>
                <span className="w-4 h-4 rounded-full" style={{ background: asset.category_color || '#6366f1' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {[asset.make, asset.model].filter(Boolean).join(' ') || asset.category_name || 'Asset'}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-slate-500">{asset.category_name || 'Uncategorised'}</span>
                  {asset.asset_tag && (
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{asset.asset_tag}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_STYLES[asset.condition] || 'bg-slate-100 text-slate-500'}`}>
                    {asset.condition}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(true); setEditForm(asset); }}
                className="border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50">
                Edit
              </button>
              {asset.assigned_to_name ? (
                <button onClick={returnAsset} disabled={returning}
                  className="border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-medium px-3 py-2 rounded-lg">
                  {returning ? 'Returning…' : 'Mark Returned'}
                </button>
              ) : (
                <button onClick={() => setShowAssign(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
                  Assign
                </button>
              )}
            </div>
          </div>

          {/* Current assignment */}
          {asset.assigned_to_name && (
            <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <span className="text-indigo-500">👤</span>
              <div className="text-sm">
                <span className="font-medium text-indigo-800">{asset.assigned_to_name}</span>
                <span className="text-indigo-600"> · Assigned since {asset.current_assigned_date ? new Date(asset.current_assigned_date).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Device Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {[
              { label: 'Serial No.', value: asset.serial_no, mono: true },
              { label: 'FRU / Part No.', value: asset.fru_part_no, mono: true },
              { label: 'Purchase Date', value: asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : null },
              { label: 'Warranty Expiry', value: asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : null, warn: !!warrantyExpired },
              { label: 'Added', value: new Date(asset.created_at).toLocaleDateString() },
            ].map(({ label, value, mono, warn }) => (
              <div key={label}>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
                <div className={`text-sm ${warn ? 'text-red-600 font-medium' : 'text-slate-700'} ${mono ? 'font-mono' : ''}`}>
                  {value || <span className="text-slate-300">—</span>}
                  {warn && ' (expired)'}
                </div>
              </div>
            ))}
          </div>
          {asset.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Notes</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}
        </div>

        {/* Assignment history */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Assignment History</h2>
          {asset.history.length === 0 ? (
            <p className="text-sm text-slate-400">No assignments yet.</p>
          ) : (
            <div className="space-y-0 divide-y divide-slate-100">
              {asset.history.map((h) => (
                <div key={h.id} className="flex items-start justify-between py-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{h.holder_name || '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(h.assigned_date).toLocaleDateString()}
                      {h.returned_date && ` → ${new Date(h.returned_date).toLocaleDateString()}`}
                      {h.assigned_by_name && ` · by ${h.assigned_by_name}`}
                    </div>
                    {h.notes && <div className="text-xs text-slate-500 mt-0.5 italic">{h.notes}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${h.returned_date ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                    {h.returned_date ? 'returned' : 'current'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-slate-900 text-lg mb-5">Edit Asset</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select value={editForm.category_id || ''} onChange={(e) => setEditForm((f) => ({ ...f, category_id: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {[
                  { key: 'asset_tag', label: 'Asset Tag' },
                  { key: 'make', label: 'Make' },
                  { key: 'model', label: 'Model' },
                  { key: 'serial_no', label: 'Serial No.' },
                  { key: 'fru_part_no', label: 'FRU / Part No.' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                    <input type="text" value={(editForm as Record<string, string>)[key] || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Condition</label>
                  <select value={editForm.condition || 'good'} onChange={(e) => setEditForm((f) => ({ ...f, condition: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase Date</label>
                  <input type="date" value={editForm.purchase_date?.slice(0, 10) || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, purchase_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Warranty Expiry</label>
                  <input type="date" value={editForm.warranty_expiry?.slice(0, 10) || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, warranty_expiry: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea rows={3} value={editForm.notes || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)}
                className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-5">Assign Asset</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Assign to</label>
                <div className="flex gap-3">
                  {['staff', 'association'].map((t) => (
                    <button key={t} type="button"
                      onClick={() => setAssignForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        assignForm.type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}>
                      {t === 'staff' ? '👤 Staff' : '🏢 Association'}
                    </button>
                  ))}
                </div>
              </div>

              {assignForm.type === 'staff' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Staff Member</label>
                  <select value={assignForm.staff_id} onChange={(e) => setAssignForm((f) => ({ ...f, staff_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Select staff —</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Association</label>
                  <select value={assignForm.association_id} onChange={(e) => setAssignForm((f) => ({ ...f, association_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Select association —</option>
                    {assocs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Assigned Date</label>
                <input type="date" value={assignForm.assigned_date}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assigned_date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={assignForm.notes} placeholder="e.g. Replacement for old unit"
                  onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={assign} disabled={assigning || (!assignForm.staff_id && !assignForm.association_id)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                {assigning ? 'Assigning…' : 'Confirm Assignment'}
              </button>
              <button onClick={() => setShowAssign(false)}
                className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
