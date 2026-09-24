/* ---------- Visites automatiques des vitrines : chaque miniature montre plusieurs pages ---------- */
(function(){
  var etats=new Map();
  function k(root){var e=root.closest('.vt-ecran');return e?parseFloat(e.style.getPropertyValue('--k'))||.5:1}
  function hautEcran(root){var e=root.closest('.vt-ecran');return e&&e.style.getPropertyValue('--mq-w')==='390px'?720:800}
  function panMax(root){return Math.max(0,root.offsetHeight-hautEcran(root))}
  function pan(root,px){root.style.setProperty('--pan',Math.round(Math.max(0,Math.min(panMax(root),px)))+'px')}
  function versSection(root,sel,marge){var el=$(sel,root);if(!el)return;var y=(el.getBoundingClientRect().top-root.getBoundingClientRect().top)/k(root);pan(root,y-(marge||24))}
  function onglet(root,id){var m=SM.mq[root.getAttribute('data-mq')];if(m&&m.o)m.o.montrer(id,true)}
  var V={
    kremer:[[2400,function(r){pan(r,0)}],[3200,function(r){versSection(r,'.k-pains')}],[3200,function(r){versSection(r,'.k-infos')}],[2800,function(r){pan(r,1e5)}]],
    reuter:[[2400,function(r){pan(r,0)}],[3200,function(r){versSection(r,'.r-corps')}],[2800,function(r){versSection(r,'.r-offre')}],[2800,function(r){versSection(r,'.r-equipe')}],[2400,function(r){pan(r,1e5)}]],
    schmit:[[4600,function(r){onglet(r,'atelier')}],[3400,function(r){onglet(r,'services')}],[3400,function(r){onglet(r,'occasions')}],[3800,function(r){onglet(r,'avis')}]],
    nova:[[4200,function(r){onglet(r,'salon')}],[3400,function(r){onglet(r,'prestations')}],[2000,function(r){onglet(r,'galerie')}],[1800,function(r){var b=$('[data-gal="1"]',r);b&&b.click()}],[3400,function(r){onglet(r,'equipe')}]],
    comptoir:[[2800,function(r){SM.visiteReset(r)}],[1600,function(r){versSection(r,'.c-resa')}],[1300,function(r){var m=SM.mq.comptoir;m.s.angle=0;m.tourne()}],[1500,function(r){SM.mq.comptoir.choisir(7)}],
      [1500,function(r){var m=SM.mq.comptoir,b=$$('.c-cren',r).filter(function(x){return !x.disabled})[4];if(b)b.click()}],[1400,function(r){var m=SM.mq.comptoir;m.s.angle=40;m.tourne()}],[1800,function(r){$('[data-confirmer]',r).click()}],[3000,function(r){versSection(r,'.c-soir')}]],
    fleurs:[[2200,function(r){SM.visiteReset(r)}],[1400,function(r){versSection(r,'.f-scene')}],
      [900,function(r){$('.f-choix[data-fleur="tulipe"]',r).click()}],[900,function(r){$('.f-choix[data-fleur="pivoine"]',r).click()}],[900,function(r){$('.f-choix[data-fleur="rose"]',r).click()}],[1300,function(r){$('.f-choix[data-fleur="renoncule"]',r).click()}],
      [1600,function(r){emb(r,'lin')}],[1600,function(r){emb(r,'vase')}],[1800,function(r){emb(r,'kraft');$('[data-commander]',r).click()}],[2400,function(r){versSection(r,'.f-compos')}]]
  };
  function emb(r,v){var i=$('input[value="'+v+'"]',r);if(i){i.checked=true;i.dispatchEvent(new Event('change',{bubbles:true}))}}
  SM.visiteReset=function(root,garderPan){
    var e=etats.get(root);if(e){e.i=0;e.t=0}
    if(!garderPan)root.style.setProperty('--pan','0px');
    var id=root.getAttribute('data-mq'),m=SM.mq[id];if(!m)return;
    try{
      if(id==='comptoir'&&m.s){var s=m.s;s.table=null;s.heure=null;s.angle=-30;s.ok=false;s.cv=2;s.jour=0;$('[data-manque]',root).textContent='';m.tourne();m.maj()}
      if(id==='fleurs'&&m.preremplir)m.preremplir();
      if(id==='nova'){var rb=$('.n-ruban',root);if(rb)rb.scrollLeft=0}
    }catch(err){}
  };
  SM.module('visite',function(){
    if(SM.reduit())return;
    $$('.vt .mq[data-mq]').forEach(function(r){etats.set(r,{i:0,t:0});r.classList.add('en-visite')});
    var avant=performance.now();
    setInterval(function(){
      var n=performance.now(),dt=n-avant;avant=n;
      etats.forEach(function(e,r){
        var pas=V[r.getAttribute('data-mq')];if(!pas)return;
        if(r.getAttribute('data-actif')!=='true'||!r.closest('.vt-ecran')||!r.closest('.vt.allumee'))return;
        e.t+=dt;
        if(e.t>=pas[e.i][0]){e.t=0;e.i=(e.i+1)%pas.length;try{pas[e.i][1](r)}catch(err){}}
      });
    },200);
  });
})();
