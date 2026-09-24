/* ---------- Configurateur : mettez votre nom sur la vitrine ---------- */
SM.METIERS={
  boulangerie:{lib:'boulangerie',art:'une boulangerie',sur:'Boulangerie',pal:['#F8F0E3','#2B1A0F','#B4541F','#D9A441'],titre:'Du pain chaud dès 6 h, à {ville}.',p:['Pain au levain','Viennoiseries du jour','Gâteaux sur commande']},
  restaurant:{lib:'restaurant',art:'un restaurant',sur:'Restaurant',pal:['#1A0F12','#F4E8DF','#C8453B','#E3A33B'],titre:'Une table vous attend ce soir, à {ville}.',p:['Menu du midi','Carte du soir','Réservation en ligne']},
  cafe:{lib:'café',art:'un café',sur:'Café',pal:['#F6EFE6','#2E1E14','#B8743F','#6F8F6A'],titre:"Le café qu'on vient chercher exprès.",p:['Café de spécialité','Brunch du week-end','Pâtisseries maison']},
  coiffure:{lib:'coiffure et beauté',art:'un salon de coiffure',sur:'Coiffure et beauté',pal:['#FFF7F8','#3A2231','#D47F95','#8E6BB0'],titre:'Prenez rendez-vous en trente secondes.',p:['Coupe et brushing','Coloration','Soins']},
  fleuriste:{lib:'fleuriste',art:'un fleuriste',sur:'Fleuriste',pal:['#FBFBF6','#1F2A20','#3F6B4A','#D96C86'],titre:'Des fleurs du jour, livrées à {ville}.',p:['Bouquets du jour','Mariages et événements','Abonnements']},
  garage:{lib:'garage',art:'un garage',sur:'Garage',pal:['#121416','#EEF0F2','#F2A33A','#E0492F'],titre:'Votre voiture entre de bonnes mains.',p:['Entretien toutes marques','Carrosserie','Contrôle technique']},
  cabinet:{lib:'cabinet et fiduciaire',art:'un cabinet',sur:'Cabinet et fiduciaire',pal:['#FBF8F1','#15171A','#A8844A','#6E2B34'],titre:'Un conseil clair avant chaque décision.',p:['Comptabilité','Fiscalité',"Création d'entreprise"]},
  boutique:{lib:'boutique',art:'une boutique',sur:'Boutique',pal:['#FAF6F2','#231C22','#A45A6B','#C9A46B'],titre:'La nouvelle collection est arrivée.',p:['Nouveautés','Sélection de la semaine','Retrait en boutique']},
  artisan:{lib:'artisan',art:'un artisan',sur:'Artisan',pal:['#F4F1EC','#1F1C18','#D07A2E','#5C6B55'],titre:'Un devis clair sous 48 heures.',p:['Installation','Dépannage','Rénovation']}
};
SM.slug=function(s){
  var r=s;try{r=r.normalize('NFD')}catch(e){}
  r=r.replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  r=r.slice(0,30).replace(/-$/,'');return r||'votre-commerce';
};
SM.module('configurateur',function(){
  var f=$('[data-conf]');if(!f)return;
  var iNom=f.elements.nom,iMet=f.elements.metier,iVil=f.elements.ville;
  var neonBox=$('[data-conf-neon]'),neon=$('.neon',neonBox),mail=$('[data-conf-mail]');
  var ecran=$('[data-cam-ecran]'),cam=$('.mq-cam',ecran);
  SM.miniature(ecran);
  if(SM.p.nom)iNom.value=SM.p.nom;
  if(SM.p.metier)iMet.value=SM.p.metier;
  if(SM.p.ville)iVil.value=SM.p.ville;
  var tNeon=null,tLettres=[],dernierNom=null,dernierMet=null;
  function nom(){return iNom.value.trim().slice(0,28)}
  function ville(){return iVil.value.trim().slice(0,40)||'Esch-sur-Alzette'}
  function allumer(txt,imm){
    tLettres.forEach(clearTimeout);tLettres=[];
    neon.textContent='';
    var aff=txt||'Votre commerce';
    neonBox.setAttribute('aria-label','Enseigne au néon : '+aff);
    Array.prototype.forEach.call(aff,function(c){var s=D.createElement('span');s.setAttribute('aria-hidden','true');s.setAttribute('data-l',c);s.textContent=c;neon.appendChild(s)});
    var ls=$$('span',neon);
    if(imm||SM.reduit()){ls.forEach(function(s){s.classList.add('on')});return}
    ls.forEach(function(s,i){tLettres.push(setTimeout(function(){s.classList.add('on')},i*70+Math.random()*50))});
  }
  function fondu(){
    if(SM.reduit()||!cam.parentNode)return;
    var g=cam.cloneNode(true);g.classList.add('cam-fantome');g.removeAttribute('data-mq-cam');g.setAttribute('aria-hidden','true');
    cam.parentNode.appendChild(g);void g.offsetWidth;g.style.opacity='0';
    setTimeout(function(){if(g.parentNode)g.parentNode.removeChild(g)},340);
  }
  function maj(e){
    var n=nom(),v=ville(),mk=iMet.value,m=SM.METIERS[mk]||SM.METIERS.boulangerie,aff=n||'Votre commerce';
    var metChange=mk!==dernierMet;
    if(metChange&&dernierMet!==null)fondu();
    dernierMet=mk;
    var r=SM.fr;
    // palette
    ['--c-fond','--c-texte','--c-a1','--c-a2'].forEach(function(k,i){cam.style.setProperty(k,m.pal[i])});
    neonBox.style.setProperty('--n',m.pal[2]);neon.style.setProperty('--n',m.pal[2]);
    $$('.neon span',neonBox).forEach(function(s){s.style.setProperty('--n',m.pal[2])});
    neonBox.style.setProperty('--tube',hexA(m.pal[2],.28));
    $('[data-cam-nom]',cam).textContent=aff;
    $('[data-cam-sur]',cam).textContent=m.sur+' à '+v;
    $('[data-cam-titre]',cam).textContent=r(m.titre).replace('{ville}',v);
    $('[data-cam-intro]',cam).textContent=aff+' vous accueille à '+v+'. Horaires, adresse et nouveautés sont toujours à jour, sur téléphone comme sur ordinateur.';
    m.p.forEach(function(p,i){$('[data-cam-p="'+i+'"]',cam).textContent=r(p)});
    $$('[data-ill]',cam).forEach(function(g){if(g.getAttribute('data-ill')===mk)g.removeAttribute('hidden');else g.setAttribute('hidden','')});
    // recherche
    var slug=SM.slug(n);
    $('[data-r-titre]').textContent=r("Ce que verra quelqu'un qui cherche "+m.art+' à '+v);
    $('[data-r-init]').textContent=(aff.charAt(0)||'V').toUpperCase();
    $('[data-r-init]').style.setProperty('--c-acc',m.pal[2]==='#F2A33A'?'#B06E14':m.pal[2]);
    $('[data-r-nom]').textContent=aff;
    $('[data-r-url]').textContent=slug+'.lu';
    $('[data-r-h]').textContent=aff+', '+m.lib+' à '+v;
    $('[data-r-d]').textContent=r(aff+' à '+v+' : '+m.p[0].toLowerCase()+', '+m.p[1].toLowerCase()+', '+m.p[2].toLowerCase()+". Horaires, adresse et contact en un coup d'œil.");
    // mailto
    var sujet='Ma vitrine : '+aff,corps="Bonjour Marcus, je suis "+aff+', '+m.lib+' à '+v+". J'ai vu la vitrine sur votre fiche et j'aimerais en savoir plus.";
    mail.setAttribute('href','mailto:studio.marcus.web@gmail.com?subject='+encodeURIComponent(r(sujet))+'&body='+encodeURIComponent(r(corps)));
    // néon
    if(n!==dernierNom||metChange){
      var imm=dernierNom===null;dernierNom=n;clearTimeout(tNeon);
      if(imm)allumer(n,true);
      else{$$('span',neon).forEach(function(s){s.classList.remove('on')});neonBox.setAttribute('aria-label','Enseigne au néon : '+aff);tNeon=setTimeout(function(){allumer(n)},400)}
    }
  }
  function hexA(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+a+')'}
  iNom.addEventListener('input',maj);iVil.addEventListener('input',maj);iMet.addEventListener('change',maj);
  f.addEventListener('submit',function(e){e.preventDefault()});
  maj();
  if(SM.p.nom){dernierNom=null;allumer(nom())}
});

/* ---------- Avant / après ---------- */
SM.module('avantApres',function(){
  var aa=$('[data-aa]');if(!aa)return;
  var sc=$('[data-aa-scene]',aa),ap=$('[data-aa-apres]',aa),rg=$('[data-aa-range]',aa),vx=$('.vieux',aa);
  var k=$('.mq[data-mq="kremer"]');
  if(k){
    var c=k.cloneNode(true);
    c.removeAttribute('data-mq');c.setAttribute('data-mq-clone','kremer');
    [c].concat($$('[id]',c)).forEach(function(e){e.removeAttribute('id')});
    $$('button,input,select,textarea,a',c).forEach(function(e){e.setAttribute('tabindex','-1')});
    c.setAttribute('inert','');c.classList.add('joue');c.setAttribute('data-actif','false');
    ap.appendChild(c);
    if(SM.ioMq)SM.ioMq.observe(c);
  }
  SM.miniature(sc,{apres:function(k,w){if(vx)vx.setAttribute('data-tel',w<900?'true':'false')}});
  // la scène n'a pas de flux propre : on la dimensionne comme une miniature
  function pos(){var v=+rg.value;sc.style.setProperty('--p',v+'%')}
  rg.addEventListener('input',pos);rg.addEventListener('change',pos);pos();
});
