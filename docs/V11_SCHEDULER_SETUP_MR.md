# V11: सबस्क्रिप्शन ऑटोमॅटिक तपासणी — सेटअप

1. Hosting वर `SUBSCRIPTION_CRON_SECRET` नावाचा environment variable तयार करा. किमान 32 यादृच्छिक अक्षरांचा गुप्त key वापरा.
2. `vercel.json` मधील schedule रोज 00:15 UTC ला चालतो. हा वेळ भारतात सकाळी 05:45 होतो.
3. Cron सेवा `/api/cron/subscriptions` ला `Authorization: Bearer <SUBSCRIPTION_CRON_SECRET>` header सह GET request पाठवेल.
4. डेटाबेस migration आणि Prisma Client update केल्यानंतरच deploy करा.
5. टेस्टसाठी एक subscription ची `currentPeriodEnd` मागील तारखेला ठेवा आणि दुसऱ्याची `gracePeriodEndsAt` मागील तारखेला ठेवा. Cron चालवल्यावर पहिली GRACE_PERIOD आणि दुसरी SUSPENDED झाली पाहिजे.

**लक्षात ठेवा:** हा cron दिवसातून एकदा चालतो. त्यामुळे अचूक expiry वेळेनंतर बदल होण्यास जास्तीत जास्त साधारण 24 तास लागू शकतात. Hosting plan परवानगी देत असल्यास schedule अधिक वारंवार करा. Paid सुविधा देणाऱ्या प्रत्येक seller API मध्ये subscription guard असणेही आवश्यक आहे.
