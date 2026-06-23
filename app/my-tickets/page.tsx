'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import StaffLayout from '@/components/staff/StaffLayout';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '@/lib/utils';

interface Ticket {
  id: number; ticket_number: string; title: string; status: string; priority: string;
  created_at: string; category_name: string | null; assigned_name: string | null;
}

const STATUSES = ['open', 'in_progress', 'on_hold', 'resolved', 'closed'];

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const res = await fetch(`/api/staff-portal/tickets?${params}`);
    if (res.ok) { const d = await res.json(); setTickets(d.tickets); setTotal(d.total); }
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <StaffLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Tickets</h1>
            <p className="text-sm text-slate-500 mt-1">{total} ticket{total !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/my-tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            + New Ticket
          </Link>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap mb-5">
          <button onClick={() => setStatus('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!status ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            All
          </button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🎫</div>
            <p className="font-medium">No tickets yet</p>
            <Link href="/my-tickets/new" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">Submit your first ticket →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link key={t.id} href={`/my-tickets/${t.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{t.ticket_number}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {PRIORITY_LABELS[t.priority as keyof typeof PRIORITY_LABELS]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {t.category_name && <span>📁 {t.category_name}</span>}
                      {t.assigned_name && <span>👤 {t.assigned_name}</span>}
                      <span>{formatDate(t.created_at)}</span>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status as keyof typeof STATUS_COLORS]}`}>
                    {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
