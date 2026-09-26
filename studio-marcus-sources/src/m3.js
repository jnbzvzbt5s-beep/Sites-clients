/* ---------- Outils partagés des maquettes Pro ---------- */
SM.onglets=function(root,o){
  o=o||{};
  var tabs=$$('[data-onglet]',root),pages=$$('[data-page]',root),volet=o.volet?$(o.volet,root):null,courant=pages[0]&&pages[0].getAttribute('data-page'),minuteur;
  pages.forEach(function(p,i){p.hidden=i>0});
  function page(id){return $('[data-page="'+id+'"]',root)}
  function haut(){var sc=root.parentElement&&root.parentElement.closest('.calque-cadre,.telephone-ecran');if(sc&&sc.scrollTop>0)sc.scrollTop=0}
  function montrer(id,anim){
    courant=id;
    tabs.forEach(function(t){t.setAttribute('aria-selected',t.getAttribute('data-onglet')===id?'true':'false')});
    function bascule(){
      pages.forEach(function(p){var on=p.getAttribute('data-page')===id;p.hidden=!on;p.classList.remove('vu')});
      var p=page(id);if(!p)return;void p.offsetWidth;p.classList.add('vu');haut();
      if(o.surPage)o.surPage(id,p);
    }
    clearTimeout(minuteur);
    if(anim&&volet&&!SM.reduit()){volet.classList.remove('balaye');void volet.offsetWidth;volet.classList.add('balaye');minuteur=setTimeout(bascule,o.mi||225)}
    else if(anim&&o.fondu&&!SM.reduit()){root.classList.add(o.fondu);minuteur=setTimeout(function(){bascule();root.classList.remove(o.fondu)},o.mi||220)}
    else bascule();
  }
  root.addEventListener('click',function(e){
    var t=e.target.closest('[data-onglet],[data-onglet-lien]');if(!t||!root.contains(t))return;
    montrer(t.getAttribute('data-onglet')||t.getAttribute('data-onglet-lien'),true);
  });
  return {montrer:montrer,courant:function(){return courant}};
};
SM.compter=function(el,cible,duree){
  if(SM.reduit()){el.textContent=cible;return}
  var t0=null;duree=duree||1400;el.textContent='0';
  function pas(t){if(t0===null)t0=t;var k=Math.min(1,(t-t0)/duree),v=Math.round(cible*(1-Math.pow(1-k,3)));el.textContent=v;if(k<1)requestAnimationFrame(pas)}
  requestAnimationFrame(pas);
};
SM.actif=function(root){return root.getAttribute('data-actif')==='true'};

/* ---------- M3 : Garage Schmit ---------- */
SM.mq.schmit={
  init:function(root){
    var self=this;
    this.o=SM.onglets(root,{volet:'.s-volet',surPage:function(id,p){if(id==='atelier')self.compteurs(root)}});
    var t=$$('.s-temoin',root),i=0;
    setInterval(function(){
      if(!SM.actif(root)||SM.reduit()||self.o.courant()!=='avis')return;
      t[i].classList.remove('actif');i=(i+1)%t.length;t[i].classList.add('actif');
    },5000);
  },
  compteurs:function(root){
    setTimeout(function(){$$('[data-compte]',root).forEach(function(e){SM.compter(e,+e.getAttribute('data-compte'),1500)})},350);
  },
  rejouer:function(root){if(this.o)this.o.montrer('atelier',false)}
};
