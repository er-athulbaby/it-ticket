'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import StaffLayout from '@/components/staff/StaffLayout';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDate, formatDateTime } from '@/lib/utils';

interface Ticket {
  id: number; ticket_number: string; title: string; description: string; status: string; priority: string;
  created_at: string; category_name: string | null; assigned_name: string | null;
}
interface Note { id: number; note: string; author_name: string; author_type: string; created_at: string; }

export default function StaffTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff-portal/tickets/${id}`);
    if (res.ok) { const d = await res.json(); setTicket(d.ticket); setNotes(d.notes); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSending(true);
    const res = await fetch(`/api/staff-portal/tickets/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteText }),
    });
    if (res.ok) { setNoteText(''); await load(); }
    setSending(false);
  }

  if (loading) return <StaffLayout><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div></StaffLayout>;
  if (!ticket) return <StaffLayout><div className="text-center py-20 text-slate-500">Ticket not found. <Link href="/my-tickets" className="text-indigo-600 hover:underline">Back to tickets</Link></div></StaffLayout>;

  return (
    <StaffLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <Link href="/my-tickets" className="text-sm text-indigo-600 hover:underline">← My Tickets</Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-slate-400">{ticket.ticket_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}`}>{STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}`}>{PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
            </div>
          </div>

          {ticket.description && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-400 text-xs block mb-0.5">Category</span><span className="text-slate-700">{ticket.category_name || '—'}</span></div>
            <div><span className="text-slate-400 text-xs block mb-0.5">Assigned To</span><span className="text-slate-700">{ticket.assigned_name || 'Unassigned'}</span></div>
            <div><span className="text-slate-400 text-xs block mb-0.5">Submitted</span><span className="text-slate-700">{formatDate(ticket.created_at)}</span></div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Conversation</h2>

          {notes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No messages yet</p>
          ) : (
            <div className="space-y-4 mb-6">
              {notes.map((n) => (
                <div key={n.id} className={`flex gap-3 ${n.author_type === 'staff' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${n.author_type === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                    {n.author_name?.slice(0, 1).toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] ${n.author_type === 'staff' ? 'items-end' : ''}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${n.author_type === 'admin' ? 'bg-slate-100 text-slate-800 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                      <p className="whitespace-pre-wrap">{n.note}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 px-1">{n.author_name} · {formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ticket.status !== 'closed' && (
            <form onSubmit={addNote} className="flex gap-3">
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a message…" rows={2}
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              <button type="submit" disabled={sending || !noteText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors self-end">
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
