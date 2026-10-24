/* Rajasthan Job - paid job details (HR contact, career page, hiring tips).
   Public values only. The Razorpay SECRET and the paid data never live in this file:
   the data stays in Supabase and is released by the rj-job-reveal function after a verified payment.
   Settings live in assets/rj-config.js. For Razorpay TEST mode put your rzp_test_ key id there (and test keys in the function secrets). */
(function () {
  'use strict';
  var C = { sbUrl: '', sbKey: '', razorpayKey: '' };      // filled from assets/rj-config.js
  for (var k in (window.RJ_CONFIG || {})) C[k] = window.RJ_CONFIG[k];
  C.fn = C.fn || C.sbUrl + '/functions/v1';
  var JOB_RE = /^[A-Za-z0-9_-]{4,80}$/;

  function el(tag, attrs) {
    var e = document.createElement(tag);
    for (var a in (attrs || {})) {
      if (a === 'class') e.className = attrs[a];
      else if (a.slice(0, 2) === 'on') e[a] = attrs[a];
      else e.setAttribute(a, attrs[a]);
    }
    (function add(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c);
        else e.appendChild(c.nodeType ? c : document.createTextNode(c));
      }
    })([].slice.call(arguments, 2));
    return e;
  }
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.sbKey }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'Kuch gadbad ho gayi'); return d; }); });
  }
  function css() {
    if (document.getElementById('rjp-css')) return;
    var s = document.createElement('style'); s.id = 'rjp-css';
    s.textContent = '.rjp{margin:18px 0;border:1.5px solid #e8c36a;background:linear-gradient(180deg,#fffaf0,#fff);border-radius:16px;padding:18px}' +
      '.rjp h2{margin:0 0 4px;font-size:18px;color:var(--navy,#0a1d36)}.rjp p{margin:4px 0;color:var(--muted,#51607a);font-size:14px;line-height:1.55}' +
      '.rjp .tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.rjp .tags span{background:#fff3d6;border:1px solid #f0d58f;color:#7a5600;border-radius:99px;padding:3px 10px;font-size:12px;font-weight:700}' +
      '.rjp button,.rjp-box button{font:inherit;font-weight:800;border-radius:11px;padding:11px 16px;cursor:pointer;text-decoration:none;display:inline-block;border:0}' +
      '.rjp .go,.rjp-box .go{background:#f5b82e;color:#2a1d00}.rjp .go:disabled,.rjp-box .go:disabled{opacity:.6;cursor:wait}.rjp .ln,.rjp-box .ln{background:none;color:#1a56db;padding:6px 0;font-weight:700;font-size:13px}' +
      '.rjp small{display:block;color:var(--muted,#51607a);font-size:12px;margin-top:8px}.rjp small a{color:#1a56db}' +
      '.rjp .row{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #f0e3c0;font-size:15px;flex-wrap:wrap}.rjp .row:first-of-type{border-top:0}' +
      '.rjp .row b{min-width:120px;color:var(--navy,#0a1d36)}.rjp .row a{color:#1a56db;font-weight:700;word-break:break-all}' +
      '.rjp .ok{background:#e8f6ee;border:1px solid #bfe3cd;color:#11623f;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:8px}.rjp .er,.rjp-box .er{color:#b42318;font-size:13px;margin-top:8px}' +
      '.rjp-back{position:fixed;inset:0;z-index:99999;background:rgba(5,12,25,.7);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.rjp-box{background:#fff;border-radius:18px;max-width:430px;width:100%;padding:22px;max-height:92vh;overflow:auto;font:15px/1.5 system-ui,sans-serif;color:#13233b}' +
      '.rjp-box h3{margin:0 0 6px}.rjp-box label{display:block;font-size:13px;font-weight:700;margin-top:12px}' +
      '.rjp-box input[type=email],.rjp-box input[type=tel],.rjp-box input[type=text]{width:100%;box-sizing:border-box;padding:11px;border:1px solid #c9d3e3;border-radius:10px;font:inherit;margin-top:4px}' +
      '.rjp-box .chk{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:13px}.rjp-box .chk input{margin-top:3px}';
    document.head.appendChild(s);
  }

  /* ---------- paid details view ---------- */
  function renderContact(card, d, payId) {
    card.innerHTML = '';
    var t = el('h2', {}, '✅ HR Contact & Hiring Details');
    card.appendChild(t);
    if (payId) card.appendChild(el('div', { class: 'ok' }, 'Payment ID: ' + payId + ' (sambhal kar rakhiye, doosre device par dekhne ke kaam aayegi)'));
    function row(label, node) { if (node) card.appendChild(el('div', { class: 'row' }, el('b', {}, label), node)); }
    var digits = function (s) { return String(s || '').replace(/[^\d+]/g, ''); };
    row('HR Name', d.hr_name && document.createTextNode(d.hr_name));
    row('Phone', d.hr_phone && el('a', { href: 'tel:' + digits(d.hr_phone) }, d.hr_phone));
    row('WhatsApp', d.hr_whatsapp && el('a', { href: 'https://wa.me/' + digits(d.hr_whatsapp).replace(/^\+/, ''), target: '_blank', rel: 'noopener noreferrer' }, d.hr_whatsapp));
    row('Email', d.hr_email && el('a', { href: 'mailto:' + encodeURIComponent(d.hr_email).replace('%40', '@') }, d.hr_email));
    row('Career page', /^https?:\/\//i.test(d.career_url || '') && el('a', { href: d.career_url, target: '_blank', rel: 'noopener noreferrer nofollow' }, d.career_url));
    row('Hiring tips', d.insider_note && document.createTextNode(d.insider_note));
    card.appendChild(el('small', {}, 'HR ko call/message karte waqt politely baat kijiye. Hum job ya selection ki guarantee nahi dete. Galat ya band number mile to ', el('a', { href: 'refund.html' }, 'refund policy'), ' dekhein.'));
  }

  function reveal(card, jobId, proof, silent) {
    return post(C.fn + '/rj-job-reveal', Object.assign({ job_id: jobId }, proof)).then(function (d) {
      store.set('rjp_' + jobId, { p: proof.payment_id, e: proof.email || (store.get('rjp_' + jobId) || {}).e || '' });
      renderContact(card, d, silent ? '' : proof.payment_id);
    });
  }

  /* ---------- checkout ---------- */
  function openModal(info, jobId, card, onDone) {
    var saved = store.get('rjp_email') || {};
    var msg = el('div', { class: 'er' });
    var em = el('input', { type: 'email', placeholder: 'aap@email.com', value: saved.e || '' });
    var ph = el('input', { type: 'tel', placeholder: 'Mobile (optional)', value: saved.m || '' });
    var agree = el('input', { type: 'checkbox' });
    var back = el('div', { class: 'rjp-back' });
    function close() { back.remove(); }
    var payBtn = el('button', { class: 'go', style: 'width:100%;margin-top:14px', onclick: function () {
      var e = em.value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) { msg.textContent = 'Sahi email daliye'; return; }
      if (!agree.checked) { msg.textContent = 'Terms aur Refund policy se sehmat hona zaroori hai'; return; }
      var phone = ph.value.replace(/\D/g, '');
      store.set('rjp_email', { e: e, m: phone });
      payBtn.disabled = true; msg.textContent = 'Payment khul rahi hai…';
      var loadRz = window.Razorpay ? Promise.resolve() : new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
      loadRz.then(function () { return post(C.fn + '/rj-job-order', { job_id: jobId, email: e, phone: phone }); }).then(function (o) {
        var rz = new window.Razorpay({ key: C.razorpayKey, order_id: o.order_id, amount: o.amount, currency: 'INR', name: 'Rajasthan Job',
          description: 'HR contact & hiring details', prefill: { email: e, contact: phone }, theme: { color: '#f5b82e' },
          modal: { ondismiss: function () { payBtn.disabled = false; msg.textContent = ''; } },
          handler: function (r) {
            msg.textContent = 'Payment mil gayi, details la rahe hain…';
            reveal(card, jobId, { payment_id: r.razorpay_payment_id, order_id: r.razorpay_order_id, signature: r.razorpay_signature, email: e }, false)
              .then(close).catch(function (x) { msg.textContent = (x.message || 'Details nahi aayi') + ' — Payment ID: ' + r.razorpay_payment_id + '. Is ID aur email se "Pehle pay kar diya?" option use kijiye ya humse contact kijiye.'; payBtn.disabled = false; });
          } });
        rz.on('payment.failed', function () { payBtn.disabled = false; msg.textContent = 'Payment fail ho gayi. Dobara try kijiye.'; });
        rz.open();
      }).catch(function (x) { payBtn.disabled = false; msg.textContent = x.message || 'Payment shuru nahi ho payi'; });
    } }, '₹' + info.price + ' pay karke unlock karein');
    back.appendChild(el('div', { class: 'rjp-box' },
      el('h3', {}, '🔒 Unlock HR Contact — ₹' + info.price),
      el('p', { style: 'margin:0;font-size:14px;color:#51607a' }, 'Is ek job ke liye: ' + info.fields.join(', ') + '. Ek baar payment, is job ke liye hamesha access.'),
      el('label', {}, 'Email (payment receipt aur dobara access ke liye)'), em,
      el('label', {}, 'Mobile'), ph,
      el('label', { class: 'chk' }, agree, el('span', {}, 'Main ', el('a', { href: 'terms.html', target: '_blank' }, 'Terms'), ', ', el('a', { href: 'privacy.html', target: '_blank' }, 'Privacy'), ' aur ', el('a', { href: 'refund.html', target: '_blank' }, 'Refund policy'), ' se sehmat hoon. Ye ek digital jaankari hai jo payment ke turant baad dikhti hai.')),
      payBtn, msg,
      el('button', { class: 'ln', style: 'display:block;margin:8px auto 0', onclick: close }, 'Abhi nahi')));
    document.body.appendChild(back);
  }

  function recoverForm(card, jobId, info) {
    var msg = el('div', { class: 'er' });
    var pid = el('input', { type: 'text', placeholder: 'Payment ID (pay_xxxxxxxx)' });
    var em = el('input', { type: 'email', placeholder: 'Payment ke time wala email' });
    var go = el('button', { class: 'go', style: 'margin-top:10px', onclick: function () {
      go.disabled = true; msg.textContent = 'Check ho raha hai…';
      reveal(card, jobId, { payment_id: pid.value.trim(), email: em.value.trim() }, true).catch(function (x) { go.disabled = false; msg.textContent = x.message; });
    } }, 'Details dekhein');
    var wrap = el('div', { style: 'margin-top:10px' }, el('label', { style: 'font-size:13px;font-weight:700' }, 'Payment ID'), pid, el('label', { style: 'font-size:13px;font-weight:700;display:block;margin-top:8px' }, 'Email'), em, go, msg);
    [pid, em].forEach(function (i) { i.style.cssText = 'width:100%;box-sizing:border-box;padding:10px;border:1px solid #c9d3e3;border-radius:10px;font:inherit;margin-top:4px'; });
    return wrap;
  }

  function lockedView(card, info, jobId) {
    card.innerHTML = '';
    var recover = null;
    card.appendChild(el('h2', {}, '🔒 HR Contact & Hiring Details'));
    card.appendChild(el('p', {}, 'Is job ke liye HR se seedha contact karne ki jaankari available hai:'));
    card.appendChild(el('div', { class: 'tags' }, info.fields.map(function (f) { return el('span', {}, f); })));
    card.appendChild(el('button', { class: 'go', onclick: function () { openModal(info, jobId, card); } }, '₹' + info.price + ' mein unlock karein'));
    var slot = el('div', {});
    card.appendChild(el('div', {}, el('button', { class: 'ln', onclick: function () {
      if (recover) { slot.innerHTML = ''; recover = null; return; }
      recover = recoverForm(card, jobId, info); slot.appendChild(recover);
    } }, 'Pehle pay kar diya? Payment ID se dekhein')));
    card.appendChild(slot);
    card.appendChild(el('small', {}, 'Digital jaankari, payment ke turant baad dikhti hai. Job ya selection ki guarantee nahi. ', el('a', { href: 'refund.html' }, 'Refund policy'), ' · ', el('a', { href: 'terms.html' }, 'Terms')));
  }

  /* ---------- public entry ---------- */
  function mount(box, jobId) {
    if (!C.sbUrl || !C.sbKey || /PASTE/i.test(C.sbUrl + C.sbKey)) return;      // not configured yet: show nothing
    if (!box || !JOB_RE.test(String(jobId || '')) || box.getAttribute('data-rjp')) return;
    box.setAttribute('data-rjp', '1');
    fetch(C.sbUrl + '/rest/v1/rpc/rj_premium_status', { method: 'POST', headers: { apikey: C.sbKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_ids: [jobId] }) })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var info = rows && rows[0];
        if (!info || !info.fields || !info.fields.length) return;     // this job has no paid block: show nothing
        css();
        var card = el('section', { class: 'rjp', 'aria-live': 'polite' });
        box.appendChild(card);
        lockedView(card, info, jobId);
        var s = store.get('rjp_' + jobId);
        if (s && s.p) {
          card.appendChild(el('p', {}, 'Aapki purani payment check ho rahi hai…'));
          reveal(card, jobId, { payment_id: s.p, email: s.e }, true).catch(function () { lockedView(card, info, jobId); });
        }
      }).catch(function () {});
  }
  window.RJPremium = { mount: mount };
  document.addEventListener('DOMContentLoaded', function () {
    var n = document.querySelectorAll('[data-rj-job]');
    for (var i = 0; i < n.length; i++) mount(n[i], n[i].getAttribute('data-rj-job'));
  });
})();
