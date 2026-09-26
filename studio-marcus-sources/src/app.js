/* Studio Marcus : un seul script, des modules indépendants. */
(function(){
'use strict';
var D=document, H=D.documentElement;
H.classList.add('js');
var SM=window.SM={mods:[],mq:{}};
var $=function(s,r){return (r||D).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))};
SM.$=$;SM.$$=$$;
SM.module=function(nom,fn){SM.mods.push([nom,fn])};
SM.reduit=function(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
SM.fin=function(){return !!(window.matchMedia&&matchMedia('(hover: hover) and (pointer: fine)').matches)};
SM.NB=' ';
SM.fr=function(s){return s.replace(/(\d) (h|heures|€)(?=[\s.,]|$)/g,'$1\u00a0$2').replace(/'/g,'’').replace(/« /g,'« ').replace(/ ([;:!?»€])/g,' $1')};
SM.num=function(n,dec){return n.toLocaleString('fr-FR',{minimumFractionDigits:dec||0,maximumFractionDigits:dec||0}).replace(/ /g,' ')};
SM.euros=function(n){var e=Math.round(n*100)/100;return SM.num(e,e%1?2:0)+' €'};

/* ---------- Paramètres d'adresse ---------- */
SM.p={};
(function(){
  var ok=/^[\p{L}\p{N} &'’.-]{1,28}$/u, q;
  try{q=new URLSearchParams(location.search)}catch(e){return}
  function lire(k){try{var v=q.get(k);if(v==null)return null;v=v.trim();return ok.test(v)?v:null}catch(e){return null}}
  var nom=lire('nom');if(nom)SM.p.nom=nom;
  var m=lire('metier');if(m&&/^(boulangerie|restaurant|cafe|coiffure|fleuriste|garage|cabinet|boutique|artisan)$/.test(m))SM.p.metier=m;
  var v=lire('ville');if(v)SM.p.ville=v;
  var vt=lire('vitrine');if(vt&&/^(kremer|reuter|schmit|nova|comptoir|fleurs)$/.test(vt))SM.p.vitrine=vt;
  try{var h=q.get('heure');var mm=h&&/^([01]?\d|2[0-3]):([0-5]\d)$/.exec(h);if(mm)SM.p.heure=[+mm[1],+mm[2]]}catch(e){}
})();

/* ---------- Intro : le rideau ---------- */
SM.module('intro',function(){
  var r=$('.rideau');if(!r)return;
  var fini=false;
  function retirer(){if(fini)return;fini=true;if(r.parentNode)r.parentNode.removeChild(r);SM.introFinie&&SM.introFinie()}
  if(SM.reduit()){retirer();return}
  function passer(){if(fini)return;r.classList.add('passe');setTimeout(retirer,380);['pointerdown','keydown','touchstart','wheel'].forEach(function(t){removeEventListener(t,passer,true)})}
  ['pointerdown','keydown','touchstart','wheel'].forEach(function(t){addEventListener(t,passer,{capture:true,passive:true})});
  r.addEventListener('animationend',function(e){if(e.animationName==='rideau-monte')retirer()});
  setTimeout(retirer,3500);
  SM.introPassee=function(){return fini};
});

/* ---------- Horloge du hero ---------- */
SM.module('horloge',function(){
  var eH=$('[data-heure]'),eS=$('[data-suite]');if(!eH)return;
  var fmt=null;
  try{fmt=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Luxembourg',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}catch(e){}
  function maintenant(){
    if(SM.p.heure)return SM.p.heure;
    var d=new Date();
    if(fmt){var h=0,m=0;fmt.formatToParts(d).forEach(function(p){if(p.type==='hour')h=+p.value%24;if(p.type==='minute')m=+p.value});return [h,m]}
    return [d.getHours(),d.getMinutes()];
  }
  function suite(h){
    if(h>=5&&h<11)return "Votre premier client vient de vous chercher sur son téléphone.";
    if(h>=11&&h<18)return "Quelqu'un cherche votre commerce en ce moment. Qu'est-ce qu'il trouve ?";
    if(h>=18&&h<22)return "Votre boutique vient de fermer. Votre site, lui, reste ouvert.";
    return "Tout le quartier dort. Votre vitrine, elle, reste allumée.";
  }
  function maj(){
    var t=maintenant(),h=t[0],m=t[1];
    eH.textContent='Il est '+h+' h '+(m<10?'0':'')+m+'.';
    eS.textContent=SM.p.nom?SM.p.nom+', votre vitrine est allumée plus bas.':SM.fr(suite(h));
    SM.heure=h;
  }
  maj();
  if(!SM.p.heure){(function boucle(){var d=new Date();setTimeout(function(){maj();boucle()},(60-d.getSeconds())*1000-d.getMilliseconds()+60)})()}
  if(SM.p.nom){var b=$('[data-bouton-principal]');if(b){b.textContent='Voir la vitrine de '+SM.p.nom;b.setAttribute('href','#vitrine')}}
});

/* ---------- Halo, fil de progression, en-tête ---------- */
SM.module('halo',function(){
  var h=$('.halo');if(!h||SM.reduit())return;
  if(!SM.fin())return;
  var x=innerWidth*.7,y=innerHeight*.3,tx=x,ty=y,en=false;
  function pas(){x+=(tx-x)*.1;y+=(ty-y)*.1;h.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';if(Math.abs(tx-x)+Math.abs(ty-y)>.5)requestAnimationFrame(pas);else en=false}
  addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;tx=e.clientX;ty=e.clientY;if(!en){en=true;requestAnimationFrame(pas)}},{passive:true});
  h.style.transform='translate3d('+x+'px,'+y+'px,0)';
});
SM.module('defilement',function(){
  var fil=$('.fil'),ent=$('.entete'),hero=$('.hero'),att=false;
  function maj(){
    att=false;
    var max=D.documentElement.scrollHeight-innerHeight,y=window.scrollY||pageYOffset;
    if(fil)fil.style.transform='scaleY('+(max>0?Math.min(1,y/max):0).toFixed(4)+')';
    if(ent&&hero){var v=y>hero.offsetHeight*.6;if(v!==ent.classList.contains('visible'))ent.classList.toggle('visible',v)}
  }
  addEventListener('scroll',function(){if(!att){att=true;requestAnimationFrame(maj)}},{passive:true});
  addEventListener('resize',function(){if(!att){att=true;requestAnimationFrame(maj)}},{passive:true});
  maj();
});

/* ---------- Accent qui glisse, rue ---------- */
SM.module('accent',function(){
  if(!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){H.style.setProperty('--accent',e.target.getAttribute('data-accent'))}})},{rootMargin:'-50% 0px -50% 0px'});
  $$('[data-accent]').forEach(function(s){io.observe(s)});
  var rue=$('[data-rue]');
  if(rue){new IntersectionObserver(function(es){es.forEach(function(e){H.classList.toggle('dans-rue',e.isIntersecting)})},{rootMargin:'-40% 0px -40% 0px'}).observe(rue)}
});

/* ---------- Éclairage des vitrines ---------- */
SM.module('eclairage',function(){
  var vts=$$('.vt');
  if(!('IntersectionObserver' in window)){vts.forEach(function(v){v.classList.add('allumee')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('allumee');io.unobserve(e.target)}})},{threshold:.3});
  vts.forEach(function(v){io.observe(v)});
  if(!SM.fin())return;
  var p=$('.pastille'),px=-100,py=-100,att=false;
  function place(){att=false;p.style.transform='translate3d('+(px+14)+'px,'+(py+14)+'px,0)'}
  $$('.vt .vt-cadre').forEach(function(c){
    var ref=$('.vt-reflet',c);
    c.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')p.classList.add('on')});
    c.addEventListener('pointerleave',function(){p.classList.remove('on')});
    c.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;px=e.clientX;py=e.clientY;var r=c.getBoundingClientRect();if(ref)ref.style.setProperty('--rx',((e.clientX-r.left)/r.width-.5)*140+'px');if(!att){att=true;requestAnimationFrame(place)}},{passive:true});
  });
});

/* ---------- Miniatures : mise à l'échelle ---------- */
SM.miniature=function(ecran,opt){
  opt=opt||{};
  function maj(){
    var ordi=innerWidth>900,w=ordi?1280:390,h=ordi?800:720,W=ecran.clientWidth;if(!W)return;
    var k=W/w;ecran.style.setProperty('--k',k);ecran.style.setProperty('--mq-w',w+'px');ecran.style.height=(h*k)+'px';
    if(opt.apres)opt.apres(k,w,h);
  }
  maj();
  if('ResizeObserver' in window){new ResizeObserver(function(){maj()}).observe(ecran)}
  addEventListener('resize',maj,{passive:true});
  return maj;
};
SM.module('miniatures',function(){$$('.vt [data-ecran]').forEach(function(e){SM.miniature(e)})});

/* ---------- Maquettes : chorégraphie et activité ---------- */
SM.rejouer=function(root){
  if(!root)return;
  root.classList.remove('joue');void root.offsetWidth;root.classList.add('joue');
  var id=root.getAttribute('data-mq'),m=SM.mq[id];
  if(m&&m.rejouer){try{m.rejouer(root)}catch(e){}}
};
SM.actifs=function(){
  var ouvert=SM.calqueMq||null,vus=SM.vus||[];
  $$('.mq').forEach(function(r){
    var a;
    var rue=vus.filter(function(x){return x.closest('.vt')});
    if(ouvert)a=(r===ouvert);
    else if(r.closest('.vt')){var i=rue.indexOf(r);a=i>-1&&i<2}
    else a=vus.indexOf(r)>-1;
    var avant=r.getAttribute('data-actif')==='true';
    r.setAttribute('data-actif',a?'true':'false');
    if(a&&!avant&&!r._vu){r._vu=true;SM.rejouer(r)}
  });
};
SM.module('activite',function(){
  var ratios=new Map();
  function trier(){
    var l=[];ratios.forEach(function(v,k){if(v>0)l.push([k,v])});
    l.sort(function(a,b){return b[1]-a[1]});SM.vus=l.map(function(x){return x[0]});SM.actifs();
  }
  if(!('IntersectionObserver' in window)){$$('.mq').forEach(function(r){r.setAttribute('data-actif','true');r.classList.add('joue')});return}
  SM.ioMq=new IntersectionObserver(function(es){es.forEach(function(e){ratios.set(e.target,e.isIntersecting?e.intersectionRatio:0)});trier()},{threshold:[0,.1,.25,.5,.75,1]});
  $$('.mq').forEach(function(r){SM.ioMq.observe(r)});
  $$('.mq').forEach(function(r){var id=r.getAttribute('data-mq'),m=SM.mq[id];if(m&&m.init){try{m.init(r)}catch(e){console.warn(e)}}});
});

/* ---------- Boutons de démonstration et navigation interne ---------- */
SM.bulle=function(msg){
  var sc=$('[data-scene]');if(!sc)return;
  var b=$('.bulle-demo',sc);if(!b){b=D.createElement('p');b.className='bulle-demo';b.setAttribute('role','status');sc.appendChild(b)}
  b.textContent=msg;b.hidden=false;clearTimeout(SM._bt);SM._bt=setTimeout(function(){b.hidden=true},2600);
};
SM.module('demo',function(){
  var msgs={appel:"Dans le vrai site, ce bouton appelle directement le commerce.",itineraire:"Dans le vrai site, ce bouton ouvre l'itinéraire dans votre application de cartes.",rdv:"Dans le vrai site, ce bouton ouvre la prise de rendez-vous.",envoi:"Dans le vrai site, ce message arriverait dans votre boîte e-mail."};
  D.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-demo],[data-aller]');if(!t)return;
    var root=t.closest('.mq');if(!root)return;
    if(t.hasAttribute('data-aller')){var cible=$('[data-section="'+t.getAttribute('data-aller')+'"]',root);if(cible)cible.scrollIntoView({behavior:SM.reduit()?'auto':'smooth',block:'start'});return}
    SM.bulle(SM.fr(msgs[t.getAttribute('data-demo')]||"Démonstration : dans le vrai site, ce bouton fonctionne."));
  });
});

/* ---------- Calque plein écran ---------- */
SM.module('calque',function(){
  var c=$('[data-calque]');if(!c)return;
  var cadre=$('[data-calque-cadre]',c),nomE=$('[data-calque-nom]',c),menE=$('[data-calque-mention]',c);
  var ordre=['kremer','reuter','schmit','nova','comptoir','fleurs'];
  var infos={kremer:['Boulangerie Kremer','Vitrine'],reuter:['Reuter & Associés','Vitrine'],schmit:['Garage Schmit','Vitrine Pro'],nova:['Studio Nova','Vitrine Pro'],comptoir:['Le Comptoir','Sur-mesure'],fleurs:['Fleurs & Cie','Sur-mesure']};
  var courant=null,hote=null,origine=null,mode='ordi',y=0,tel=null,telEcran=null;
  function mqDe(id){return $('.mq[data-mq="'+id+'"]')}
  function vtDe(id){return $('.vt[data-vt="'+id+'"]')}
  function placer(){
    var mq=SM.calqueMq;if(!mq)return;
    var petit=innerWidth<=640;
    var t=(mode==='tel'&&!petit);
    c.classList.toggle('tel',t);
    if(t){
      if(!tel){tel=D.createElement('div');tel.className='telephone';telEcran=D.createElement('div');telEcran.className='telephone-ecran';tel.appendChild(telEcran)}
      if(tel.parentNode!==cadre){cadre.textContent='';cadre.appendChild(tel)}
      if(mq.parentNode!==telEcran)telEcran.appendChild(mq);
      var dispo=cadre.clientHeight-24,k=Math.min(1,dispo/864);tel.style.transform=k<1?'scale('+k+')':'';
      telEcran.scrollTop=0;
    }else{
      if(tel&&tel.parentNode)tel.parentNode.removeChild(tel);
      if(mq.parentNode!==cadre)cadre.appendChild(mq);
      cadre.scrollTop=0;
    }
    $$('.bascule button',c).forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-mode')===mode?'true':'false')});
  }
  function etiquette(id){
    var i=infos[id],perso=SM.p.nom&&SM.p.vitrine===id;
    nomE.textContent=(perso?SM.p.nom:i[0])+', '+i[1];
    menE.textContent=perso?'Démonstration préparée pour '+SM.p.nom:'Commerce imaginaire, démonstration';
    c.setAttribute('aria-label',(perso?SM.p.nom:i[0])+' : boutique en plein écran, démonstration');
  }
  function rendre(){if(SM.calqueMq&&hote){hote.appendChild(SM.calqueMq);if(SM.visiteReset)SM.visiteReset(SM.calqueMq)}SM.calqueMq=null;hote=null}
  function monter(id){
    var mq=mqDe(id);if(!mq)return;
    rendre();
    courant=id;hote=mq.parentNode;SM.calqueMq=mq;
    if(SM.visiteReset)SM.visiteReset(mq);
    etiquette(id);placer();SM.actifs();SM.rejouer(mq);
  }
  function verrou(on){
    var m=$('main'),e=$('.entete'),p=$('.pied');
    [m,e,p].forEach(function(x){if(x){x.inert=on;if(on)x.setAttribute('aria-hidden','true');else x.removeAttribute('aria-hidden')}});
    if(on){y=window.scrollY||pageYOffset;H.classList.add('calque-ouvert');D.body.style.position='fixed';D.body.style.top=-y+'px';D.body.style.left='0';D.body.style.right='0'}
    else{H.classList.remove('calque-ouvert');D.body.style.position='';D.body.style.top='';D.body.style.left='';D.body.style.right='';H.style.scrollBehavior='auto';window.scrollTo(0,y);H.style.scrollBehavior=''}
  }
  function ouvrir(id,depuis){
    if(!mqDe(id))return;
    if(SM.calqueMq){monter(id);return}
    origine=depuis||$('.vt-cadre',vtDe(id));
    var vc=$('.vt-cadre',vtDe(id));
    function faire(){
      if(vc)vc.style.viewTransitionName='';
      verrou(true);c.hidden=false;monter(id);cadre.style.viewTransitionName='boutique';
      var s=$('[data-sortir]',c);s&&s.focus({preventScroll:true});
    }
    if(D.startViewTransition&&!SM.reduit()&&vc){
      vc.style.viewTransitionName='boutique';
      try{var t=D.startViewTransition(faire);t.finished.then(nettoie,nettoie)}catch(e){vc.style.viewTransitionName='';faire();nettoie()}
    }else{
      faire();nettoie();
      if(!SM.reduit()){c.classList.remove('entre');void c.offsetWidth;c.classList.add('entre')}
    }
    function nettoie(){cadre.style.viewTransitionName='';if(vc)vc.style.viewTransitionName=''}
  }
  function fermer(){
    if(!SM.calqueMq)return;
    rendre();c.hidden=true;c.classList.remove('entre','tel');cadre.textContent='';courant=null;
    verrou(false);SM.actifs();
    if(origine&&origine.focus)origine.focus({preventScroll:true});
  }
  function voisin(d){if(!courant)return;var i=(ordre.indexOf(courant)+d+ordre.length)%ordre.length;monter(ordre[i])}
  SM.ouvrir=ouvrir;SM.fermer=fermer;
  D.addEventListener('click',function(e){if(!e.isTrusted&&e.target.closest&&e.target.closest('.mq-hote'))return;var t=e.target.closest&&e.target.closest('[data-ouvrir]');if(t&&!c.contains(t)){e.preventDefault();ouvrir(t.getAttribute('data-ouvrir'),t.classList.contains('vt-lien')?t.closest('.vt-cadre'):t)}});
  $$('.vt-cadre[data-ouvrir]').forEach(function(v){v.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrir(v.getAttribute('data-ouvrir'),v)}})});
  $('[data-sortir]',c).addEventListener('click',fermer);
  $('[data-prec]',c).addEventListener('click',function(){voisin(-1)});
  $('[data-suiv]',c).addEventListener('click',function(){voisin(1)});
  $$('.bascule button',c).forEach(function(b){b.addEventListener('click',function(){mode=b.getAttribute('data-mode');placer();SM.rejouer(SM.calqueMq)})});
  D.addEventListener('keydown',function(e){
    if(c.hidden)return;
    if(e.key==='Escape'){e.preventDefault();fermer();return}
    var tg=e.target,tag=tg&&tg.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(tg&&tg.closest&&tg.closest('[data-pas-fleches]')))return;
    if(e.key==='ArrowLeft'){e.preventDefault();voisin(-1)}else if(e.key==='ArrowRight'){e.preventDefault();voisin(1)}
  });
  addEventListener('resize',function(){if(SM.calqueMq)placer()},{passive:true});
});

/* ---------- Démonstration personnalisée (?vitrine=&nom=) ---------- */
SM.module('prospect',function(){
  var p=SM.p;
  if(p.vitrine&&p.nom){
    var mq=$('.mq[data-mq="'+p.vitrine+'"]'),vt=$('.vt[data-vt="'+p.vitrine+'"]');
    if(mq)$$('[data-nom-commerce]',mq).forEach(function(e){e.textContent=p.nom});
    if(vt){
      $$('.ens-t',vt).forEach(function(e){var n=$$('span',e);if(n.length)n.forEach(function(s){s.textContent=p.nom});else e.textContent=p.nom});
      var nm=$('[data-vt-nom]',vt);if(nm)nm.textContent=p.nom;
      var cd=$('.vt-cadre',vt);if(cd)cd.setAttribute('aria-label','Entrer dans la boutique '+p.nom+', démonstration');
    }
  }
  if(p.vitrine){
    var fait=false;function go(){if(fait)return;fait=true;SM.ouvrir&&SM.ouvrir(p.vitrine)}
    SM.introFinie=function(){setTimeout(go,60)};
    if(!$('.rideau'))setTimeout(go,60);
    setTimeout(go,1900);
  }
});

/* ---------- Accordéon ---------- */
SM.module('accordeon',function(){
  $$('.faq-b').forEach(function(b){
    b.addEventListener('click',function(){
      var r=D.getElementById(b.getAttribute('aria-controls')),o=b.getAttribute('aria-expanded')!=='true';
      b.setAttribute('aria-expanded',o?'true':'false');if(r)r.classList.toggle('ouvert',o);
    });
  });
});

/* ---------- Pancarte ---------- */
SM.module('pancarte',function(){
  var p=$('[data-pancarte]');if(!p)return;
  if(!('IntersectionObserver' in window)||SM.reduit()){p.classList.add('tourne');return}
  var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){p.classList.add('tourne');io.disconnect()}},{threshold:.6});
  io.observe(p);
});
