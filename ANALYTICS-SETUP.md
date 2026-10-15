# Rajasthan Career Hub — Website Analytics v2

Same engine as Jaipur Property Consultant, tuned for a job portal.

## Kya naya hai
- `assets/rch-analytics-tracker.js` — ek shared tracker, ab **saare public pages** par laga hai
  (pehle sirf `index.html` par tha, isliye jobs / government-jobs / job-detail track hi nahi hote the).
  - Sessions, new/returning visitors, source/channel (Google, WhatsApp, Telegram, Facebook, freejobalert...), UTM campaign
  - Device / OS / browser, screen, language, approx city/state/country
  - Time on page (active seconds) + scroll depth
  - Job actions: job opened, **Apply click** (kaun si job, kis site par), WhatsApp / Call / Telegram / Email click,
    job share, link copy, **job search keywords**, filters (location/category/experience/type), notes click,
    form start / submit, outbound + download clicks
- `visitor-analytics.html` — naya dashboard: date presets + previous period compare, 12 filters + search
  (kisi bhi bar par click = filter), KPI cards with trend, traffic chart, funnel
  (Visit → 30s+ → Job dekhi → Apply click → Action), live visitors + activity feed, channels/sources/campaigns,
  country/state/city, device/OS/browser, top pages, **Jobs viewed (views / apply / shares / contacts)**,
  top searches, filters used, weekday×hour heatmap, session journeys, visitor list, action log,
  Leads (inquiries + candidate registrations), CSV export. Purana basic data (`webAnalyticsEvents`) bhi merge hota hai.
- `firestore-analytics.rules.txt` — naye collections `websiteAnalytics` aur `websiteEvents` ke rules.

## Setup (ek baar)
1. Firebase Console → Authentication → Sign-in method → **Anonymous** enabled rakhein.
2. Firestore → Rules → `firestore-analytics.rules.txt` ke functions + 2 `match` blocks apne existing rules me
   `match /databases/{database}/documents { ... }` ke andar paste karke **Publish** karein.
   **Iske bina naya data reject hoga.** Dashboard ko `inquiries` aur `candidates` ka admin read bhi chahiye (file ke end me comment hai).
3. Files GitHub Pages par deploy karein.
4. Apne phone/laptop par ek baar `visitor-analytics.html` me admin Google se sign-in karein — wo browser automatically
   track hona band ho jata hai. (Ya kisi bhi page par `?notrack=1` lagayein.)

## Notes
- Location ke liye free no-key lookup (ipwho.is) browser se hota hai; IP store nahi hota. Band karne ke liye
  page se pehle `window.RCH_ANALYTICS={geo:false}` set karein.
- Form "submitted" attempts count karta hai; asli inquiries **Leads received** me dikhti hain.
- Firestore free quota: har page view ~3–6 writes. Traffic badhe to dashboard me chhota date range use karein.
- Job-search keywords 60 characters tak save hote hain; naam/phone/form content kabhi save nahi hota.
- Visitor ID per browser hota hai.
- UTM links example: `jobs.html?utm_source=whatsapp&utm_medium=social&utm_campaign=govt-jobs`
