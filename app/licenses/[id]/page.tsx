'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

interface Assignment {
  id: number; staff_id: number | null; association_id: number | null;
  staff_name: string | null; association_name: string | null;
  assigned_date: string; returned_date: string | null; assigned_by_name: string | null;
}
interface AuditEntry { id: number; action: string; changes: Record<string, { old: unknown; new: unknown }> | null; admin_name: string | null; created_at: string }
interface LicenseDetail {
  id: number; name: string; vendor: string | null; software_type: string | null;
  seats: number | null; expiry_date: string | null;
  assignments: Assignment[]; auditHistory: AuditEntry[];
}
interface StaffOption { id: number; name: string; department: string | null }
interface AssocOption { id: number; name: string }

export default function LicenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [license, setLicense] = useState<LicenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [assocOptions, setAssocOptions] = useState<AssocOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Set<number>>(new Set());
  const [selectedAssoc, setSelectedAssoc] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function load() {
    const r = await fetch(`/api/licenses/${id}`);
    if (!r.ok) { router.push('/licenses'); return; }
    setLicense(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function openAssign() {
    const [sr, ar] = await Promise.all([fetch('/api/staff'), fetch('/api/associations')]);
    setStaffOptions(await sr.json());
    setAssocOptions(await ar.json());
    setSelectedStaff(new Set()); setSelectedAssoc(new Set()); setSearch('');
    setShowAssign(true);
  }

  function toggleStaff(sid: number) {
    setSelectedStaff((prev) => { const next = new Set(prev); next.has(sid) ? next.delete(sid) : next.add(sid); return next; });
  }
  function toggleAssoc(aid: number) {
    setSelectedAssoc((prev) => { const next = new Set(prev); next.has(aid) ? next.delete(aid) : next.add(aid); return next; });
  }

  async function confirmBulkAssign() {
    setAssigning(true);
    try {
      await fetch(`/api/licenses/${id}/bulk-assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_ids: [...selectedStaff], association_ids: [...selectedAssoc] }),
      });
      setShowAssign(false);
      load();
    } finally { setAssigning(false); }
  }

  async function revoke(a: Assignment) {
    if (!confirm(`Revoke this license from ${a.staff_name || a.association_name}?`)) return;
    await fetch(`/api/licenses/${id}/assign`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: a.staff_id || undefined, association_id: a.association_id || undefined }),
    });
    load();
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64 text-slate-400">Loading…</div></AppLayout>;
  if (!license) return null;

  const currentAssignments = license.assignments.filter((a) => !a.returned_date);
  const alreadyAssignedStaffIds = new Set(currentAssignments.map((a) => a.staff_id).filter(Boolean));
  const alreadyAssignedAssocIds = new Set(currentAssignments.map((a) => a.association_id).filter(Boolean));

  const filteredStaff = staffOptions.filter((s) => !alreadyAssignedStaffIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredAssoc = assocOptions.filter((a) => !alreadyAssignedAssocIds.has(a.id) && a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href="/licenses" className="text-sm text-slate-500 hover:text-slate-700">← Licenses</Link>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{license.name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{[license.vendor, license.software_type].filter(Boolean).join(' · ') || '—'}</p>
              <p className="text-sm text-slate-500 mt-1">{currentAssignments.length} / {license.seats ?? '∞'} seats used</p>
            </div>
            <button onClick={openAssign} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Assign</button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Current Assignments {currentAssignments.length > 0 && <span className="text-slate-400 font-normal">({currentAssignments.length})</span>}</h2>
          {currentAssignments.length === 0 ? (
            <p className="text-sm text-slate-400">No one currently assigned.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {a.staff_id ? <Link href={`/staff/${a.staff_id}`} className="hover:text-indigo-600">{a.staff_name}</Link> : a.association_name}
                      {a.association_id && <span className="text-xs text-indigo-500 ml-1.5">(Association)</span>}
                    </div>
                    <div className="text-xs text-slate-400">since {new Date(a.assigned_date).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => revoke(a)} className="text-xs text-red-500 hover:text-red-700 font-medium">Revoke</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {license.auditHistory.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Change History</h2>
            <div className="divide-y divide-slate-100">
              {license.auditHistory.map((h) => (
                <div key={h.id} className="py-2.5 text-sm">
                  <div className="text-slate-700">
                    <span className="font-medium capitalize">{h.action}</span> by {h.admin_name || 'system'}
                    <span className="text-xs text-slate-400 ml-2">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  {h.changes && (
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      {Object.entries(h.changes).map(([field, { old: oldV, new: newV }]) => (
                        <div key={field}>{field}: <span className="line-through text-slate-400">{String(oldV ?? '—')}</span> → <span className="text-slate-700">{String(newV ?? '—')}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
            <h2 className="font-bold text-slate-900 text-lg mb-3">Assign "{license.name}"</h2>
            <input type="text" placeholder="Search staff or associations…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" />
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredAssoc.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky top-0">Associations</div>
              )}
              {filteredAssoc.map((a) => (
                <label key={`a-${a.id}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedAssoc.has(a.id)} onChange={() => toggleAssoc(a.id)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  {a.name}
                </label>
              ))}
              {filteredStaff.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky top-0">Staff</div>
              )}
              {filteredStaff.map((s) => (
                <label key={`s-${s.id}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedStaff.has(s.id)} onChange={() => toggleStaff(s.id)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  {s.name}{s.department ? <span className="text-slate-400"> · {s.department}</span> : ''}
                </label>
              ))}
              {filteredStaff.length === 0 && filteredAssoc.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-slate-400">No matches</div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={confirmBulkAssign} disabled={assigning || (selectedStaff.size === 0 && selectedAssoc.size === 0)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
                {assigning ? 'Assigning…' : `Assign Selected (${selectedStaff.size + selectedAssoc.size})`}
              </button>
              <button onClick={() => setShowAssign(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
