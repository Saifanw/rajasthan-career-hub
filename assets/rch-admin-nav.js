/* Injects one consistent admin navigation bar on every admin page. */
(function(){
  var links=[
    ['Dashboard','admin-dashboard.html'],['Jobs','job-manager.html'],['Candidates','candidate-manager.html'],
    ['Enquiries','enquiry-manager.html'],['Notifications','notification-manager.html'],
    ['Notes','notes-manager.html'],['Import jobs','private-job-import.html'],['Analytics','visitor-analytics.html']
  ];
  var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var nav=document.createElement('nav');nav.className='admNav';nav.setAttribute('aria-label','Admin');
  nav.innerHTML='<div class="admNavIn"><a class="admBrand" href="admin-dashboard.html"><span class="admLogo">RJ</span>Rajasthan Job<em>Admin</em></a><div class="admLinks">'+
    links.map(function(l){return '<a href="'+l[1]+'"'+(l[1]===here?' class="on" aria-current="page"':'')+'>'+l[0]+'</a>'}).join('')+
    '</div><a class="admSite" href="index.html" target="_blank" rel="noopener">View site ↗</a></div>';
  function mount(){document.body.insertBefore(nav,document.body.firstChild)}
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
})();
