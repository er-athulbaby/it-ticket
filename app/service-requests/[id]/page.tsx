'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface AssetRow { asset_id: number | null; item: string; make: string; model: string; serial: string; tag: string }

interface SR {
  id: number; request_number: string; status: string;
  staff_id: number | null; association_id: number | null;
  staff_name: string | null; association_name: string | null; created_by_name: string | null;
  employee_name: string | null; cpr_no: string | null; department: string | null;
  mobile_no: string | null;
  asset_details: AssetRow[] | null;
  accessories: string[] | null;
  duration_type: string;
  return_by_date: string | null;
  comments: string | null;
  employee_signed_date: string | null;
  completed_by_name: string | null; completed_by_date: string | null;
  device_return_name: string | null; device_return_date: string | null;
  received_by_name: string | null; received_by_date: string | null;
  device_condition: string | null;
  created_at: string; updated_at: string;
}

interface AssetOption {
  id: number; asset_tag: string | null; category_name: string | null;
  make: string | null; model: string | null; serial_no: string | null;
  assigned_to_name: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_LABELS: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

const emptyAsset: AssetRow = { asset_id: null, item: '', make: '', model: '', serial: '', tag: '' };
const ACCESSORY_OPTIONS = ['Cable', 'Mouse', 'Keyboard'];

export default function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sr, setSr] = useState<SR | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<SR>>({});
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/service-requests/${id}`);
    if (!res.ok) { router.push('/service-requests'); return; }
    const data: SR = await res.json();
    setSr(data);
    setForm(data);
    setAssets(data.asset_details?.length ? data.asset_details : [emptyAsset, emptyAsset, emptyAsset, emptyAsset, emptyAsset]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/assets').then(r => r.json()).then(setAssetOptions);
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/service-requests/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, asset_details: assets }),
      });

      // Auto-assign any newly picked assets to this request's staff/association
      if (sr && (sr.staff_id || sr.association_id)) {
        const originalIds = new Set((sr.asset_details || []).map(a => a.asset_id).filter(Boolean));
        const newlyPicked = assets.filter(a => a.asset_id && !originalIds.has(a.asset_id));
        for (const a of newlyPicked) {
          await fetch(`/api/assets/${a.asset_id}/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staff_id: sr.staff_id || undefined,
              association_id: sr.association_id || undefined,
              notes: `Service Request ${sr.request_number}`,
            }),
          });
        }
      }

      setEditing(false); load();
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Delete this service request?')) return;
    await fetch(`/api/service-requests/${id}`, { method: 'DELETE' });
    router.push('/service-requests');
  }

  function printForm() { window.print(); }

  function ff(k: keyof SR, v: string) { setForm(prev => ({ ...prev, [k]: v || null })); }

  function toggleAccessory(name: string) {
    setForm(prev => {
      const current = prev.accessories || [];
      const next = current.includes(name) ? current.filter(x => x !== name) : [...current, name];
      return { ...prev, accessories: next };
    });
  }

  function selectAsset(idx: number, assetId: string) {
    const a = assetOptions.find(x => x.id === Number(assetId));
    setAssets(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      if (!a) return emptyAsset;
      return { asset_id: a.id, item: a.category_name || '', make: a.make || '', model: a.model || '', serial: a.serial_no || '', tag: a.asset_tag || '' };
    }));
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64 text-slate-400">Loading…</div></AppLayout>;
  if (!sr) return null;

  const statusStyle = STATUS_STYLES[sr.status] || STATUS_STYLES.pending;
  const displayAssets = sr.asset_details?.length ? sr.asset_details : [];

  return (
    <AppLayout>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-form, #print-form * { visibility: visible !important; }
          #print-form { position: fixed !important; inset: 0 !important; padding: 20px !important; background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-5 no-print">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/service-requests" className="text-sm text-slate-500 hover:text-slate-700">← Service Requests</Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{sr.request_number}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {sr.employee_name || sr.staff_name || sr.association_name || 'Unknown'} · Created {new Date(sr.created_at).toLocaleDateString()}
              {sr.created_by_name && ` by ${sr.created_by_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusStyle}`}>{STATUS_LABELS[sr.status] || sr.status}</span>
            <button onClick={printForm} className="text-sm border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium">🖨️ Print Form</button>
            {!editing && <button onClick={() => setEditing(true)} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium">Edit</button>}
            {editing && <>
              <button onClick={save} disabled={saving} className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium">{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => { setEditing(false); setForm(sr); setAssets(sr.asset_details?.length ? sr.asset_details : Array(5).fill(emptyAsset)); }} className="text-sm border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
            </>}
            <button onClick={remove} className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1.5">Delete</button>
          </div>
        </div>

        {editing ? (
          /* Edit form */
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={form.status || ''} onChange={(e) => ff('status', e.target.value)}
                className="w-48 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Employee Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {([['employee_name','Employee Name'],['cpr_no','CPR No.'],['department','Department'],['mobile_no','Mobile']] as [keyof SR, string][]).map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                    <input type="text" value={(form[k] as string) || ''} onChange={(e) => ff(k, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Asset Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded-lg">
                  <thead className="bg-slate-50">
                    <tr>{['Select Asset','Item/Type','Make','Model','Serial No.','Asset Tag'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1">
                          <select value={a.asset_id ?? ''} onChange={(e) => selectAsset(i, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                            <option value="">— None —</option>
                            {assetOptions
                              .filter(opt => !opt.assigned_to_name || opt.id === a.asset_id)
                              .map(opt => (
                                <option key={opt.id} value={opt.id}>
                                  {[opt.asset_tag, opt.category_name, opt.make, opt.model].filter(Boolean).join(' · ')}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-slate-600">{a.item || '—'}</td>
                        <td className="px-2 py-1.5 text-slate-600">{a.make || '—'}</td>
                        <td className="px-2 py-1.5 text-slate-600">{a.model || '—'}</td>
                        <td className="px-2 py-1.5 text-slate-600 font-mono">{a.serial || '—'}</td>
                        <td className="px-2 py-1.5 text-slate-600 font-mono">{a.tag || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Accessories</h3>
              <div className="flex gap-4 flex-wrap">
                {ACCESSORY_OPTIONS.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={(form.accessories || []).includes(name)} onChange={() => toggleAccessory(name)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    {name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Duration</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex gap-2">
                  {(['permanent','temporary'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => ff('duration_type', t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${(form.duration_type || 'permanent') === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-600'}`}>
                      {t === 'permanent' ? 'Permanent' : 'Temporary'}
                    </button>
                  ))}
                </div>
                {form.duration_type === 'temporary' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Return By</label>
                    <input type="date" value={(form.return_by_date as string)?.slice(0,10) || ''} onChange={(e) => ff('return_by_date', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Signatures / Completion</h3>
              <div className="grid grid-cols-2 gap-4">
                {([['employee_signed_date','Employee Signed Date','date'],['completed_by_name','Completed By','text'],['completed_by_date','Completed Date','date'],['device_return_name','Device Returned By','text'],['device_return_date','Device Return Date','date'],['received_by_name','Received By','text'],['received_by_date','Received Date','date'],['device_condition','Device Condition','text']] as [keyof SR, string, string][]).map(([k,l,type]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                    <input type={type} value={(form[k] as string) || ''} onChange={(e) => ff(k, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
                  <textarea rows={2} value={(form.comments as string) || ''} onChange={(e) => ff('comments', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Employee Details</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[['Employee Name', sr.employee_name],['CPR No.', sr.cpr_no],['Department', sr.department],['Mobile', sr.mobile_no],['Association', sr.association_name]].map(([l,v]) => (
                  <div key={l}><dt className="text-xs text-slate-500 font-medium">{l}</dt><dd className="text-slate-900 mt-0.5">{v || '—'}</dd></div>
                ))}
              </dl>
            </div>
            {displayAssets.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Asset Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-100 rounded-lg">
                    <thead className="bg-slate-50"><tr>{['Item/Type','Make','Model','Serial No.','Asset Tag'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-600">{h}</th>)}</tr></thead>
                    <tbody>
                      {displayAssets.map((a, i) => (
                        <tr key={i} className="border-t border-slate-100"><td className="px-3 py-2">{a.item || '—'}</td><td className="px-3 py-2">{a.make || '—'}</td><td className="px-3 py-2">{a.model || '—'}</td><td className="px-3 py-2 font-mono">{a.serial || '—'}</td><td className="px-3 py-2 font-mono">{a.tag || '—'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {((sr.accessories && sr.accessories.length > 0) || sr.duration_type) && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Accessories &amp; Duration</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><dt className="text-xs text-slate-500 font-medium">Accessories</dt><dd className="text-slate-900 mt-0.5">{sr.accessories?.length ? sr.accessories.join(', ') : '—'}</dd></div>
                  <div><dt className="text-xs text-slate-500 font-medium">Duration</dt><dd className="text-slate-900 mt-0.5 capitalize">{sr.duration_type || 'permanent'}{sr.duration_type === 'temporary' && sr.return_by_date ? ` · Return by ${new Date(sr.return_by_date).toLocaleDateString()}` : ''}</dd></div>
                </dl>
              </div>
            )}
            {(sr.completed_by_name || sr.employee_signed_date || sr.comments) && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Completion</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[['Completed By', sr.completed_by_name],['Completed Date', sr.completed_by_date],['Device Returned By', sr.device_return_name],['Return Date', sr.device_return_date],['Received By', sr.received_by_name],['Received Date', sr.received_by_date],['Device Condition', sr.device_condition],['Employee Signed', sr.employee_signed_date]].map(([l,v]) => (
                    <div key={l}><dt className="text-xs text-slate-500 font-medium">{l}</dt><dd className="text-slate-900 mt-0.5">{v || '—'}</dd></div>
                  ))}
                  {sr.comments && <div className="col-span-2"><dt className="text-xs text-slate-500 font-medium">Comments</dt><dd className="text-slate-900 mt-0.5">{sr.comments}</dd></div>}
                </dl>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print-only BOC form */}
      <div id="print-form" style={{ display: 'none', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000' }}>
        <style>{`
          @media print {
            #print-form { display: block !important; }
            .pf-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            .pf-table td, .pf-table th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
            .pf-label { background: #f0f0f0; font-weight: bold; width: 130px; }
            .pf-section { font-weight: bold; font-size: 12px; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .pf-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; text-align: center; }
            .pf-header img { height: 48px; width: auto; object-fit: contain; }
            .pf-header h1 { font-size: 16px; font-weight: bold; margin: 0; }
            .pf-header p { margin: 2px 0; font-size: 11px; }
            .pf-sig-table td { height: 40px; }
          }
        `}</style>

        <div className="pf-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/settings/logo" alt="Logo" />
          <div>
            <h1>IT SERVICE CHANGE REQUEST</h1>
            <p>Request Number: <strong>{sr.request_number}</strong> &nbsp;&nbsp; Date: {sr.created_at ? new Date(sr.created_at).toLocaleDateString() : ''}</p>
          </div>
        </div>

        <div className="pf-section">Employee Details</div>
        <table className="pf-table">
          <tbody>
            <tr><td className="pf-label">Employee Name</td><td>{sr.employee_name || ''}</td><td className="pf-label">CPR No.</td><td>{sr.cpr_no || ''}</td></tr>
            <tr><td className="pf-label">Department</td><td>{sr.department || ''}</td><td className="pf-label">Mobile</td><td>{sr.mobile_no || ''}</td></tr>
            {sr.association_name && (
              <tr><td className="pf-label">Association</td><td colSpan={3}>{sr.association_name}</td></tr>
            )}
          </tbody>
        </table>

        <div className="pf-section">Asset Details</div>
        <table className="pf-table">
          <thead><tr><th>No.</th><th>Item / Type</th><th>Make</th><th>Model</th><th>Serial No.</th><th>Asset Tag</th></tr></thead>
          <tbody>
            {(sr.asset_details?.length ? sr.asset_details : Array(5).fill(emptyAsset)).map((a, i) => (
              <tr key={i}>
                <td style={{width:'30px', textAlign:'center'}}>{i+1}</td>
                <td>{a.item}</td><td>{a.make}</td><td>{a.model}</td>
                <td style={{fontFamily:'monospace'}}>{a.serial}</td>
                <td style={{fontFamily:'monospace'}}>{a.tag}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pf-section">Accessories &amp; Duration</div>
        <table className="pf-table">
          <tbody>
            <tr><td className="pf-label">Accessories</td><td>{sr.accessories?.length ? sr.accessories.join(', ') : '—'}</td>
              <td className="pf-label">Duration</td><td style={{textTransform:'capitalize'}}>{sr.duration_type || 'permanent'}{sr.duration_type === 'temporary' && sr.return_by_date ? ` (return by ${new Date(sr.return_by_date).toLocaleDateString()})` : ''}</td></tr>
          </tbody>
        </table>

        <div className="pf-section">Signatures</div>
        <table className="pf-table pf-sig-table">
          <tbody>
            <tr>
              <td className="pf-label">Employee Signature</td><td></td>
              <td className="pf-label">Date</td><td>{sr.employee_signed_date || ''}</td>
            </tr>
            <tr>
              <td className="pf-label">Completed By</td><td>{sr.completed_by_name || ''}</td>
              <td className="pf-label">Date</td><td>{sr.completed_by_date || ''}</td>
            </tr>
            <tr>
              <td className="pf-label">Device Returned By</td><td>{sr.device_return_name || ''}</td>
              <td className="pf-label">Date</td><td>{sr.device_return_date || ''}</td>
            </tr>
            <tr>
              <td className="pf-label">Received By</td><td>{sr.received_by_name || ''}</td>
              <td className="pf-label">Date</td><td>{sr.received_by_date || ''}</td>
            </tr>
            <tr>
              <td className="pf-label">Device Condition</td><td colSpan={3}>{sr.device_condition || ''}</td>
            </tr>
          </tbody>
        </table>

        {sr.comments && <p style={{marginTop:'8px'}}><strong>Comments:</strong> {sr.comments}</p>}

        <p style={{marginTop:'16px', fontSize:'10px', color:'#666', textAlign:'center'}}>Generated by HelpDesk · {new Date().toLocaleString()}</p>
      </div>
    </AppLayout>
  );
}
