'use client';
import { useCallback, useEffect, useState } from 'react';

type Plan = { code: string; displayName: string; monthlyPrice: number; active: boolean };
type Sub = { id: string; planCode: string; priceAtPurchase: number; status: string; storedStatus: string; currentPeriodEnd: string | null; gracePeriodEndsAt?: string | null; paymentReference: string | null };
type Tenant = { id: string; businessName: string; contact: string; subscription: Sub | null };
type Payload = { plans: Plan[]; tenants: Tenant[] };
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : 'Not set';
const inr = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export default function SubscriptionPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading subscription records…');
  const [selected, setSelected] = useState('');
  const [plan, setPlan] = useState('STARTER');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [months, setMonths] = useState('1');
  const [reference, setReference] = useState('');
  const [graceDays, setGraceDays] = useState('7');
  const [reason, setReason] = useState('');
  const load = useCallback(async () => {
    try { const r = await fetch('/api/owner/subscriptions', { cache: 'no-store' }); const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Could not load subscriptions'); setData(b); setPriceDrafts(Object.fromEntries((b.plans as Plan[]).map((p) => [p.code, String(p.monthlyPrice)]))); setMessage(''); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not load subscriptions'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(body: Record<string, unknown>) {
    setBusy(true); setMessage('Saving subscription change…');
    try { const r = await fetch('/api/owner/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Could not save change'); setMessage('Subscription record updated and audit-logged.'); setReason(''); setReference(''); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save change'); }
    finally { setBusy(false); }
  }
  return <section className="dash-panel subscription-panel">
    <div className="section-head"><div><h2>Subscription plans & payment records</h2><p className="muted">Manual owner controls. A payment reference must be verified outside this app before activation.</p></div><button className="secondary" disabled={busy} onClick={() => void load()}>Refresh</button></div>
    {message && <p className="message" role="status">{message}</p>}
    <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Seller</th><th>Plan / status</th><th>Price at activation</th><th>Plan expiry / grace deadline</th><th>Last payment reference</th></tr></thead><tbody>
      {data?.tenants.map((t) => <tr key={t.id}><td><strong>{t.businessName}</strong><small>{t.contact}</small></td><td>{t.subscription?.planCode ?? 'No plan'}<small>{(t.subscription?.status ?? 'NO SUBSCRIPTION').replaceAll('_',' ')}</small></td><td>{t.subscription ? inr(t.subscription.priceAtPurchase) + ' / month' : '—'}</td><td>{date(t.subscription?.currentPeriodEnd ?? null)}{t.subscription?.gracePeriodEndsAt && <small>Grace until: {date(t.subscription.gracePeriodEndsAt)}</small>}</td><td>{t.subscription?.paymentReference ?? '—'}</td></tr>)}
      {data?.tenants.length === 0 && <tr><td colSpan={5}>No seller accounts found.</td></tr>}
    </tbody></table></div>
    <div className="dash-panel" style={{ marginTop: 18 }}><div className="section-head"><div><h3>Manually change subscription plan prices</h3><p className="muted">Only the Owner Admin can edit prices. New prices apply to future activations/renewals; existing subscriptions keep their recorded price.</p></div></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Plan</th><th>Monthly price (INR)</th><th>Availability</th><th>Action</th></tr></thead><tbody>{data?.plans.map((p) => <tr key={p.code}><td><strong>{p.displayName}</strong><small>{p.code}</small></td><td><input aria-label={`${p.displayName} monthly price in INR`} type="number" min="0" max="10000000" step="0.01" value={priceDrafts[p.code] ?? String(p.monthlyPrice)} onChange={(e) => setPriceDrafts((old) => ({ ...old, [p.code]: e.target.value }))} /></td><td>{p.active ? 'Enabled' : 'Disabled'}</td><td><button className="primary" disabled={busy || priceDrafts[p.code] === undefined || priceDrafts[p.code].trim() === '' || !Number.isFinite(Number(priceDrafts[p.code])) || Number(priceDrafts[p.code]) < 0} onClick={() => void submit({ action: 'set_price', planCode: p.code, monthlyPrice: Number(priceDrafts[p.code]), active: p.active })}>Save price</button></td></tr>)}</tbody></table></div><p className="muted owner-note">₹0 means the paid plan cannot be activated until you set a price above zero. No existing seller is charged automatically when you change a price.</p></div>
    <div className="subscription-actions">
      <div className="dash-panel"><h3>Activate / renew after payment</h3><label>Seller workspace<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose seller</option>{data?.tenants.map((t) => <option value={t.id} key={t.id}>{t.businessName}</option>)}</select></label><label>Plan<select value={plan} onChange={(e) => setPlan(e.target.value)}>{data?.plans.filter((p) => p.active && p.monthlyPrice > 0).map((p) => <option value={p.code} key={p.code}>{p.displayName} — {inr(p.monthlyPrice)} / month</option>)}</select></label><label>Duration<select value={months} onChange={(e) => setMonths(e.target.value)}><option value="1">1 month</option><option value="3">3 months</option><option value="12">12 months</option></select></label><label>Verified bank / UPI payment reference<input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Enter genuine transaction reference" /></label><button className="primary" disabled={busy || !selected || reference.trim().length < 3} onClick={() => void submit({ action: 'activate', tenantId: selected, planCode: plan, months: Number(months), paymentReference: reference.trim() })}>Confirm verified payment & activate</button></div>
      <div className="dash-panel"><h3>Grace period</h3><label>Seller workspace<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose seller</option>{data?.tenants.map((t) => <option value={t.id} key={t.id}>{t.businessName}</option>)}</select></label><label>Grace duration<select value={graceDays} onChange={(e) => setGraceDays(e.target.value)}><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option></select></label><button className="secondary" disabled={busy || !selected} onClick={() => void submit({ action: 'grace', tenantId: selected, days: Number(graceDays) })}>Grant grace period</button></div>
      <div className="dash-panel"><h3>Suspend / cancel</h3><label>Reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason (required)" /></label><div className="home-actions"><button className="secondary" disabled={busy || !selected || reason.trim().length < 3} onClick={() => void submit({ action: 'suspend', tenantId: selected, reason: reason.trim() })}>Suspend</button><button className="secondary" disabled={busy || !selected || reason.trim().length < 3} onClick={() => { if (window.confirm('Cancel this subscription?')) void submit({ action: 'cancel', tenantId: selected, reason: reason.trim() }); }}>Cancel</button></div></div>
    </div>
    <p className="muted owner-note">Prices are manually controlled by the Owner Admin. This panel records manual payment verification; it does not collect money. Automatic expiry and platform-wide access enforcement still require a background scheduler and guards across all seller modules.</p>
  </section>;
}
