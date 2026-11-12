'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [identifier, setIdentifier] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('mr');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function requestOtp() {
    setBusy(true); setMessage('');
    try {
      const r = await fetch('/api/auth/otp/request', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ identifier }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'OTP could not be sent.');
      setSent(true); setMessage('OTP request accepted. Check your email or SMS.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }
  async function register(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ identifier, code, businessName, language }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Registration failed.');
      window.location.href = '/dashboard';
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Registration failed.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><section className="auth-card"><Link href="/" className="back">← DIGITAL AI SUPPLIER</Link><p className="eyebrow">SELLER ONBOARDING</p><h1>Create your seller account</h1><p className="muted">Start with a secure account for your business. Owner/Admin access is never created through public registration.</p>
    <form onSubmit={register} className="stack">
      <label className="field">Business name<input required minLength={2} maxLength={100} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Your shop or business name" /></label>
      <label className="field">Email or phone number<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="name@example.com or +91..." /></label>
      <button type="button" className="secondary" disabled={busy || identifier.length < 7} onClick={requestOtp}>{busy ? 'Please wait…' : 'Send verification OTP'}</button>
      {sent && <label className="field">6-digit OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000" /></label>}
      <label className="field">Preferred language<select value={language} onChange={e=>setLanguage(e.target.value)}><option value="mr">मराठी</option><option value="hi">हिन्दी</option><option value="en">English</option><option value="gu">ગુજરાતી</option><option value="bn">বাংলা</option><option value="ta">தமிழ்</option><option value="te">తెలుగు</option><option value="kn">ಕನ್ನಡ</option><option value="pa">ਪੰਜਾਬੀ</option></select></label>
      <button type="submit" disabled={busy || !sent || code.length !== 6}>{busy ? 'Creating account…' : 'Verify OTP & create account'}</button>
    </form>
    {message && <p className="message" role="status">{message}</p>}
    <p className="muted">Already registered? <Link href="/login">Log in</Link></p>
  </section></main>;
}
