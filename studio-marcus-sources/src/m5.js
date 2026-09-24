/* ---------- M5 : Le Comptoir ---------- */
(function(){
var T={
fr:{nav_salle:'La salle',nav_reserver:'Réserver',nav_soir:'Ce soir',appeler:'Appeler',langue:'Langue',hero_sur:'Bistrot de marché, Esch-sur-Alzette',hero_titre:'Votre table vous attend.',hero_sous:"Cuisine de marché, vins du Luxembourg et du Portugal. Rue Zénon Bernard, à deux pas de la place de l'Hôtel de Ville.",hero_btn:'Réserver une table',salle_titre:'Choisissez votre table.',salle_aide:'Faites pivoter la salle du doigt, puis touchez une table.',bar:'Bar',tourner_g:'Tourner à gauche',tourner_d:'Tourner à droite',vue_face:'Vue de face',res_titre:'Votre réservation',jour:'Jour',heure:'Heure',couverts:'Couverts',table:'Table',moins:'Un couvert de moins',plus:'Un couvert de plus',confirmer:'Confirmer',confirmee:'Réservation confirmée',soir_titre:'Ce soir en cuisine',
 plat1:'Filet de sandre, beurre au riesling',plat1_d:'Sandre de la Moselle, pommes de terre fondantes, riesling de Remich.',plat2:'Bacalhau à Brás, oignons confits',plat2_d:'Morue effilochée, pommes paille, œuf coulant et olives noires.',plat3:'Judd mat Gaardebounen',plat3_d:'Collet de porc fumé, fèves des marais à la crème, pommes de terre sautées.',
 horaires:'Du mardi au samedi, de 12 h à 14 h et de 19 h à 22 h 30',tableN:'Table {n}, {p} places',salon:'Table 11, salon privé, 8 à 10 places',prise:'déjà réservée',trop:'trop petite',complet:'complet',libre:"Attribuée à l'arrivée",choisir:'À choisir',cv1:'1 couvert',cvN:'{n} couverts',grande:'Pour {n} couverts, le salon privé vous est proposé.',grandePrise:'Pour {n} couverts, seul le salon privé convient.',manque:"Il reste à choisir : l'heure.",loc:'fr-FR'},
de:{nav_salle:'Der Saal',nav_reserver:'Reservieren',nav_soir:'Heute Abend',appeler:'Anrufen',langue:'Sprache',hero_sur:'Marktbistro in Esch-sur-Alzette',hero_titre:'Ihr Tisch wartet auf Sie.',hero_sous:'Marktküche, Weine aus Luxemburg und Portugal. In der Rue Zénon Bernard, nur wenige Schritte vom Rathausplatz.',hero_btn:'Tisch reservieren',salle_titre:'Wählen Sie Ihren Tisch.',salle_aide:'Drehen Sie den Saal mit dem Finger und tippen Sie dann auf einen Tisch.',bar:'Bar',tourner_g:'Nach links drehen',tourner_d:'Nach rechts drehen',vue_face:'Frontansicht',res_titre:'Ihre Reservierung',jour:'Tag',heure:'Uhrzeit',couverts:'Personen',table:'Tisch',moins:'Eine Person weniger',plus:'Eine Person mehr',confirmer:'Bestätigen',confirmee:'Reservierung bestätigt',soir_titre:'Heute Abend in der Küche',
 plat1:'Zanderfilet mit Rieslingbutter',plat1_d:'Zander von der Mosel, zarte Kartoffeln, Riesling aus Remich.',plat2:'Bacalhau à Brás mit geschmorten Zwiebeln',plat2_d:'Gezupfter Stockfisch, Strohkartoffeln, weiches Ei und schwarze Oliven.',plat3:'Judd mat Gaardebounen',plat3_d:'Geräucherter Schweinekamm, dicke Bohnen in Rahmsauce, Bratkartoffeln.',
 horaires:'Dienstag bis Samstag, 12 bis 14 Uhr und 19 bis 22:30 Uhr',tableN:'Tisch {n}, {p} Plätze',salon:'Tisch 11, Separee, 8 bis 10 Plätze',prise:'bereits reserviert',trop:'zu klein',complet:'ausgebucht',libre:'Wird bei Ankunft zugewiesen',choisir:'Bitte wählen',cv1:'1 Person',cvN:'{n} Personen',grande:'Für {n} Personen bieten wir Ihnen das Separee an.',grandePrise:'Für {n} Personen passt nur das Separee.',manque:'Bitte wählen Sie noch eine Uhrzeit.',loc:'de-DE'},
en:{nav_salle:'The room',nav_reserver:'Book',nav_soir:'Tonight',appeler:'Call',langue:'Language',hero_sur:'Market bistro in Esch-sur-Alzette',hero_titre:'Your table is waiting.',hero_sous:'Market cooking, wines from Luxembourg and Portugal. On Rue Zénon Bernard, a short walk from the town hall square.',hero_btn:'Book a table',salle_titre:'Choose your table.',salle_aide:'Turn the room with your finger, then tap a table.',bar:'Bar',tourner_g:'Rotate left',tourner_d:'Rotate right',vue_face:'Front view',res_titre:'Your booking',jour:'Day',heure:'Time',couverts:'Guests',table:'Table',moins:'One guest fewer',plus:'One more guest',confirmer:'Confirm',confirmee:'Booking confirmed',soir_titre:'Tonight in the kitchen',
 plat1:'Pike-perch fillet, Riesling butter',plat1_d:'Pike-perch from the Moselle, melting potatoes, Riesling from Remich.',plat2:'Bacalhau à Brás, slow-cooked onions',plat2_d:'Shredded salt cod, straw potatoes, soft egg and black olives.',plat3:'Judd mat Gaardebounen',plat3_d:'Smoked pork collar, creamed broad beans, sautéed potatoes.',
 horaires:'Tuesday to Saturday, 12 to 2 pm and 7 to 10.30 pm',tableN:'Table {n}, {p} seats',salon:'Table 11, private room, 8 to 10 seats',prise:'already booked',trop:'too small',complet:'fully booked',libre:'Assigned on arrival',choisir:'To be chosen',cv1:'1 guest',cvN:'{n} guests',grande:'For {n} guests, we suggest the private room.',grandePrise:'For {n} guests, only the private room fits.',manque:'Please choose a time.',loc:'en-GB'},
pt:{nav_salle:'A sala',nav_reserver:'Reservar',nav_soir:'Esta noite',appeler:'Ligar',langue:'Idioma',hero_sur:'Bistrô de mercado em Esch-sur-Alzette',hero_titre:'A sua mesa está à sua espera.',hero_sous:'Cozinha de mercado, vinhos do Luxemburgo e de Portugal. Na Rue Zénon Bernard, a dois passos da praça da Câmara Municipal.',hero_btn:'Reservar mesa',salle_titre:'Escolha a sua mesa.',salle_aide:'Rode a sala com o dedo e depois toque numa mesa.',bar:'Bar',tourner_g:'Rodar para a esquerda',tourner_d:'Rodar para a direita',vue_face:'Vista de frente',res_titre:'A sua reserva',jour:'Dia',heure:'Hora',couverts:'Pessoas',table:'Mesa',moins:'Menos uma pessoa',plus:'Mais uma pessoa',confirmer:'Confirmar',confirmee:'Reserva confirmada',soir_titre:'Esta noite na cozinha',
 plat1:'Filete de lúcio-perca, manteiga de Riesling',plat1_d:'Lúcio-perca do Mosela, batatas estufadas, Riesling de Remich.',plat2:'Bacalhau à Brás, cebola confitada',plat2_d:'Bacalhau desfiado, batata palha, ovo cremoso e azeitonas pretas.',plat3:'Judd mat Gaardebounen',plat3_d:'Cachaço de porco fumado, favas com natas, batatas salteadas.',
 horaires:'De terça a sábado, das 12h às 14h e das 19h às 22h30',tableN:'Mesa {n}, {p} lugares',salon:'Mesa 11, sala privada, 8 a 10 lugares',prise:'já reservada',trop:'demasiado pequena',complet:'esgotado',libre:'Atribuída à chegada',choisir:'Por escolher',cv1:'1 pessoa',cvN:'{n} pessoas',grande:'Para {n} pessoas, propomos-lhe a sala privada.',grandePrise:'Para {n} pessoas, só a sala privada serve.',manque:'Falta escolher a hora.',loc:'pt-PT'}
};
var CRENEAUX=[[12,0],[12,30],[13,0],[13,30],[19,0],[19,30],[20,0],[20,30],[21,0]];
function jourLux(){
  try{var p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Luxembourg',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return new Date(Date.UTC(+p.year,+p.month-1,+p.day,12))}
  catch(e){var d=new Date();return new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),12))}
}
function complet(d,i){var k=d.getUTCFullYear()*400+d.getUTCMonth()*32+d.getUTCDate();var h=(k*31+i*17+(k%7)*i)%9;return h===2||h===5}
SM.mq.comptoir={
  init:function(root){
    var s=this.s={langue:'fr',jour:0,heure:null,cv:2,table:null,angle:-30,ok:false};
    var self=this,base=jourLux();
    this.jours=[];for(var i=0;i<7;i++)this.jours.push(new Date(base.getTime()+i*864e5));
    this.root=root;
    var jb=$('[data-jours]',root),cb=$('[data-creneaux]',root);
    this.jours.forEach(function(d,i){var b=D.createElement('button');b.type='button';b.className='c-jour';b.setAttribute('data-j',i);jb.appendChild(b)});
    CRENEAUX.forEach(function(c,i){var b=D.createElement('button');b.type='button';b.className='c-cren';b.setAttribute('data-c',i);cb.appendChild(b)});
    root.addEventListener('click',function(e){
      var t=e.target.closest('button');if(!t||!root.contains(t))return;
      if(t.hasAttribute('data-langue')){s.langue=t.getAttribute('data-langue');self.maj();return}
      if(t.hasAttribute('data-j')){s.jour=+t.getAttribute('data-j');if(s.heure!=null&&complet(self.jours[s.jour],s.heure))s.heure=null;s.ok=false;self.maj();return}
      if(t.hasAttribute('data-c')){if(t.disabled)return;s.heure=+t.getAttribute('data-c');s.ok=false;self.maj();return}
      if(t.hasAttribute('data-cv')){var n=Math.max(1,Math.min(10,s.cv+(+t.getAttribute('data-cv'))));if(n===s.cv)return;s.cv=n;self.couverts();s.ok=false;self.maj();return}
      if(t.hasAttribute('data-table')){if(self.glisse)return;self.choisir(+t.getAttribute('data-table'));return}
      if(t.hasAttribute('data-tourner')){s.angle+=+t.getAttribute('data-tourner');self.tourne();return}
      if(t.hasAttribute('data-face')){s.angle=0;self.tourne();return}
      if(t.hasAttribute('data-confirmer')){self.confirmer();return}
    });
    // rotation au doigt ou à la souris
    var sc=$('[data-scene-salle]',root),x0=0,a0=0,appui=false;
    sc.addEventListener('pointerdown',function(e){appui=true;self.glisse=false;x0=e.clientX;a0=s.angle});
    sc.addEventListener('pointermove',function(e){if(!appui)return;var dx=e.clientX-x0;if(!self.glisse&&Math.abs(dx)>6){self.glisse=true;sc.classList.add('glisse');try{sc.setPointerCapture(e.pointerId)}catch(_){}}if(self.glisse){s.angle=a0+dx*.4;self.tourne()}});
    function fin(){appui=false;sc.classList.remove('glisse');setTimeout(function(){self.glisse=false},0)}
    sc.addEventListener('pointerup',fin);sc.addEventListener('pointercancel',fin);
    this.tourne();this.maj();
  },
  tourne:function(){var p=$('[data-plan]',this.root);p.style.setProperty('--angle',this.s.angle+'deg')},
  t:function(k){var v=T[this.s.langue][k];return this.s.langue==='fr'?SM.fr(v):v},
  places:function(el){return +el.getAttribute('data-places')},
  couverts:function(){
    var s=this.s,self=this,tb=s.table&&$('[data-table="'+s.table+'"]',this.root);
    if(tb&&this.places(tb)<s.cv)s.table=null;
    if(s.cv>=7){var g=$('[data-table="11"]',this.root);if(g&&!g.classList.contains('c-table--prise'))s.table=11}
  },
  choisir:function(n){
    var el=$('[data-table="'+n+'"]',this.root);if(!el||el.classList.contains('c-table--prise')||this.places(el)<this.s.cv)return;
    this.s.table=(this.s.table===n?null:n);this.s.ok=false;this.maj();
  },
  nomTable:function(n){if(n===11)return this.t('salon');var el=$('[data-table="'+n+'"]',this.root);return this.t('tableN').replace('{n}',n).replace('{p}',el?el.getAttribute('data-places'):'')},
  heureTxt:function(i){var c=CRENEAUX[i],h=c[0],m=c[1];var l=this.s.langue;if(l==='fr')return h+' h'+(m?' '+m:'');if(l==='pt')return h+'h'+(m?m:'');return h+':'+(m<10?'0':'')+m},
  maj:function(){
    var s=this.s,r=this.root,self=this,L=T[s.langue];if(s.langue==='fr'){var L2={};for(var k0 in L)L2[k0]=k0==='loc'?L[k0]:SM.fr(L[k0]);L=L2}
    r.setAttribute('lang',s.langue);
    $$('[data-t]',r).forEach(function(e){var k=e.getAttribute('data-t');if(L[k]!=null)e.textContent=L[k]});
    $$('[data-ta]',r).forEach(function(e){var k=e.getAttribute('data-ta');if(L[k]!=null)e.setAttribute('aria-label',L[k])});
    $$('[data-langue]',r).forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-langue')===s.langue?'true':'false')});
    var fj=new Intl.DateTimeFormat(L.loc,{weekday:'short',timeZone:'UTC'}),fl=new Intl.DateTimeFormat(L.loc,{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
    $$('[data-j]',r).forEach(function(b){var i=+b.getAttribute('data-j'),d=self.jours[i];b.textContent='';b.appendChild(D.createTextNode(fj.format(d).replace('.','')));var n=D.createElement('b');n.textContent=d.getUTCDate();b.appendChild(n);b.setAttribute('aria-pressed',i===s.jour?'true':'false');b.setAttribute('aria-label',fl.format(d))});
    var dj=this.jours[s.jour];
    $$('[data-c]',r).forEach(function(b){var i=+b.getAttribute('data-c'),full=complet(dj,i);b.textContent=self.heureTxt(i);b.disabled=full;b.setAttribute('aria-pressed',i===s.heure?'true':'false');b.setAttribute('aria-label',self.heureTxt(i)+(full?', '+L.complet:''))});
    $('[data-cv-val]',r).textContent=s.cv;
    $$('[data-table]',r).forEach(function(b){
      var n=+b.getAttribute('data-table'),prise=b.classList.contains('c-table--prise'),trop=!prise&&self.places(b)<s.cv;
      b.classList.toggle('trop',trop);b.classList.toggle('choisie',n===s.table);
      b.setAttribute('aria-pressed',n===s.table?'true':'false');
      b.setAttribute('aria-disabled',prise||trop?'true':'false');
      b.setAttribute('aria-label',self.nomTable(n)+(prise?', '+L.prise:trop?', '+L.trop:''));
    });
    $('[data-table-etat]',r).textContent=s.table?self.nomTable(s.table):'';
    var pr=$('[data-proposition]',r);
    pr.textContent=s.cv>=7?(s.table===11?L.grande:L.grandePrise).replace('{n}',s.cv):'';
    $('[data-r="jour"]',r).textContent=fl.format(dj);
    $('[data-r="heure"]',r).textContent=s.heure==null?L.choisir:self.heureTxt(s.heure);
    $('[data-r="couverts"]',r).textContent=s.cv===1?L.cv1:L.cvN.replace('{n}',s.cv);
    $('[data-r="table"]',r).textContent=s.table?self.nomTable(s.table):L.libre;
    var c=$('[data-confirmer]',r);c.classList.toggle('ok',s.ok);$('span',c).textContent=s.ok?L.confirmee:L.confirmer;
    if(s.heure!=null)$('[data-manque]',r).textContent='';
  },
  confirmer:function(){
    var s=this.s,r=this.root;
    if(s.heure==null){var cb=$('[data-creneaux]',r);cb.classList.remove('tremble');void cb.offsetWidth;cb.classList.add('tremble');$('[data-manque]',r).textContent=this.t('manque');return}
    s.ok=true;this.maj();
  },
  rejouer:function(){}
};
})();
