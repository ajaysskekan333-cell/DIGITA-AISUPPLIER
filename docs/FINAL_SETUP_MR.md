# DIGITAL AI SUPPLIER — वेबसाइट सुरू करण्याची मार्गदर्शिका

## 1. आवश्यक सेवा
- Node.js 20 किंवा नवीन
- PostgreSQL 15 किंवा नवीन डेटाबेस
- Next.js चालवू शकणारे Hosting (उदा. Vercel)
- OTP साठी SMS/Email provider आणि त्याची API माहिती

## 2. प्रोजेक्ट सुरू करणे
1. ZIP Extract करा आणि `digital-ai-supplier` फोल्डर उघडा.
2. `.env.example` ची प्रत `.env` नावाने तयार करा.
3. `DATABASE_URL` मध्ये PostgreSQL connection string भरा.
4. `SESSION_SECRET` आणि `OTP_HASH_SECRET` साठी वेगवेगळे, किमान 32 अक्षरांचे random secrets ठेवा.
5. `OTP_PROVIDER_URL` आणि `OTP_PROVIDER_API_KEY` मध्ये तुमच्या SMS/Email provider ची माहिती भरा. हा provider `{ to, code, expiresInMinutes }` JSON स्वीकारणारा असावा किंवा `src/lib/auth/otp.ts` मध्ये provider adapter बदलावा.
6. Terminal मध्ये चालवा:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

7. ब्राउझरमध्ये `http://localhost:3000` उघडा. Database health तपासण्यासाठी `/api/health` उघडा.

## 3. Owner Admin खाते
1. OTP provider जोडून सामान्य seller registration करा आणि त्या खात्याचा email verify करा.
2. सुरक्षित server terminal मधून खालील command चालवा:

```bash
npm run owner:promote -- owner@example.com
```

3. Hosting environment मध्ये `OWNER_ADMIN_EMAIL` याच email ने सेट करा.
4. Owner page `/owner` वर प्रवेश तपासा.

हा command त्या email च्या विद्यमान user ला OWNER_ADMIN करतो आणि त्याचा tenant link काढतो. म्हणून Owner साठी स्वतंत्र खाते वापरा; स्वतःचे Seller खाते Owner मध्ये बदलू नका. Public Owner registration नाही.

## 4. Hosting / Production
- Hosting मध्ये सर्व `.env` variables सुरक्षितपणे भरा; `.env` Git मध्ये कधीही commit करू नका.
- Build command: `npm run build`
- Start command: `npm run start` (जर hosting Next.js adapter वापरत नसेल तर).
- Deployment आधी `npm run db:deploy` चालवा.
- `SUBSCRIPTION_CRON_SECRET` साठी मजबूत random secret सेट करा. `vercel.json` मध्ये daily 00:15 UTC (05:45 IST) schedule आहे. तुमच्या hosting plan मध्ये Cron सुविधा उपलब्ध व सक्षम असणे आवश्यक आहे.
- `/api/health` ला 200 मिळणे आणि `database: connected` दिसणे आवश्यक.

## 5. महत्त्वाच्या मर्यादा — वेबसाइट टेस्टिंगपूर्वी वाचा
- OTP provider प्रत्यक्ष जोडल्याशिवाय Login/Registration OTP पाठवणार नाही. कोणताही development OTP bypass नाही.
- Payment gateway, signed payment webhooks आणि automatic bank payouts जोडलेले नाहीत. Owner कडून manual payment reference नोंदवणे म्हणजे payment प्रत्यक्ष transfer करणे नव्हे.
- Amazon, Flipkart, Meesho, Shopify इत्यादींचे live marketplace API credentials/approvals जोडलेले नाहीत.
- AI supplier discovery, product purchase automation, order lifecycle, storefront checkout आणि सर्व नियोजित modules पूर्ण कार्यान्वित नाहीत. Landing page व project roadmap मध्ये दाखवलेले प्रत्येक module live आहे असे समजू नका.
- Product create/list API ही सध्या पूर्णपणे जोडलेली seller business functionality आहे. इतर paid modules तयार करताना `requirePaidTenantUser()` guard, tenant-scoped query आणि audit logging वापरणे बंधनकारक आहे.
- 8% commission ledger हा delivered orders साठी आहे; प्रत्यक्ष order ingestion आणि payout automation नाही.
- पूर्ण production सुरक्षा तपासणी, MFA, backup/restore, privacy/legal pages, monitoring, load testing आणि tenant-isolation penetration testing आवश्यक आहे.

## 6. प्राथमिक टेस्टिंग क्रम
- [ ] `/api/health` — Database connected
- [ ] Seller registration: valid OTP, duplicate account rejection
- [ ] Login: correct/wrong/expired OTP, logout/session revoke
- [ ] दोन sellers तयार करून एकमेकांचे products दिसत नाहीत याची खात्री
- [ ] Product create/list, invalid price/stock rejection
- [ ] Owner login आणि non-owner ला `/owner` वर 403
- [ ] Owner plan price update आणि audit log
- [ ] Subscription active → grace → suspended transitions
- [ ] Suspended seller कडून Product API ला 402
- [ ] Cron secret नसताना 401 आणि योग्य secret असताना काम
- [ ] Commission generate duplicate-safe आणि manual settle reference
- [ ] Build + typecheck + database backup/restore
