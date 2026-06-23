'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDateTime } from '@/lib/utils';
import type { Status, Priority } from '@/lib/utils';

interface Ticket {
  id: number; ticket_number: string; title: string; status: string;
  priority: string; created_at: string; due_date: string | null;
  category_name: string | null; assigned_name: string | null;
  requester_name: string | null; requester_department: string | null;
}

const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);

    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, status, priority]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const totalPages = Math.ceil(total / 20);

  function exportExcel() {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    window.location.href = `/api/export?${params}`;
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Export Excel
            </button>
            <Link
              href="/tickets/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Ticket
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search title or ticket #…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.slice(1).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s as Status]}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.slice(1).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p as Priority]}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-4xl mb-2">🎫</div>
              <div>No tickets found</div>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-slate-100">
                {tickets.map((t) => (
                  <Link key={t.id} href={`/tickets/${t.id}`} className="block p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400 font-mono">{t.ticket_number}</div>
                        <div className="text-sm font-medium text-slate-900 truncate">{t.title}</div>
                        {t.requester_name && <div className="text-xs text-indigo-600 mt-0.5">Requested by {t.requester_name}</div>}
                        <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(t.created_at)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status as Status]}`}>
                          {STATUS_LABELS[t.status as Status]}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority as Priority]}`}>
                          {PRIORITY_LABELS[t.priority as Priority]}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requested By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        <Link href={`/tickets/${t.id}`} className="hover:text-indigo-600">{t.ticket_number}</Link>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link href={`/tickets/${t.id}`} className="font-medium text-slate-900 hover:text-indigo-600 line-clamp-1">
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.requester_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status as Status]}`}>
                          {STATUS_LABELS[t.status as Status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority as Priority]}`}>
                          {PRIORITY_LABELS[t.priority as Priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.assigned_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{total} tickets total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
