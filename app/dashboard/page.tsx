'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PRIORITY_COLORS, PRIORITY_LABELS, formatDateTime } from '@/lib/utils';
import type { Priority } from '@/lib/utils';
import Link from 'next/link';
import { useStatuses, statusColor, statusLabel } from '@/lib/useStatuses';
import type { TicketStatus } from '@/lib/useStatuses';
import { useSession } from 'next-auth/react';

interface StatusCount { status: string; count: string; }
interface ByPriority { priority: string; count: string; }
interface RecentTicket {
  id: number; ticket_number: string; title: string; status: string;
  priority: string; created_at: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const isViewer = (session?.user as { role?: string })?.role === 'viewer';
  const statuses = useStatuses();
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [byPriority, setByPriority] = useState<ByPriority[]>([]);
  const [recent, setRecent] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setTotal(d.total);
        setStatusCounts(d.statusCounts);
        setByPriority(d.byPriority);
        setRecent(d.recent);
        setLoading(false);
      });
  }, []);

  function countFor(slug: string) {
    return parseInt(statusCounts.find((s) => s.status === slug)?.count ?? '0');
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-48 text-slate-400">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          {!isViewer && (
            <Link href="/tickets/new" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + New Ticket
            </Link>
          )}
        </div>

        {/* Total card */}
        <Link href="/tickets"
          className="flex items-center justify-between bg-indigo-600 text-white rounded-xl px-6 py-4 hover:bg-indigo-700 hover:shadow-lg transition-all">
          <div>
            <div className="text-4xl font-bold">{total}</div>
            <div className="text-indigo-200 text-sm mt-0.5">Total Tickets</div>
          </div>
          <span className="text-indigo-200 text-sm">View all →</span>
        </Link>

        {/* Per-status cards */}
        {statuses.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {statuses.map((s: TicketStatus) => {
              const count = countFor(s.slug);
              return (
                <Link key={s.slug} href={`/tickets?status=${s.slug}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 hover:scale-[1.02] transition-all">
                  <div className="text-3xl font-bold text-slate-800">{count}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color_class}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">View →</div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Priority breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Open by Priority</h2>
            {byPriority.length === 0 ? (
              <p className="text-sm text-slate-400">No open tickets</p>
            ) : (
              <div className="space-y-2">
                {byPriority.map((p) => (
                  <div key={p.priority} className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[p.priority as Priority]}`}>
                      {PRIORITY_LABELS[p.priority as Priority] ?? p.priority}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent tickets */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Tickets</h2>
              <Link href="/tickets" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400">No tickets yet</p>
            ) : (
              <div className="space-y-3">
                {recent.map((t) => (
                  <Link key={t.id} href={`/tickets/${t.id}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400 font-mono">{t.ticket_number}</div>
                      <div className="text-sm font-medium text-slate-900 truncate">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(t.created_at)}</div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(t.status, statuses)}`}>
                      {statusLabel(t.status, statuses)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
