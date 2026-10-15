/* Mounts one consistent top bar, navigation and footer on every public page. */
(function(){
  var page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  // Remove the page's old chrome (CSS already hides it, so there is no flash)
  document.querySelectorAll('body>.top,body>nav,body>.dynamic,body>.bar,body>footer,header.header nav.nav').forEach(function(e){e.remove()});
  document.querySelectorAll('body>header').forEach(function(h){if(h.querySelector('.brand')&&!h.querySelector('h1'))h.remove()});

  var ico=function(d){return '<svg class="rcIco" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>'};
  var pin=ico('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>');
  var phone=ico('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>');
  var links=[['Jobs','jobs.html'],['Government jobs','government-jobs.html'],['Job seekers','job-seeker.html'],['Services','index.html#services'],['Contact','inquiry.html']];
  var menu=links.map(function(l){return '<a href="'+l[1]+'"'+(l[1]===page?' class="on" aria-current="page"':'')+'>'+l[0]+'</a>'}).join('');

  var top=document.createElement('div');top.className='rcTop';
  top.innerHTML='<div class="rcWrap"><span>'+pin+' Jaipur, Rajasthan</span><span class="rcHideSm">Private jobs · Government jobs · Career support</span><a href="tel:+916350566010">'+phone+' +91 63505 66010</a></div>';

  var nav=document.createElement('nav');nav.className='rcNav';nav.setAttribute('aria-label','Main');
  nav.innerHTML='<div class="rcWrap rcNavIn"><a class="rcBrand" href="index.html" aria-label="Rajasthan Job home"><div class="rcLogo">RJ</div><div><b>Rajasthan Job</b><small>Jobs and career support</small></div></a>'+
    '<div class="rcMenu" id="rcMenu">'+menu+'</div>'+
    '<div class="rcActions"><a class="rcBtn ghost" href="inquiry.html">Hire talent</a><a class="rcBtn primary" href="post-a-job.html">Post a job</a>'+
    '<button class="rcToggle" id="rcToggle" aria-label="Open menu" aria-expanded="false" aria-controls="rcMenu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div></div>';

  var foot=document.createElement('footer');foot.className='rcFoot';
  foot.innerHTML='<div class="rcWrap"><div class="rcFootGrid">'+
    '<div><a class="rcBrand" href="index.html"><div class="rcLogo">RJ</div><div><b>Rajasthan Job</b><small>Jobs and career support</small></div></a><p>Jobs, government recruitment information, resume and interview support for Jaipur and Rajasthan.</p></div>'+
    '<div><h4>Explore</h4><a href="jobs.html">Private jobs</a><a href="government-jobs.html">Government jobs</a><a href="job-seeker.html">Job seekers</a><a href="notes.html">Notes</a></div>'+
    '<div><h4>Services</h4><a href="inquiry.html">Job inquiry</a><a href="inquiry.html">Resume support</a><a href="inquiry.html">Interview preparation</a><a href="index.html#services">All services</a></div>'+
    '<div><h4>For employers</h4><a href="post-a-job.html">Post a job</a><a href="inquiry.html">Talk to our team</a><a href="admin-dashboard.html">Admin login</a></div></div>'+
    '<div class="rcCopy"><span>© 2026 Rajasthan Job. All rights reserved.</span><span>Please verify recruitment details from the official source before applying.</span></div></div>';

  function mount(){
    document.body.insertBefore(nav,document.body.firstChild);
    document.body.insertBefore(top,document.body.firstChild);
    document.body.appendChild(foot);
    var t=document.getElementById('rcToggle'),m=document.getElementById('rcMenu');
    t.addEventListener('click',function(){var o=m.classList.toggle('open');t.setAttribute('aria-expanded',o)});
    m.addEventListener('click',function(e){if(e.target.closest('a'))m.classList.remove('open')});
  }
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
})();
