'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDictionary, type Language } from '@/lib/i18n';
import { languageOptions } from '@/lib/i18n/languages';

const modules = ['products','sales','inventory','marketing','support','finance','analytics','storefront','supplierHub','marketplaces','subscriptions','automation','security','ownerApprovals'] as const;
const moduleIcons: Record<(typeof modules)[number], string> = {
  products: '▦', sales: '↗', inventory: '▤', marketing: '✦', support: '◌', finance: '₹',
  analytics: '▥', storefront: '⌂', supplierHub: '⇄', marketplaces: '▣', subscriptions: '◷',
  automation: '⚙', security: '◇', ownerApprovals: '✓'
};

export default function Home() {
  const [lang, setLang] = useState<Language>('mr');
  useEffect(() => {
    const saved = window.localStorage.getItem('das-language') as Language | null;
    if (saved && languageOptions.some(x => x.code === saved)) setLang(saved);
  }, []);
  const changeLanguage = (value: Language) => {
    setLang(value);
    window.localStorage.setItem('das-language', value);
    fetch('/api/account/language', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: value }) }).catch(() => undefined);
  };
  const t = getDictionary(lang);

  return <main className="site-shell">
    <header className="site-header">
      <Link href="/" className="brand-lockup" aria-label="DIGITAL AI SUPPLIER home">
        <span className="brand-mark">D</span>
        <span><strong>DIGITAL AI SUPPLIER</strong><small>SMART COMMERCE PLATFORM</small></span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#features">{t.modules}</a>
        <a href="#how-it-works">How it works</a>
        <Link href="/login" className="nav-login">Seller Login</Link>
        <Link href="/register" className="nav-cta">Create Account</Link>
      </nav>
      <label className="language-picker">{t.language}<select value={lang} onChange={e => changeLanguage(e.target.value as Language)}>{languageOptions.map(l => <option key={l.code} value={l.code}>{l.nativeName}</option>)}</select></label>
    </header>

    <section className="landing-hero">
      <div className="hero-copy">
        <span className="hero-kicker">✦ YOUR MULTILINGUAL AI COMMERCE PARTNER</span>
        <h1>{t.welcome}</h1>
        <p>{t.intro}</p>
        <div className="hero-buttons"><Link href="/register" className="primary-button">Create Seller Account <span>→</span></Link><Link href="/login" className="secondary-button">Already a seller? Login</Link></div>
        <div className="hero-trust"><span>✓ Independent seller workspaces</span><span>✓ Owner-controlled platform</span><span>✓ Multiple languages</span></div>
      </div>
      <div className="hero-visual" aria-label="Business dashboard preview">
        <div className="visual-glow" />
        <div className="preview-window">
          <div className="preview-top"><span /><span /><span /><b>Business Overview</b></div>
          <div className="preview-welcome"><small>GOOD MORNING</small><strong>Your business at a glance</strong><span>All your essential tools in one workspace.</span></div>
          <div className="preview-stats"><div><small>Orders</small><b>128</b><i>↗ Overview</i></div><div><small>Products</small><b>64</b><i>Manage items</i></div></div>
          <div className="preview-chart"><div className="chart-heading"><b>Sales activity</b><small>Sample preview</small></div><div className="chart-bars">{[34,55,43,76,58,88,67,96,72,82,61,91].map((h,i)=><span key={i} style={{height:`${h}%`}} />)}</div></div>
          <div className="preview-footer"><span>● Workspace preview</span><span>Secure seller area</span></div>
        </div>
        <div className="floating-chip chip-one">✦ AI-assisted workflow</div><div className="floating-chip chip-two">⌂ Seller workspace</div>
      </div>
    </section>

    <section className="value-strip"><div><b>01</b><span>One connected workspace</span></div><div><b>02</b><span>Seller-wise data separation</span></div><div><b>03</b><span>Owner administration</span></div><div><b>04</b><span>Language preferences</span></div></section>

    <section className="features-section" id="features">
      <div className="section-heading"><span className="section-kicker">PLATFORM CAPABILITIES</span><h2>{t.modules}</h2><p>एकाच ठिकाणी व्यवसाय व्यवस्थापनासाठी नियोजित विभाग. काही विभागांचा प्रत्यक्ष API विकास आणि जोडणी पुढील टप्प्यांत पूर्ण होईल.</p></div>
      <div className="feature-grid">{modules.map((m, i) => <article className="feature-card" key={m}><span className="feature-icon">{moduleIcons[m]}</span><small>MODULE {String(i+1).padStart(2,'0')}</small><h3>{t[m]}</h3><p>{t.plannedModule}</p></article>)}</div>
    </section>

    <section className="how-section" id="how-it-works"><div><span className="section-kicker">GET STARTED</span><h2>Start with your seller workspace</h2><p>Create an account, set your preferred language and begin managing your business from one place.</p></div><ol><li><b>01</b><span><strong>Create your account</strong><small>Register your seller workspace.</small></span></li><li><b>02</b><span><strong>Set up your business</strong><small>Choose language and complete your profile.</small></span></li><li><b>03</b><span><strong>Manage your operations</strong><small>Use the available tools as integrations are enabled.</small></span></li></ol></section>

    <section className="closing-cta"><div><span className="section-kicker">DIGITAL AI SUPPLIER</span><h2>Bring your business tools together.</h2><p>Start with a dedicated seller account.</p></div><Link href="/register" className="primary-button">Create Seller Account <span>→</span></Link></section>
    <footer className="site-footer"><div className="brand-lockup"><span className="brand-mark">D</span><span><strong>DIGITAL AI SUPPLIER</strong><small>SMART COMMERCE PLATFORM</small></span></div><p>{t.disclaimer}</p><span>© {new Date().getFullYear()} DIGITAL AI SUPPLIER</span></footer>
  </main>;
}
