'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

interface AssetRow {
  assignment_id: number; assigned_date: string; returned_date: string | null; notes: string | null;
  asset_id: number; asset_tag: string | null; make: string | null; model: string | null;
  serial_no: string | null; condition: string; category_name: string | null; category_color: string | null;
}
interface LicenseRow {
  assignment_id: number; assigned_date: string; returned_date: string | null;
  license_id: number; name: string; vendor: string | null; expiry_date: string | null;
}
interface TicketRow { id: number; ticket_number: string; title: string; status: string; priority: string; created_at: string }
interface SRRow { id: number; request_number: string; status: string; created_at: string }

interface StaffDetail {
  id: number; name: string; department: string | null; email: string | null; mobile: string | null;
  staff_code: string | null; ms_license: string | null; is_active: boolean; created_at: string;
  association_id: number | null; association_name: string | null; photo_filename: string | null;
  assets: AssetRow[]; licenses: LicenseRow[]; tickets: TicketRow[]; serviceRequests: SRRow[];
}

const TICKET_STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-500',
};
const SR_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-slate-100 text-slate-500',
};

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/staff/${id}`).then(async (r) => {
      if (!r.ok) { router.push('/staff'); return; }
      setStaff(await r.json());
      setLoading(false);
    });
  }, [id, router]);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64 text-slate-400">Loading…</div></AppLayout>;
  if (!staff) return null;

  const currentAssets = staff.assets.filter((a) => !a.returned_date);
  const pastAssets = staff.assets.filter((a) => a.returned_date);
  const currentLicenses = staff.licenses.filter((l) => !l.returned_date);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <Link href="/staff" className="text-sm text-slate-500 hover:text-slate-700">← Staff</Link>

        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            {staff.photo_filename ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/profile/photo?staffId=${staff.id}`} alt={staff.name} className="w-16 h-16 rounded-full object-cover border border-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl flex-shrink-0">
                {staff.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{staff.name}</h1>
                {staff.staff_code && <span className="text-xs font-mono text-slate-400">{staff.staff_code}</span>}
                {!staff.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                {[staff.department, staff.association_name].filter(Boolean).join(' · ') || 'No department set'}
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-4 text-sm">
                <div><dt className="text-xs text-slate-400 font-medium">Email</dt><dd className="text-slate-800">{staff.email || '—'}</dd></div>
                <div><dt className="text-xs text-slate-400 font-medium">Mobile</dt><dd className="text-slate-800">{staff.mobile || '—'}</dd></div>
                <div><dt className="text-xs text-slate-400 font-medium">Legacy License Note</dt><dd className="text-slate-800">{staff.ms_license || '—'}</dd></div>
              </dl>
            </div>
          </div>
        </div>

        {/* Licenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Microsoft Licenses {currentLicenses.length > 0 && <span className="text-slate-400 font-normal">({currentLicenses.length})</span>}</h2>
          {currentLicenses.length === 0 ? (
            <p className="text-sm text-slate-400">No licenses assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentLicenses.map((l) => (
                <span key={l.assignment_id} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Current assets */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Assigned Assets {currentAssets.length > 0 && <span className="text-slate-400 font-normal">({currentAssets.length})</span>}</h2>
          {currentAssets.length === 0 ? (
            <p className="text-sm text-slate-400">No assets currently assigned.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentAssets.map((a) => (
                <Link key={a.assignment_id} href={`/assets/${a.asset_id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.category_color || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{[a.make, a.model].filter(Boolean).join(' ') || a.category_name || 'Asset'}</div>
                    <div className="text-xs text-slate-400">{[a.asset_tag, a.serial_no].filter(Boolean).join(' · ') || '—'} · since {new Date(a.assigned_date).toLocaleDateString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {pastAssets.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{pastAssets.length} returned asset{pastAssets.length !== 1 ? 's' : ''}</summary>
              <div className="divide-y divide-slate-100 mt-2">
                {pastAssets.map((a) => (
                  <div key={a.assignment_id} className="py-2 text-xs text-slate-500">
                    {[a.make, a.model].filter(Boolean).join(' ') || a.category_name} — {new Date(a.assigned_date).toLocaleDateString()} → {a.returned_date && new Date(a.returned_date).toLocaleDateString()}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Tickets */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Tickets {staff.tickets.length > 0 && <span className="text-slate-400 font-normal">({staff.tickets.length})</span>}</h2>
          {staff.tickets.length === 0 ? (
            <p className="text-sm text-slate-400">No tickets raised.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {staff.tickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-800 truncate">{t.title}</div>
                    <div className="text-xs text-slate-400 font-mono">{t.ticket_number} · {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TICKET_STATUS_STYLES[t.status] || 'bg-slate-100 text-slate-500'}`}>{t.status.replace('_', ' ')}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Service Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Service Requests {staff.serviceRequests.length > 0 && <span className="text-slate-400 font-normal">({staff.serviceRequests.length})</span>}</h2>
          {staff.serviceRequests.length === 0 ? (
            <p className="text-sm text-slate-400">No service requests.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {staff.serviceRequests.map((sr) => (
                <Link key={sr.id} href={`/service-requests/${sr.id}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="text-sm font-mono text-indigo-700">{sr.request_number}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{new Date(sr.created_at).toLocaleDateString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SR_STATUS_STYLES[sr.status] || 'bg-slate-100 text-slate-500'}`}>{sr.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
