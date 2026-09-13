'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface AssetRow { item: string; make: string; model: string; serial: string; tag: string }

interface SR {
  id: number; request_number: string; status: string;
  staff_name: string | null; association_name: string | null; created_by_name: string | null;
  employee_name: string | null; cpr_no: string | null; department: string | null;
  mobile_no: string | null; tel_no: string | null; fax_no: string | null;
  address: string | null; company: string | null;
  it_username: string | null; it_domain_id: string | null; it_security_group: string | null;
  it_membership: string | null; it_access_permissions: string | null;
  it_map_drives: string | null; it_duration: string | null;
  asset_details: AssetRow[] | null;
  comments: string | null;
  employee_signed_date: string | null;
  completed_by_name: string | null; completed_by_date: string | null;
  device_return_name: string | null; device_return_date: string | null;
  received_by_name: string | null; received_by_date: string | null;
  device_condition: string | null;
  created_at: string; updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_LABELS: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

const emptyAsset: AssetRow = { item: '', make: '', model: '', serial: '', tag: '' };

export default function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sr, setSr] = useState<SR | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<SR>>({});
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/service-requests/${id}`);
    if (!res.ok) { router.push('/service-requests'); return; }
    const data: SR = await res.json();
    setSr(data);
    setForm(data);
    setAssets(data.asset_details?.length ? data.asset_details : [emptyAsset, emptyAsset, emptyAsset, emptyAsset, emptyAsset]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/service-requests/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, asset_details: assets }),
      });
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
  function fa(idx: number, k: keyof AssetRow, v: string) { setAssets(prev => prev.map((a, i) => i === idx ? { ...a, [k]: v } : a)); }

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
                {([['employee_name','Employee Name'],['cpr_no','CPR No.'],['department','Department'],['mobile_no','Mobile'],['tel_no','Tel'],['fax_no','Fax'],['address','Address'],['company','Company']] as [keyof SR, string][]).map(([k,l]) => (
                  <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                    <input type="text" value={(form[k] as string) || ''} onChange={(e) => ff(k, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">IT Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {([['it_username','Username'],['it_domain_id','Domain ID'],['it_security_group','Security Group'],['it_membership','Membership'],['it_access_permissions','Access Permissions'],['it_map_drives','Map Drives'],['it_duration','Duration']] as [keyof SR, string][]).map(([k,l]) => (
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
                    <tr>{['Item/Type','Make','Model','Serial No.','Asset Tag'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        {(['item','make','model','serial','tag'] as (keyof AssetRow)[]).map(k => (
                          <td key={k} className="px-2 py-1">
                            <input type="text" value={a[k]} onChange={(e) => fa(i, k, e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                {[['Employee Name', sr.employee_name],['CPR No.', sr.cpr_no],['Department', sr.department],['Mobile', sr.mobile_no],['Tel', sr.tel_no],['Fax', sr.fax_no],['Address', sr.address],['Company', sr.company]].map(([l,v]) => (
                  <div key={l}><dt className="text-xs text-slate-500 font-medium">{l}</dt><dd className="text-slate-900 mt-0.5">{v || '—'}</dd></div>
                ))}
              </dl>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-800 mb-4">IT Details</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[['Username', sr.it_username],['Domain ID', sr.it_domain_id],['Security Group', sr.it_security_group],['Membership', sr.it_membership],['Access Permissions', sr.it_access_permissions],['Map Drives', sr.it_map_drives],['Duration', sr.it_duration]].map(([l,v]) => (
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
      <div id="print-form" ref={printRef} style={{ display: 'none', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000' }}>
        <style>{`
          @media print {
            #print-form { display: block !important; }
            .pf-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            .pf-table td, .pf-table th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
            .pf-label { background: #f0f0f0; font-weight: bold; width: 130px; }
            .pf-section { font-weight: bold; font-size: 12px; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .pf-header { text-align: center; margin-bottom: 12px; }
            .pf-header h1 { font-size: 16px; font-weight: bold; margin: 0; }
            .pf-header p { margin: 2px 0; font-size: 11px; }
            .pf-sig-table td { height: 40px; }
          }
        `}</style>

        <div className="pf-header">
          <h1>IT SERVICE CHANGE REQUEST</h1>
          <p>Request Number: <strong>{sr.request_number}</strong> &nbsp;&nbsp; Date: {sr.created_at ? new Date(sr.created_at).toLocaleDateString() : ''}</p>
        </div>

        <div className="pf-section">Employee Details</div>
        <table className="pf-table">
          <tbody>
            <tr><td className="pf-label">Employee Name</td><td>{sr.employee_name || ''}</td><td className="pf-label">CPR No.</td><td>{sr.cpr_no || ''}</td></tr>
            <tr><td className="pf-label">Department</td><td>{sr.department || ''}</td><td className="pf-label">Company</td><td>{sr.company || ''}</td></tr>
            <tr><td className="pf-label">Mobile</td><td>{sr.mobile_no || ''}</td><td className="pf-label">Tel</td><td>{sr.tel_no || ''}</td></tr>
            <tr><td className="pf-label">Fax</td><td>{sr.fax_no || ''}</td><td className="pf-label">Address</td><td>{sr.address || ''}</td></tr>
          </tbody>
        </table>

        <div className="pf-section">IT Details</div>
        <table className="pf-table">
          <tbody>
            <tr><td className="pf-label">IT Username</td><td>{sr.it_username || ''}</td><td className="pf-label">Domain ID</td><td>{sr.it_domain_id || ''}</td></tr>
            <tr><td className="pf-label">Security Group</td><td>{sr.it_security_group || ''}</td><td className="pf-label">Membership</td><td>{sr.it_membership || ''}</td></tr>
            <tr><td className="pf-label">Access Permissions</td><td>{sr.it_access_permissions || ''}</td><td className="pf-label">Map Drives</td><td>{sr.it_map_drives || ''}</td></tr>
            <tr><td className="pf-label">Duration</td><td colSpan={3}>{sr.it_duration || ''}</td></tr>
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
