# Rajasthan Job – ₹10 paid job details (standalone setup)

Ye system Trade Lab se bilkul alag chalta hai: apna naya Supabase project, apne functions, apni admin login.
Razorpay account wahi (purana) use ho sakta hai, ya naya. Neeche step 6 dekhiye.

## 1. Naya Supabase project banaiye
1. supabase.com → New project. Naam: `rajasthan-job`. Database password kahin save kijiye.
2. Project ban jaye to **Project Settings → API** kholiye aur ye do cheezein copy kijiye:
   - **Project URL** (jaise `https://abcdxyz.supabase.co`)
   - **Publishable (anon) key**
3. **Project Settings → General** mein **Reference ID** bhi note kijiye (function deploy mein lagega).
4. **Authentication → Sign In / Providers** mein "Allow new users to sign up" **OFF** kijiye (sirf aap admin banenge).

## 2. Admin user banaiye
1. **Authentication → Users → Add user → Create new user.**
2. Apna email aur password daliye, **Auto Confirm User** ko tick kijiye.

## 3. Tables banaiye
1. **SQL Editor → New query.**
2. Repo ki `supabase/rj_premium.sql` ka poora code paste karke **Run**.
3. Ek aur query mein ye chalaiye (apna wahi email jo step 2 mein use kiya):
```
insert into admins values ('aapka@email.com');
```

## 4. Config file mein URL aur key
`assets/rj-config.js` kholiye (GitHub par pencil icon se bhi ho jata hai) aur do jagah paste kijiye:
- `sbUrl:` mein Project URL
- `sbKey:` mein Publishable key
`razorpayKey` mein aapki Razorpay **Key ID** hai (secret nahi). Naya Razorpay account lein to isse badal dijiye.
Commit kijiye.

## 5. Functions deploy kijiye (is Rajasthan repo ke folder se)
Terminal mein repo ke folder mein jaakar:
```
supabase login
supabase init
supabase link --project-ref AAPKA_REFERENCE_ID
supabase secrets set RJ_ALLOWED_ORIGINS=https://saifanw.github.io RJ_RAZORPAY_KEY_ID=rzp_live_xxxx RJ_RAZORPAY_KEY_SECRET=xxxxxxxx
supabase functions deploy rj-job-order --no-verify-jwt
supabase functions deploy rj-job-reveal --no-verify-jwt
```
- `supabase init` ke sawalon par `n` dabaiye. Wo aapki `supabase/functions` files nahi mitata.
- Key ID aur Secret Razorpay dashboard → Settings → API Keys se. **Secret kabhi chat ya GitHub par mat daliye.**
- Naye project mein webhook ki zaroorat nahi hai.

## 6. Razorpay
- Agar **wahi purana Razorpay account** use kar rahe hain: Trade Lab ka webhook is account ke saare payments sunta hai, to uske `supabase/functions/razorpay-webhook/index.ts` mein ye ek line jodkar redeploy kijiye (warna Trade Lab admin mein ₹10 ki "CHECK_MANUALLY" entries aayengi):
```
if (!p || p.status !== "captured") return new Response("not captured", { status: 200 });
if (p.notes?.app === "rjob") return new Response("ignored (rjob)", { status: 200 });
```
  (pehli line pehle se hai, sirf doosri jodni hai.)
- **Naya Razorpay account** lein to ye line nahi chahiye.
- Dono mein: dashboard mein website `https://saifanw.github.io/rajasthan-career-hub/` add kijiye, aur support se likhit mein pooch lijiye ki job information site par ₹10 ka optional digital detail allowed hai. github.io par Razorpay zyada strict hota hai, apna domain behtar.

## 7. GitHub
Saari files repo mein upload kijiye. Phir **Actions → Sync job pages and sitemap → Run workflow.**

## 8. Pehli job par premium
`https://saifanw.github.io/rajasthan-career-hub/premium-manager.html` → step 2 wale email/password se login → job chuniye → HR details ya career link → price → **Save premium.**
(Job Manager mein approved job par "💰 Premium" button seedha isi job ke liye kholta hai.)

## 9. Live test
1. Job page par "₹10 mein unlock karein" dikhna chahiye.
2. Khud ₹10 pay kijiye. Details dikhni chahiye. Reload par wapas aani chahiye.
3. Razorpay dashboard se refund kijiye. Reload par details band honi chahiye.
4. premium-manager.html ke "Kamai" mein payment dikhni chahiye.

## Dhyan rakhne ki baatein
- HR ka number kabhi job ke description/notes ya Firestore mein mat likhiye. Sirf premium-manager mein.
- Sirf wahi contact daliye jo employer ki permission se ya unke apne public post/career page se mila ho.
- Agar `assets/rj-config.js` mein abhi PASTE wali values hain, to job pages par premium card dikhta hi nahi (koi error nahi).
