/* Rajasthan Career Hub - Analytics tracker v2
   Same engine as the Jaipur Property Consultant tracker, tuned for a job portal.
   Collects (no IP, no name/phone, no exact GPS, no form contents):
   - page views with session, source/channel/UTM, device/OS/browser, screen, language, timezone
   - approximate location (country/state/city) via a no-key IP lookup - turn off with window.RCH_ANALYTICS = { geo:false }
   - time spent (active seconds) and scroll depth per page view
   - actions: job opens, Apply clicks, WhatsApp / call / Telegram / email clicks, share + copy link,
     job searches, filter use, notes clicks, form start / submit, outbound links
   Skips bots, ?notrack=1 browsers and the signed-in admin (the dashboard sets the flag automatically). */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

(() => {
  const cfg = {
    apiKey: "AIzaSyDO75-iuVlRP9emqnR-d1T4g66akuQS328",
    authDomain: "rajasthan-job.firebaseapp.com",
    projectId: "rajasthan-job",
    storageBucket: "rajasthan-job.firebasestorage.app",
    messagingSenderId: "894888753938",
    appId: "1:894888753938:web:92e66d7a7237be1fd9d1cb"
  };
  const OPT = window.RCH_ANALYTICS || {};
  const ua = navigator.userAgent || "";
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };

  /* ---- skip bots, localhost and the owner's own browser ---- */
  if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|monitor|uptime/i.test(ua)) return;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:") return;
  const params = new URLSearchParams(location.search);
  try {
    if (params.get("notrack") === "1") { LS.set("rch_no_track", "1"); return; }
    if (params.get("notrack") === "0") LS.set("rch_no_track", "0");
  } catch (_) {}
  if (LS.get("rch_no_track") === "1") return;

  const cut = (v, n) => String(v ?? "").slice(0, n);
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "x-" + Date.now() + "-" + Math.random().toString(36).slice(2));

  /* ---- visitor (browser) id ---- */
  let visitorId = LS.get("rch_an_visitor");
  if (!visitorId) { visitorId = uuid(); LS.set("rch_an_visitor", visitorId); }

  /* ---- session (30 min inactivity window) ---- */
  const now = Date.now();
  let sess = null;
  try { sess = JSON.parse(LS.get("rch_an_sess") || "null"); } catch (_) {}
  const isNewSession = !sess || !sess.id || now - (sess.last || 0) > 30 * 60 * 1000;

  const host = location.hostname.replace(/^www\./, "");
  const refHost = (() => {
    try {
      if (!document.referrer) return "";
      const u = new URL(document.referrer);
      return u.hostname.replace(/^www\./, "").slice(0, 120);
    } catch (_) { return ""; }
  })();

  function classify() {
    const utmSource = cut(params.get("utm_source") || params.get("source"), 60);
    const medium = cut(params.get("utm_medium"), 40).toLowerCase();
    const campaign = cut(params.get("utm_campaign"), 80);
    const h = refHost.toLowerCase();
    let channel = "Direct", source = "Direct";
    if (h && h !== host) { channel = "Referral"; source = h; }
    const rules = [
      [/google\.|googlequicksearchbox/, "Organic Search", "Google"], [/bing\./, "Organic Search", "Bing"], [/yahoo\./, "Organic Search", "Yahoo"],
      [/duckduckgo\./, "Organic Search", "DuckDuckGo"], [/yandex\.|baidu\.|ecosia\./, "Organic Search", h],
      [/facebook\.|(^|\.)fb\.|com\.facebook|lm\.facebook/, "Social", "Facebook"], [/instagram\./, "Social", "Instagram"],
      [/(^|\.)t\.co$|twitter\.|(^|\.)x\.com$/, "Social", "X / Twitter"], [/linkedin\.|lnkd\.in/, "Social", "LinkedIn"],
      [/youtube\.|youtu\.be/, "Social", "YouTube"], [/pinterest\./, "Social", "Pinterest"], [/reddit\./, "Social", "Reddit"],
      [/whatsapp\.|(^|\.)wa\.me$/, "Social", "WhatsApp"], [/(^|\.)t\.me$|telegram\./, "Social", "Telegram"],
      [/mail\.google|outlook\.|mail\.yahoo|webmail/, "Email", "Email"],
      [/naukri\.|indeed\.|linkedin\.com\/jobs|freejobalert\.|sarkariresult\.|sarkarijobfind\.|rojgarresult\.|shine\.com|apna\.co|olx\./, "Referral", h]
    ];
    if (h && h !== host) for (const [re, ch, src] of rules) if (re.test(h)) { channel = ch; source = src; break; }
    if (utmSource) source = utmSource;
    if (/^(cpc|ppc|paid|paidsearch|paid_social|display|ads?)$/.test(medium)) channel = "Paid";
    else if (medium === "email") channel = "Email";
    else if (medium === "social" && channel !== "Social") channel = "Social";
    else if (utmSource && channel === "Direct") channel = "Campaign";
    return { channel, source: cut(source, 60), referrer: h === host ? "" : cut(refHost, 120), medium, campaign };
  }

  if (isNewSession) {
    const visits = (parseInt(LS.get("rch_an_visits") || "0", 10) || 0) + 1;
    LS.set("rch_an_visits", String(visits));
    sess = { id: uuid(), start: now, last: now, idx: 0, visits, attr: classify(), entry: location.pathname.split("/").pop() || "index.html" };
  }
  const idx = sess.idx || 0;
  sess.idx = idx + 1; sess.last = now;
  LS.set("rch_an_sess", JSON.stringify(sess));
  const attr = sess.attr || classify();

  /* ---- environment ---- */
  const device = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "Tablet" : /mobi|iphone|ipod|android/i.test(ua) ? "Mobile" : "Desktop";
  const os = /windows nt/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad|ipod/i.test(ua) ? "iOS" : /mac os x/i.test(ua) ? "macOS" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /FBAN|FBAV/.test(ua) ? "Facebook App" : /Instagram/.test(ua) ? "Instagram App" : /EdgA?\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const page = cut(location.pathname.split("/").pop() || "index.html", 160);
  const jobId = page === "job-detail.html" ? cut(params.get("id") || "", 80) : "";
  const tz = (() => { try { return cut(Intl.DateTimeFormat().resolvedOptions().timeZone, 60); } catch (_) { return ""; } })();
  const cached = (() => { try { const c = JSON.parse(LS.get("rch_an_geo") || "null"); return c && Date.now() - c.t < 864e5 ? c : null; } catch (_) { return null; } })();

  /* ---- Firebase (own named app so it never clashes with the page's other Firebase code) ---- */
  let db, ref, uid = "", dead = false;
  const app = (() => { try { return getApp("rch-analytics"); } catch (_) { return initializeApp(cfg, "rch-analytics"); } })();
  const auth = getAuth(app);
  db = getFirestore(app);
  const ready = (async () => {
    await (auth.authStateReady ? auth.authStateReady() : Promise.resolve());
    let u = auth.currentUser;
    if (!u) u = (await signInAnonymously(auth)).user;
    return u;
  })();

  /* Anything inside [data-rch-private] (e.g. the resume builder) is never tracked: no clicks, inputs, focus or submits. */
  const priv = e => !!(e.target && e.target.closest && e.target.closest("[data-rch-private]"));
  const state = { duration: 0, scroll: 0, clicks: 0 };
  let created = null, pending = {}, timer = null, sentSig = "";

  created = ready.then(async u => {
    if (!u) { dead = true; return false; }
    uid = u.uid;
    ref = doc(collection(db, "websiteAnalytics"));
    await setDoc(ref, {
      visitorId: cut(visitorId, 80), sessionId: cut(sess.id, 80), page, title: cut(document.title || page, 160), jobId,
      referrer: attr.referrer, source: attr.source, channel: attr.channel, medium: attr.medium, campaign: attr.campaign,
      device, os, browser,
      screen: screen.width + "x" + screen.height, viewport: innerWidth + "x" + innerHeight,
      language: cut(navigator.language, 20), tz, net: cut(navigator.connection?.effectiveType || "", 10),
      landing: idx === 0, pageIndex: idx + 1, entry: cut(sess.entry, 160), visitCount: sess.visits || 1, isNew: (sess.visits || 1) === 1,
      country: cached?.country || "", countryCode: cached?.cc || "", region: cached?.region || "", city: cached?.city || "",
      durationSec: 0, maxScroll: 0, interactions: 0,
      createdAt: serverTimestamp(), uid
    });
    return true;
  }).catch(err => { dead = true; console.warn("RCH analytics unavailable:", err?.code || err); return false; });

  function patch(obj, immediate) {
    if (dead) return;
    Object.assign(pending, obj);
    clearTimeout(timer);
    timer = setTimeout(flush, immediate ? 0 : 2500);
  }
  async function flush() {
    if (dead || !Object.keys(pending).length) return;
    const body = pending; pending = {};
    const sig = JSON.stringify(body);
    if (sig === sentSig) return;
    sentSig = sig;
    if (!(await created)) return;
    try { await updateDoc(ref, { ...body, updatedAt: serverTimestamp() }); } catch (e) { console.warn("RCH analytics update:", e?.code || e); }
  }

  /* ---- approximate location (country / state / city only) ---- */
  if (!cached && OPT.geo !== false) {
    (async () => {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch("https://ipwho.is/?fields=success,country,country_code,region,city", { signal: ctl.signal, cache: "no-store" });
        clearTimeout(t);
        const j = await r.json();
        if (!j || !j.success) return;
        const g = { t: Date.now(), country: cut(j.country, 60), cc: cut(j.country_code, 4), region: cut(j.region, 60), city: cut(j.city, 60) };
        LS.set("rch_an_geo", JSON.stringify(g));
        patch({ country: g.country, countryCode: g.cc, region: g.region, city: g.city });
      } catch (_) {}
    })();
  }

  /* ---- job pages set their title after loading: save the real title ---- */
  if (jobId) setTimeout(() => { const t = cut(document.title, 160); if (t && t !== "Job | Rajasthan Job") patch({ title: t }); }, 3500);

  /* ---- time on page (visible seconds) and scroll depth ---- */
  const marks = [10, 20, 30, 45, 60, 90, 120, 180, 300, 600, 900, 1800];
  let lastSent = 0, lastScrollSent = 0;
  const scrollNow = () => {
    const d = document.documentElement, h = Math.max(d.scrollHeight, document.body?.scrollHeight || 0);
    if (!h) return 0;
    return Math.min(100, Math.round(((window.scrollY || d.scrollTop || 0) + innerHeight) / h * 100));
  };
  let st = 0;
  addEventListener("scroll", () => {
    if (st) return;
    st = setTimeout(() => {
      st = 0; const s = scrollNow();
      if (s > state.scroll) {
        state.scroll = s;
        const m = [25, 50, 75, 90, 100].find(x => state.scroll >= x && lastScrollSent < x);
        if (m) { lastScrollSent = m; patch({ maxScroll: state.scroll, durationSec: state.duration }); }
      }
    }, 250);
  }, { passive: true });
  setTimeout(() => { state.scroll = Math.max(state.scroll, scrollNow()); }, 1200);

  setInterval(() => {
    if (document.visibilityState !== "visible" || state.duration >= 1800) return;
    state.duration++;
    if (marks.includes(state.duration)) { lastSent = state.duration; patch({ durationSec: state.duration, maxScroll: state.scroll, interactions: state.clicks }); }
  }, 1000);
  const leave = () => {
    state.scroll = Math.max(state.scroll, scrollNow());
    if (state.duration !== lastSent || state.scroll > lastScrollSent) { lastSent = state.duration; patch({ durationSec: state.duration, maxScroll: state.scroll, interactions: state.clicks }, true); }
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") leave(); });
  addEventListener("pagehide", leave);

  /* ---- actions ---- */
  let sent = 0; const once = new Set();
  function track(type, label, target, extraJob) {
    if (dead || sent >= 60) return;
    sent++;
    created.then(ok => {
      if (!ok) return;
      addDoc(collection(db, "websiteEvents"), {
        type, label: cut(label, 80), target: cut(target, 80), page, jobId: cut(extraJob || jobId, 80),
        visitorId: cut(visitorId, 80), sessionId: cut(sess.id, 80), uid, createdAt: serverTimestamp()
      }).catch(() => {});
    });
  }
  window.RCHTrack = (label, target) => track("custom", label || "custom", target || "");

  const jobTitleNow = () => cut((document.title || "").replace(/\s*\|\s*Rajasthan Job.*$/i, ""), 80);
  const txt = el => (el.getAttribute("data-track") || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();

  document.addEventListener("click", e => { if (priv(e)) return;
    state.clicks++;
    const el = e.target?.closest?.("a,button,[data-track]");
    if (!el) return;
    const label = txt(el);
    const zone = el.closest("[id]")?.id || el.closest("header,footer,nav,section")?.tagName?.toLowerCase() || "";
    if (el.tagName !== "A") {
      if (el.id === "cp") return track("copy_link", jobTitleNow() || "Link copy", zone);
      if (el.id === "stickyWa") return track("share_click", jobTitleNow() || "WhatsApp share", "sticky");
      if (el.hasAttribute("data-track")) track("custom", label, zone);
      return;
    }
    const href = el.getAttribute("href") || "";
    if (/^tel:/i.test(href)) return track("call_click", label || href.slice(4), zone);
    if (/^mailto:/i.test(href)) return track("email_click", label || "email", zone);
    if (/wa\.me\/?\?text|whatsapp\.com\/send\?text/i.test(href)) return track("share_click", jobTitleNow() || label || "WhatsApp share", zone);
    if (/wa\.me|api\.whatsapp\.com|^whatsapp:|chat\.whatsapp\.com/i.test(href)) return track("whatsapp_click", label || "WhatsApp", zone);
    if (/(^|\/\/)t\.me\/|telegram\.(me|org)/i.test(href)) return track("telegram_click", label || "Telegram", zone);
    if (el.id === "stickyApply" || (page === "job-detail.html" && el.classList.contains("apply") && /^https?:/i.test(href))) {
      let h = ""; try { h = new URL(href, location.href).hostname.replace(/^www\./, ""); } catch (_) {}
      return track("apply_click", jobTitleNow() || label || "Apply", h);
    }
    try {
      const u = new URL(href, location.href);
      if (u.hostname === location.hostname) {
        if (/job-detail\.html$/.test(u.pathname) && u.searchParams.get("id")) track("job_open", (el.closest(".job,.card,article,li")?.querySelector("h1,h2,h3,h4")?.textContent || label).replace(/\s+/g, " ").trim(), zone, u.searchParams.get("id"));
        else if (/notes\.html$/.test(u.pathname)) track("notes_click", label, zone);
        else if (/(job-seeker|post-a-job|inquiry)\.html$/.test(u.pathname)) track("cta_click", label, u.pathname.split("/").pop().replace(".html", ""));
      } else if (/^https?:$/.test(u.protocol)) {
        const h = u.hostname.replace(/^www\./, "");
        track(/\.(pdf|docx?|xlsx?|zip)$/i.test(u.pathname) ? "download_click" : "outbound_click", h, zone);
      }
    } catch (_) {}
  }, true);

  /* ---- searches and filters ---- */
  const seenSearch = new Set();
  function logSearch(q, where) {
    q = cut(String(q || "").trim().toLowerCase(), 60);
    if (q.length < 2 || seenSearch.has(q) || seenSearch.size >= 5) return;
    seenSearch.add(q); track("search", q, where);
  }
  let sTimer = 0;
  document.addEventListener("input", e => { if (priv(e)) return;
    const t = e.target;
    if (t && t.id === "search" && t.tagName === "INPUT") { clearTimeout(sTimer); sTimer = setTimeout(() => logSearch(t.value, "jobs list"), 1500); }
  }, true);
  document.addEventListener("change", e => { if (priv(e)) return;
    const t = e.target;
    if (t && t.tagName === "SELECT" && t.value && /^(location|category|experience|type|sort)$/.test(t.id || "")) track("filter_change", t.id + ": " + t.value, "");
  }, true);

  /* ---- forms ---- */
  document.addEventListener("focusin", e => { if (priv(e)) return;
    const f = e.target?.closest?.("form"); if (!f || !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (f.classList.contains("rjSearch") || f.getAttribute("role") === "search") return;
    const id = f.id || "form"; if (once.has("s" + id)) return; once.add("s" + id); track("form_start", id, "");
  }, true);
  document.addEventListener("submit", e => { if (priv(e)) return;
    const f = e.target;
    if (f && (f.classList?.contains("rjSearch") || f.getAttribute?.("role") === "search")) {
      const inp = f.querySelector("input[type=search],input[name=q],input[name=search],input[name=keyword],input[type=text],input:not([type])");
      if (inp) logSearch(inp.value, "home search");
      return;
    }
    track("form_submit", (f && f.id) || "form", "");
  }, true);
})();
