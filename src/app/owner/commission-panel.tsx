'use client';
import { useCallback, useEffect, useState } from 'react';

type Entry = {
  id: string; businessName: string; orderNumber: string; orderStatus: string;
  grossAmount: string; ratePercent: number; commissionAmount: string; sellerNetAmount: string;
  status: 'PENDING' | 'PAID' | 'VOID'; paymentReference: string | null; createdAt: string; settledAt: string | null;
};
type Ledger = {
  ratePercent: number;
  totals: { entries: number; grossAmount: string; commissionAmount: string; sellerNetAmount: string };
  statuses: { status: string; count: number; commissionAmount: string }[];
  entries: Entry[];
};
const rupees = (value: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value));

export default function CommissionPanel() {
  const [data, setData] = useState<Ledger | null>(null);
  const [message, setMessage] = useState('Loading commission ledger…');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/owner/commissions', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load commission ledger.');
      setData(body); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load commission ledger.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function generate() {
    setBusy(true); setMessage('Processing delivered orders…');
    try {
      const response = await fetch('/api/owner/commissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate' }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not generate ledger.');
      setMessage(`Processed ${body.scanned} delivered orders; ${body.created} new commission entries created.`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not generate ledger.'); }
    finally { setBusy(false); }
  }
  async function settle(entry: Entry) {
    const paymentReference = window.prompt(`Enter the actual bank/UPI transaction reference for ${entry.orderNumber}:`);
    if (!paymentReference?.trim()) return;
    setBusy(true); setMessage('Saving settlement…');
    try {
      const response = await fetch('/api/owner/commissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settle', ledgerId: entry.id, paymentReference: paymentReference.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save settlement.');
      setMessage(`Settlement recorded for order ${entry.orderNumber}.`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save settlement.'); }
    finally { setBusy(false); }
  }

  return <section className="dash-panel commission-panel">
    <div className="section-head"><div><h2>8% commission & seller settlement</h2><p className="muted">Only delivered orders are included. Settlement is a manual record, not a money transfer.</p></div><button className="primary" onClick={generate} disabled={busy}>Generate ledger</button></div>
    {message && <p className="message" role="status">{message}</p>}
    {data && <>
      <div className="owner-metrics commission-metrics">
        <article className="dash-panel"><small>Gross delivered sales</small><strong>{rupees(data.totals.grossAmount)}</strong></article>
        <article className="dash-panel"><small>Platform commission ({data.ratePercent}%)</small><strong>{rupees(data.totals.commissionAmount)}</strong></article>
        <article className="dash-panel"><small>Seller net amount</small><strong>{rupees(data.totals.sellerNetAmount)}</strong></article>
      </div>
      <div className="owner-statuses">{data.statuses.map((s) => <span className="count" key={s.status}>{s.status}: <b>{s.count}</b> · {rupees(s.commissionAmount)}</span>)}</div>
      <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Seller / order</th><th>Gross</th><th>8% commission</th><th>Seller net</th><th>Status / reference</th><th>Action</th></tr></thead><tbody>
        {data.entries.map((entry) => <tr key={entry.id}><td><strong>{entry.businessName}</strong><small>{entry.orderNumber}</small></td><td>{rupees(entry.grossAmount)}</td><td>{rupees(entry.commissionAmount)}</td><td>{rupees(entry.sellerNetAmount)}</td><td><strong>{entry.status}</strong><small>{entry.paymentReference || 'No payment reference'}</small></td><td>{entry.status === 'PENDING' ? <button className="secondary" disabled={busy} onClick={() => settle(entry)}>Record paid</button> : '—'}</td></tr>)}
        {data.entries.length === 0 && <tr><td colSpan={6}>No commission entries yet. Generate the ledger after delivered orders are recorded.</td></tr>}
      </tbody></table></div>
      <p className="muted owner-note">Showing the latest {data.entries.length} entries. Before recording a settlement, transfer the seller amount through your bank/UPI service and enter its genuine transaction reference. Do not mark an unpaid amount as paid.</p>
    </>}
  </section>;
}
