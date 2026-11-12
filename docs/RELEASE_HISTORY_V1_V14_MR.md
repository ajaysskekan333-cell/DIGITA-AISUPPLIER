# DIGITAL AI SUPPLIER — V1 ते V14 एकत्रित Master Release

## एकत्रीकरणाची पद्धत
- V14 ला मुख्य application source म्हणून वापरले आहे; त्यात V13 website UI आणि V1–V12 master मधील मुख्य backend/admin/billing संरचना समाविष्ट आहे.
- V1–V12, V13 आणि V14 ZIP मधील फाईल-सूची व उपलब्ध स्रोतांची तुलना केली.
- V14 मधील PostgreSQL baseline migration वापरली आहे. V1–V12 मधील incremental migrations पुन्हा जोडलेल्या नाहीत, कारण baseline मध्ये त्यांचे बदल आधीच समाविष्ट आहेत; त्या पुन्हा चालवल्यास duplicate columns/tables निर्माण होऊ शकतात.
- जुने, superseded application files runtime मध्ये मिसळलेले नाहीत; त्यामुळे एकाच route किंवा schema च्या परस्परविरोधी प्रती टाळल्या आहेत.

## समाविष्ट मुख्य सुविधा
- Public landing website, login आणि seller registration UI
- OTP request/verify API handlers (OTP provider adapter आवश्यक)
- Seller dashboard आणि product list/create API
- Owner dashboard, seller overview आणि commission/subscription panels
- 8% commission ledger आणि manual settlement reference workflow
- Subscription plans, manual pricing, grace period आणि suspension logic
- Subscription cron endpoint आणि hosting schedule
- Central paid-feature guard (सध्या Products API मध्ये प्रत्यक्ष वापर)
- Language preference आणि multilingual UI foundation
- PostgreSQL Prisma schema, baseline migration आणि health endpoint
- Owner promotion script आणि setup documentation

## महत्त्वाच्या मर्यादा
- हा source-code bundle आहे; वेबसाइट internet वर deploy केलेली नाही.
- पूर्ण `npm install`, `npm run typecheck`, `npm run build` आणि live PostgreSQL integration tests या एकत्रीकरणात यशस्वी झाल्याचे प्रमाणित नाही.
- SMS/Email OTP provider, payment gateway/webhooks, live marketplace APIs, AI supplier discovery/purchase workflow, order management, payout transfer, MFA आणि comprehensive security tests अजून जोडणे/तपासणे आवश्यक आहे.
- V1–V14 मधील प्रत्येक feature कार्यरत आहे असा दावा नाही; फक्त प्रत्यक्ष source मध्ये असलेले modules समाविष्ट आहेत.
- Production deployment आधी `docs/FINAL_SETUP_MR.md` आणि `docs/IMPLEMENTATION_STATUS.md` वाचा.
