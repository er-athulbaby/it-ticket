'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface AuditRow {
  id: number; entity_type: string; entity_id: number | null; entity_label: string | null;
  action: string; changes: Record<string, { old: unknown; new: unknown }> | null;
  admin_name: string | null; created_at: string;
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
};

const ENTITY_LABELS: Record<string, string> = {
  asset: 'Asset', asset_category: 'Asset Category', asset_assignment: 'Asset Assignment',
  license: 'License', license_assignment: 'License Assignment',
  consumable: 'Consumable', consumable_transaction: 'Consumable Transaction',
  staff: 'Staff', association: 'Association', ticket: 'Ticket', category: 'Ticket Category',
  service_request: 'Service Request',
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityFilter) params.set('entity_type', entityFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (search) params.set('search', search);
    params.set('page', String(page));
    const res = await fetch(`/api/audit-log?${params}`);
    const data = await res.json();
    setRows(data.rows); setTotal(data.total); setEntityTypes(data.entityTypes);
    setLoading(false);
  }

  useEffect(() => { load(); }, [entityFilter, actionFilter, search, page]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} change{total !== 1 ? 's' : ''} recorded</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <input type="search" placeholder="Search by item or admin…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-48 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All types</option>
            {entityTypes.map((t) => <option key={t} value={t}>{ENTITY_LABELS[t] || t}</option>)}
          </select>
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All actions</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400"><div className="text-4xl mb-2">📜</div><div>No changes recorded yet</div></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((r) => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ACTION_STYLES[r.action] || 'bg-slate-100 text-slate-500'}`}>{r.action}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{ENTITY_LABELS[r.entity_type] || r.entity_type}</span>
                      <span className="text-sm text-slate-800 truncate">{r.entity_label || `#${r.entity_id}`}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500">
                      <span>{r.admin_name || 'system'}</span>
                      <span className="text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                      {r.changes && <span className="text-slate-400">{expanded === r.id ? '▾' : '▸'}</span>}
                    </div>
                  </div>
                  {expanded === r.id && r.changes && (
                    <div className="mt-2 ml-1 pl-4 border-l-2 border-slate-100 space-y-0.5 text-xs">
                      {Object.entries(r.changes).map(([field, { old: oldV, new: newV }]) => (
                        <div key={field} className="text-slate-600">
                          <span className="font-medium">{field}</span>: <span className="line-through text-slate-400">{String(oldV ?? '—')}</span> → <span className="text-slate-800">{String(newV ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
