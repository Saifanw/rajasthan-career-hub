#!/usr/bin/env node
/*
 * Rajasthan Job - SEO sync
 * ------------------------
 * Reads every APPROVED job from Firestore and writes:
 *   job/<slug>-<id>.html   one real, crawlable page per job (with JobPosting structured data)
 *   job/index.html         crawlable list of all live jobs
 *   sitemap.xml            static pages + every live job page
 * Pages of jobs that are no longer approved are deleted, so Google never sees dead links.
 *
 * Usage:
 *   node scripts/generate-seo.mjs                       (fetch from Firestore, write into the repo)
 *   node scripts/generate-seo.mjs --input jobs.json     (use a local JSON array instead of Firestore)
 *   node scripts/generate-seo.mjs --out /some/folder    (write somewhere else, for testing)
 * Env overrides: SITE_URL, FIREBASE_PROJECT_ID, FIREBASE_API_KEY
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = n => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || ROOT);
const SITE = (process.env.SITE_URL || 'https://saifanw.github.io/rajasthan-career-hub').replace(/\/+$/, '');
const JOB_DIR = 'job';

/* Public pages that always belong in the sitemap: [path, changefreq, priority] */
const STATIC_PAGES = [
  ['', 'daily', '1.0'],
  ['jobs.html', 'daily', '0.9'],
  ['government-jobs.html', 'daily', '0.9'],
  ['job-seeker.html', 'weekly', '0.8'],
  ['resume-builder.html', 'monthly', '0.8'],
  ['notes.html', 'weekly', '0.7'],
  ['post-a-job.html', 'weekly', '0.7'],
  ['inquiry.html', 'monthly', '0.6'],
  ['junior-data-analyst-jaipur.html', 'monthly', '0.6'],
  ['mis-executive-jaipur.html', 'monthly', '0.6'],
  ['sales-executive-jaipur.html', 'monthly', '0.6'],
  ['terms.html', 'yearly', '0.3'],
  ['privacy.html', 'yearly', '0.3'],
  ['refund.html', 'yearly', '0.3'],
];

/* ---------- Firestore (REST, no SDK needed) ---------- */
function readConfig() {
  const t = fs.readFileSync(path.join(ROOT, 'firebase-config.js'), 'utf8');
  const g = k => (t.match(new RegExp(k + '\\s*:\\s*"([^"]+)"')) || [])[1];
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || g('projectId'),
    apiKey: process.env.FIREBASE_API_KEY || g('apiKey'),
  };
}
function dec(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  return null;
}
const decFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dec(v)]));

async function fetchJobs() {
  const { projectId, apiKey } = readConfig();
  if (!projectId || !apiKey) throw new Error('Could not read projectId/apiKey from firebase-config.js');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    // If your API key is restricted to your website, this header lets the request through.
    headers: { 'Content-Type': 'application/json', Referer: SITE + '/' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'jobs' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore request failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const rows = await res.json();
  return rows.filter(r => r.document).map(r => ({
    id: r.document.name.split('/').pop(),
    ...decFields(r.document.fields || {}),
  }));
}

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => esc(s).replace(/\r?\n/g, '<br>');
const toDate = v => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
const ymd = d => d.toISOString().slice(0, 10);
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function fileName(j) {
  const base = slugify([j.title, j.company, j.location].filter(Boolean).join(' ')).slice(0, 70).replace(/-+$/, '');
  const id = String(j.id).replace(/[^A-Za-z0-9_-]/g, '_');
  return `${base || 'job'}-${id}.html`;
}
const jobUrl = j => `${SITE}/${JOB_DIR}/${fileName(j)}`;
const applyLink = j => { const r = String(j.applyLink || j.apply || j.applicationLink || '').trim(); return /^https?:\/\//i.test(r) ? r : ''; };
const postedOn = j => toDate(j.createdAt || j.postedAt);
const modifiedOn = j => toDate(j.updatedAt) || postedOn(j);
const deadlineOk = j => /^\d{4}-\d{2}-\d{2}$/.test(String(j.deadline || ''));
const isExpired = j => deadlineOk(j) && new Date(j.deadline + 'T23:59:59+05:30') < new Date();
const isPosting = j => ['', 'job', 'recruitment'].includes(String(j.govtStage || j.updateType || '').toLowerCase());
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

function jobPostingLd(j, url) {
  const d = postedOn(j);
  const loc = String(j.location || 'Rajasthan');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: j.title || 'Job Vacancy',
    description: String(j.description || 'Details available on the employer apply page.')
      .split(/\r?\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join(''),
    datePosted: ymd(d || new Date()),
    hiringOrganization: { '@type': 'Organization', name: j.company || 'Employer' },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: loc.split(',')[0].trim() || 'Jaipur',
        addressRegion: 'Rajasthan',
        addressCountry: 'IN',
      },
    },
    directApply: false,
    url,
    identifier: { '@type': 'PropertyValue', name: 'Rajasthan Job', value: String(j.id) },
  };
  if (deadlineOk(j)) ld.validThrough = `${j.deadline}T23:59:59+05:30`;
  const et = { 'Full Time': 'FULL_TIME', 'Part Time': 'PART_TIME', Internship: 'INTERN', Contract: 'CONTRACTOR', 'Work From Home': 'FULL_TIME' }[j.type];
  if (et) ld.employmentType = et;
  if (j.type === 'Work From Home') {
    ld.jobLocationType = 'TELECOMMUTE';
    ld.applicantLocationRequirements = { '@type': 'Country', name: 'IN' };
  }
  if (j.qualification) ld.qualifications = String(j.qualification);
  if (j.experience) ld.experienceRequirements = String(j.experience);
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

/* Re-use the exact look of job-detail.html by lifting its <style> block */
function detailCss() {
  try {
    const h = fs.readFileSync(path.join(ROOT, 'job-detail.html'), 'utf8');
    return (h.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  } catch { return ''; }
}

/* <base href="../"> makes every relative link/asset (assets/, jobs.html, the shared nav) work from inside /job/ */
const shell = ({ title, desc, canonical, ld, jobId, body, extraCss = '', script = '' }) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><base href="../"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="theme-color" content="#0a1d36">
<meta property="og:type" content="${jobId ? 'article' : 'website'}"><meta property="og:site_name" content="Rajasthan Job">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary">
${jobId ? `<meta name="rch-job-id" content="${esc(jobId)}">` : ''}
${ld ? `<script type="application/ld+json">${ld}</script>` : ''}
<style>${detailCss()}
.sec ul{margin:0;padding-left:18px}.list{display:grid;gap:10px}.sc small{display:block;color:var(--muted);font-size:12px}${extraCss}</style>
<link rel="stylesheet" href="assets/rch-site.css">
</head><body>
<div class="bar"><div class="wrap"><a href="index.html"><b>Rajasthan Job</b></a><a href="jobs.html">← Sab jobs dekhein</a></div></div>
${body}
${script}
${jobId ? '<script src="assets/rj-config.js"></script>\n<script src="assets/rj-premium.js"></script>' : ''}
<script type="module" src="assets/rch-analytics-tracker.js"></script>
<script src="assets/rch-chrome.js"></script>
</body></html>
`;

function jobPage(j, all) {
  const url = jobUrl(j);
  const apply = applyLink(j);
  const f = (l, v, c = '') => v ? `<div class="fact ${c}"><small>${l}</small><b>${esc(v)}</b></div>` : '';
  const wa = 'https://wa.me/?text=' + encodeURIComponent(`${j.title || 'Job'} — ${j.company || ''} (${j.location || 'Rajasthan'})\n${url}`);
  const loc = j.location || 'Rajasthan';

  const loLoc = String(j.location || '').toLowerCase(), loCat = String(j.category || '').toLowerCase();
  const similar = all.filter(x => x.id !== j.id && !isExpired(x))
    .map(x => ({ x, sc: (loCat && String(x.category || '').toLowerCase() === loCat ? 2 : 0) + (loLoc && String(x.location || '').toLowerCase() === loLoc ? 1 : 0) }))
    .sort((a, b) => b.sc - a.sc || (postedOn(b.x) || 0) - (postedOn(a.x) || 0) || String(a.x.id).localeCompare(String(b.x.id)))
    .slice(0, 3).map(o => o.x);

  const title = `${j.title || 'Job Vacancy'} – ${j.company ? j.company + ', ' : ''}${loc} | Rajasthan Job`;
  const desc = clip(`${j.title || 'Job'} at ${j.company || 'a Rajasthan employer'} in ${loc}. ${j.salary ? 'Salary: ' + j.salary + '. ' : ''}${j.description || ''}`, 158);

  const body = `<div class="head"><div class="wrap"><div class="co">${esc(j.company || '')}</div><h1>${esc(j.title || 'Job Vacancy')}</h1><div class="co">${esc(loc)}</div></div></div>
<main class="wrap">
  <div class="card">
    <div class="facts">${f('Salary', j.salary || 'Not specified', 'sal')}${f('Experience', j.experience || 'Any experience')}${f('Job type', j.type || 'Full Time')}${f('Qualification', j.qualification || 'Not specified')}${f('Deadline', j.deadline)}</div>
    <div class="actions">${apply ? `<a class="btn apply" href="${esc(apply)}" target="_blank" rel="noopener noreferrer">Apply Now</a>` : ''}<a class="btn ghost wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp par share</a><button class="btn ghost" id="cp" type="button">Link copy</button></div>
    <div id="rjPremium" data-rj-job="${esc(j.id)}"></div>
    ${isExpired(j) ? '<div class="note">Is vacancy ki last date nikal chuki hai. Naye jobs ke liye Jobs page dekhein.</div>' : ''}
    <div class="sec"><h2>Job Description</h2><p>${nl2br(j.description || 'Details employer ke apply page par available hain.')}</p></div>
    ${j.notes ? `<div class="sec"><h2>Additional Information</h2><p>${nl2br(j.notes)}</p></div>` : ''}
    <div class="note">Apply karne se pehle vacancy aur application link ek baar verify zaroor karein.</div>
  </div>
  ${similar.length ? `<section class="sim"><h2>Milti-julti jobs</h2><div class="simg">${similar.map(x => `<a class="sc" href="${JOB_DIR}/${fileName(x)}"><b>${esc(x.title || 'Job')}</b><span>${esc(x.company || '')} · ${esc(x.location || '')}</span></a>`).join('')}</div></section>` : ''}
</main>
<div class="sticky on" id="sticky">${apply ? `<a class="btn apply" id="stickyApply" href="${esc(apply)}" target="_blank" rel="noopener noreferrer">Apply Now</a>` : ''}<a class="btn ghost wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>
<div class="toast" id="toast" role="status">Link copy ho gaya</div>`;

  const script = `<script>(function(){var b=document.getElementById('cp'),t=document.getElementById('toast');if(!b)return;b.onclick=function(){var u=location.href;function ok(){t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1800)}try{navigator.clipboard.writeText(u).then(ok,function(){prompt('Link copy karein:',u)})}catch(e){prompt('Link copy karein:',u)}}})();</script>`;

  return shell({ title, desc, canonical: url, ld: isPosting(j) ? jobPostingLd(j, url) : '', jobId: j.id, body, script });
}

function hubPage(live) {
  const url = `${SITE}/${JOB_DIR}/`;
  const body = `<div class="head"><div class="wrap"><div class="co">Rajasthan Job</div><h1>Latest Jobs in Jaipur &amp; Rajasthan</h1><div class="co">${live.length} verified vacancies</div></div></div>
<main class="wrap"><div class="card">${live.length ? `<div class="list">${live.map(j => `<a class="sc" href="${JOB_DIR}/${fileName(j)}"><b>${esc(j.title || 'Job')}</b><span>${esc(j.company || '')} · ${esc(j.location || '')}${j.salary ? ' · ' + esc(j.salary) : ''}</span></a>`).join('')}</div>` : '<p>Abhi koi live job nahi hai. Thodi der baad dobara dekhein.</p>'}</div></main>`;
  return shell({
    title: 'Latest Jobs in Jaipur & Rajasthan | Rajasthan Job',
    desc: 'Verified private and government job vacancies in Jaipur and Rajasthan, updated regularly on Rajasthan Job.',
    canonical: url, ld: '', jobId: '', body,
  });
}

function sitemap(live) {
  const u = (loc, extra) => `  <url><loc>${esc(loc)}</loc>${extra}</url>`;
  const rows = [
    ...STATIC_PAGES.map(([p, cf, pr]) => u(`${SITE}/${p}`, `<changefreq>${cf}</changefreq><priority>${pr}</priority>`)),
    u(`${SITE}/${JOB_DIR}/`, '<changefreq>hourly</changefreq><priority>0.9</priority>'),
    ...live.map(j => { const m = modifiedOn(j); return u(jobUrl(j), `${m ? `<lastmod>${ymd(m)}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.8</priority>`); }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

/* ---------- main ---------- */
const write = (rel, text) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') === text) return false; // keep unchanged files untouched
  fs.writeFileSync(f, text); return true;
};

const inputFile = arg('--input');
const jobs = (inputFile ? JSON.parse(fs.readFileSync(inputFile, 'utf8')) : await fetchJobs())
  .filter(j => j && j.id && (j.status || 'approved') === 'approved')
  .sort((a, b) => (postedOn(b) || 0) - (postedOn(a) || 0) || String(a.id).localeCompare(String(b.id)));

const live = jobs.filter(j => !isExpired(j));
let changed = 0;
const keep = new Set(['index.html']);
for (const j of jobs) {
  keep.add(fileName(j));
  if (write(`${JOB_DIR}/${fileName(j)}`, jobPage(j, jobs))) changed++;
}
if (write(`${JOB_DIR}/index.html`, hubPage(live))) changed++;

let removed = 0;
const dir = path.join(OUT, JOB_DIR);
for (const f of fs.readdirSync(dir)) {
  if (f.endsWith('.html') && !keep.has(f)) { fs.unlinkSync(path.join(dir, f)); removed++; }
}
if (write('sitemap.xml', sitemap(live))) changed++;

console.log(`Approved jobs: ${jobs.length} (live ${live.length}, expired ${jobs.length - live.length}) | files written/updated: ${changed} | removed: ${removed}`);
