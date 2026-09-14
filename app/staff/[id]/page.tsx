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
interface ConsumableTxRow { id: number; transaction_type: string; quantity: number; notes: string | null; created_at: string; consumable_id: number; consumable_name: string; unit: string }

interface StaffDetail {
  id: number; name: string; department: string | null; email: string | null; mobile: string | null;
  staff_code: string | null; ms_license: string | null; is_active: boolean; created_at: string;
  association_id: number | null; association_name: string | null; photo_filename: string | null;
  assets: AssetRow[]; licenses: LicenseRow[]; tickets: TicketRow[]; serviceRequests: SRRow[]; consumables: ConsumableTxRow[];
}

interface AvailableAsset { id: number; asset_tag: string | null; make: string | null; model: string | null; category_name: string | null; assigned_to_name: string | null }
interface LicenseOption { id: number; name: string; vendor: string | null; seats: number }
interface ConsumableOption { id: number; name: string; unit: string; quantity: number }

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

  const [showAssignAsset, setShowAssignAsset] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assigningAsset, setAssigningAsset] = useState(false);

  const [showAssignLicense, setShowAssignLicense] = useState(false);
  const [licenseOptions, setLicenseOptions] = useState<LicenseOption[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [assigningLicense, setAssigningLicense] = useState(false);

  const [showIssueConsumable, setShowIssueConsumable] = useState(false);
  const [consumableOptions, setConsumableOptions] = useState<ConsumableOption[]>([]);
  const [selectedConsumableId, setSelectedConsumableId] = useState('');
  const [issueQty, setIssueQty] = useState(1);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');

  async function load() {
    const r = await fetch(`/api/staff/${id}`);
    if (!r.ok) { router.push('/staff'); return; }
    setStaff(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function openAssignAsset() {
    const r = await fetch('/api/assets');
    const all: AvailableAsset[] = await r.json();
    setAvailableAssets(all.filter((a) => !a.assigned_to_name));
    setSelectedAssetId('');
    setShowAssignAsset(true);
  }

  async function confirmAssignAsset() {
    if (!selectedAssetId) return;
    setAssigningAsset(true);
    try {
      await fetch(`/api/assets/${selectedAssetId}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: Number(id) }),
      });
      setShowAssignAsset(false);
      load();
    } finally { setAssigningAsset(false); }
  }

  async function returnAsset(assetId: number) {
    if (!confirm('Mark this asset as returned?')) return;
    await fetch(`/api/assets/${assetId}/assign`, { method: 'DELETE' });
    load();
  }

  async function openAssignLicense() {
    const r = await fetch('/api/licenses');
    const all: LicenseOption[] = await r.json();
    const alreadyHeld = new Set(staff?.licenses.filter((l) => !l.returned_date).map((l) => l.license_id));
    setLicenseOptions(all.filter((l) => !alreadyHeld.has(l.id)));
    setSelectedLicenseId('');
    setShowAssignLicense(true);
  }

  async function confirmAssignLicense() {
    if (!selectedLicenseId) return;
    setAssigningLicense(true);
    try {
      const res = await fetch(`/api/licenses/${selectedLicenseId}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: Number(id) }),
      });
      if (res.ok) { setShowAssignLicense(false); load(); }
    } finally { setAssigningLicense(false); }
  }

  async function revokeLicense(licenseId: number) {
    if (!confirm('Revoke this license from this staff member?')) return;
    await fetch(`/api/licenses/${licenseId}/assign`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: Number(id) }),
    });
    load();
  }

  async function openIssueConsumable() {
    const r = await fetch('/api/consumables');
    setConsumableOptions(await r.json());
    setSelectedConsumableId(''); setIssueQty(1); setIssueError('');
    setShowIssueConsumable(true);
  }

  async function confirmIssueConsumable() {
    if (!selectedConsumableId) return;
    setIssuing(true); setIssueError('');
    try {
      const res = await fetch(`/api/consumables/${selectedConsumableId}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_type: 'out', quantity: issueQty, staff_id: Number(id) }),
      });
      if (!res.ok) { const d = await res.json(); setIssueError(d.error || 'Failed'); return; }
      setShowIssueConsumable(false);
      load();
    } finally { setIssuing(false); }
  }

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Microsoft Licenses {currentLicenses.length > 0 && <span className="text-slate-400 font-normal">({currentLicenses.length})</span>}</h2>
            <button onClick={openAssignLicense} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg">+ Assign License</button>
          </div>
          {currentLicenses.length === 0 ? (
            <p className="text-sm text-slate-400">No licenses assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentLicenses.map((l) => (
                <span key={l.assignment_id} className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 pl-2.5 pr-1.5 py-1 rounded-full font-medium">
                  {l.name}
                  <button onClick={() => revokeLicense(l.license_id)} className="text-indigo-400 hover:text-red-600 font-bold" title="Revoke">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Current assets */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Assigned Assets {currentAssets.length > 0 && <span className="text-slate-400 font-normal">({currentAssets.length})</span>}</h2>
            <button onClick={openAssignAsset} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg">+ Assign Asset</button>
          </div>
          {currentAssets.length === 0 ? (
            <p className="text-sm text-slate-400">No assets currently assigned.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentAssets.map((a) => (
                <div key={a.assignment_id} className="flex items-center gap-3 py-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.category_color || '#94a3b8' }} />
                  <Link href={`/assets/${a.asset_id}`} className="flex-1 min-w-0 hover:text-indigo-600">
                    <div className="text-sm font-medium text-slate-800">{[a.make, a.model].filter(Boolean).join(' ') || a.category_name || 'Asset'}</div>
                    <div className="text-xs text-slate-400">{[a.asset_tag, a.serial_no].filter(Boolean).join(' · ') || '—'} · since {new Date(a.assigned_date).toLocaleDateString()}</div>
                  </Link>
                  <button onClick={() => returnAsset(a.asset_id)} className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-medium flex-shrink-0">Return</button>
                </div>
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

        {/* Consumables */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Consumables Issued {staff.consumables.length > 0 && <span className="text-slate-400 font-normal">({staff.consumables.length})</span>}</h2>
            <button onClick={openIssueConsumable} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg">+ Issue Consumable</button>
          </div>
          {staff.consumables.length === 0 ? (
            <p className="text-sm text-slate-400">No consumables issued yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {staff.consumables.map((c) => (
                <Link key={c.id} href={`/consumables`} className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="text-sm text-slate-800">{c.consumable_name}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    <span className="text-xs font-medium text-red-600">-{c.quantity} {c.unit}</span>
                  </div>
                </Link>
              ))}
            </div>
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

      {/* Assign Asset Modal */}
      {showAssignAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Assign Asset</h2>
            {availableAssets.length === 0 ? (
              <p className="text-sm text-slate-500">No unassigned assets available. <Link href="/assets" className="text-indigo-600 hover:underline">Add one →</Link></p>
            ) : (
              <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Select an asset…</option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>{[a.asset_tag, a.category_name, a.make, a.model].filter(Boolean).join(' · ')}</option>
                ))}
              </select>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={confirmAssignAsset} disabled={assigningAsset || !selectedAssetId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">{assigningAsset ? 'Assigning…' : 'Assign'}</button>
              <button onClick={() => setShowAssignAsset(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal */}
      {showAssignLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Assign License</h2>
            {licenseOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No other licenses available. <Link href="/licenses" className="text-indigo-600 hover:underline">Add one →</Link></p>
            ) : (
              <select value={selectedLicenseId} onChange={(e) => setSelectedLicenseId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Select a license…</option>
                {licenseOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={confirmAssignLicense} disabled={assigningLicense || !selectedLicenseId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">{assigningLicense ? 'Assigning…' : 'Assign'}</button>
              <button onClick={() => setShowAssignLicense(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Consumable Modal */}
      {showIssueConsumable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Issue Consumable</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Item</label>
                <select value={selectedConsumableId} onChange={(e) => setSelectedConsumableId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Select an item…</option>
                  {consumableOptions.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.quantity} {c.unit} in stock)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                <input type="number" min="1" value={issueQty} onChange={(e) => setIssueQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {issueError && <p className="text-sm text-red-600">{issueError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={confirmIssueConsumable} disabled={issuing || !selectedConsumableId || issueQty <= 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">{issuing ? 'Issuing…' : 'Issue'}</button>
              <button onClick={() => setShowIssueConsumable(false)} className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
