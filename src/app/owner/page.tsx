'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CommissionPanel from './commission-panel';
import SubscriptionPanel from './subscription-panel';

type Tenant = {
  id: string; businessName: string; preferredLanguage: string; createdAt: string;
  users: { id: string; email: string | null; phone: string | null; isActive: boolean; createdAt: string }[];
  subscription: { status: string; planCode: string; currentPeriodEnd: string | null } | null;
  _count: { products: number; orders: number };
};
type Overview = {
  metrics: { sellerCount: number; activeSellerCount: number; tenantCount: number; productCount: number; orderCount: number };
  subscriptions: { status: string; count: number }[]; tenants: Tenant[];
};
const money = (value: number) => new Intl.NumberFormat('en-IN').format(value);
export default function OwnerPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('Loading owner overview…');
  useEffect(() => {
    fetch('/api/owner/overview', { cache: 'no-store' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(response.status === 403 ? 'Access denied. This page is restricted to the configured owner account.' : body.error || 'Could not load overview.');
      setData(body); setError('');
    }).catch((e) => setError(e instanceof Error ? e.message : 'Could not load overview.'));
  }, []);
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }
  return <main className="dash-wrap">
    <header className="dash-head"><div><p className="eyebrow">PRIVATE CONTROL CENTRE</p><h1>DIGITAL AI SUPPLIER</h1><p className="muted">Owner administration · Platform overview</p></div><div className="home-actions"><Link href="/dashboard">Seller area</Link><button className="secondary" onClick={logout}>Log out</button></div></header>
    <section className="dash-hero"><div><p className="eyebrow">OWNER ADMIN</p><h2>Platform control centre</h2><p>High-level view of registered seller accounts, stores, products, orders and subscription states.</p></div><span className="status-pill">Restricted access</span></section>
    {error && <p className="message" role="status">{error}</p>}
    {data && <>
      <section className="owner-metrics">
        <article className="dash-panel"><small>Total sellers</small><strong>{money(data.metrics.sellerCount)}</strong></article>
        <article className="dash-panel"><small>Active seller accounts</small><strong>{money(data.metrics.activeSellerCount)}</strong></article>
        <article className="dash-panel"><small>Business workspaces</small><strong>{money(data.metrics.tenantCount)}</strong></article>
        <article className="dash-panel"><small>Products</small><strong>{money(data.metrics.productCount)}</strong></article>
        <article className="dash-panel"><small>Orders</small><strong>{money(data.metrics.orderCount)}</strong></article>
      </section>
      <SubscriptionPanel />
      <CommissionPanel />
      <section className="dash-panel owner-subscriptions"><h2>Subscription summary</h2><div className="owner-statuses">{data.subscriptions.length ? data.subscriptions.map((s) => <span className="count" key={s.status}>{s.status.replaceAll('_',' ')}: <b>{s.count}</b></span>) : <p className="muted">No subscriptions recorded yet.</p>}</div></section>
      <section className="dash-panel"><div className="section-head"><h2>Seller workspaces</h2><span className="count">Latest {data.tenants.length}</span></div>
        {data.tenants.length === 0 ? <p className="muted">No seller workspaces have been registered yet.</p> : <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Business</th><th>Seller contact</th><th>Plan / status</th><th>Products</th><th>Orders</th><th>Language</th></tr></thead><tbody>{data.tenants.map((t) => <tr key={t.id}><td><strong>{t.businessName}</strong><small>{new Date(t.createdAt).toLocaleDateString('en-IN')}</small></td><td>{t.users.map((u) => <div key={u.id}>{u.email || u.phone || 'Contact not set'} <small>{u.isActive ? 'Active account' : 'Inactive account'}</small></div>)}</td><td>{t.subscription ? <>{t.subscription.planCode}<small>{t.subscription.status.replaceAll('_',' ')}</small></> : 'No plan'}</td><td>{t._count.products}</td><td>{t._count.orders}</td><td>{t.preferredLanguage.toUpperCase()}</td></tr>)}</tbody></table></div>}
      </section>
      <p className="muted owner-note">Subscription controls and commission ledger are available. Online payment collection, automatic bank/UPI transfers and platform-wide subscription enforcement are not enabled yet.</p>
    </>}
    <footer className="dash-footer"><Link href="/">Back to home</Link><span>Owner-only access · No public owner registration</span></footer>
  </main>;
}
