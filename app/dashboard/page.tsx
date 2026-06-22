'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDateTime } from '@/lib/utils';
import type { Status, Priority } from '@/lib/utils';
import Link from 'next/link';

interface Stats {
  total: string; open: string; in_progress: string; resolved: string; closed: string;
}
interface ByPriority { priority: string; count: string }
interface RecentTicket {
  id: number; ticket_number: string; title: string; status: string;
  priority: string; created_at: string; category_name: string; assigned_name: string;
}

const statCards = [
  { key: 'total', label: 'Total Tickets', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { key: 'open', label: 'Open', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  { key: 'in_progress', label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { key: 'resolved', label: 'Resolved', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [byPriority, setByPriority] = useState<ByPriority[]>([]);
  const [recent, setRecent] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.counts);
        setByPriority(d.byPriority);
        setRecent(d.recent);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <Link
            href="/tickets/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Ticket
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.key} className={`${card.bg} border ${card.border} rounded-xl p-4`}>
              <div className={`text-3xl font-bold ${card.text}`}>
                {stats?.[card.key as keyof Stats] ?? 0}
              </div>
              <div className="text-sm text-slate-600 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

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
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400 font-mono">{t.ticket_number}</div>
                      <div className="text-sm font-medium text-slate-900 truncate">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(t.created_at)}</div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status as Status]}`}>
                      {STATUS_LABELS[t.status as Status] ?? t.status}
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
