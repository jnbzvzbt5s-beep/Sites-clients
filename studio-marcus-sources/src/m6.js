/* ---------- M6 : Fleurs & Cie ---------- */
SM.mq.fleurs={
  SLOTS:[[0,270],[-11,250],[11,252],[-22,228],[22,226],[-5,205],[6,200],[-31,200],[31,198],[-16,178],[16,176],[0,160]],
  NOMS:{pivoine:'Pivoine',rose:'Rose',renoncule:'Renoncule',tulipe:'Tulipe',eucalyptus:'Eucalyptus',gypsophile:'Gypsophile'},
  init:function(root){
    var self=this;this.root=root;this.tiges=[];this.emb='kraft';this.embPrix=0;this.livr=false;this.mot='';
    this.scene=$('[data-scene-bouquet]',root);this.zone=$('[data-tiges]',root);
    root.addEventListener('click',function(e){
      var t=e.target.closest('button');if(!t||!root.contains(t))return;
      if(t.hasAttribute('data-fleur')&&t.classList.contains('f-choix')){self.ajouter(t.getAttribute('data-fleur'),+t.getAttribute('data-prix'));return}
      if(t.classList.contains('f-tige-fleur')){self.retirer(t.parentNode);return}
      if(t.hasAttribute('data-commander')){self.commander();return}
      if(t.hasAttribute('data-recommencer')){self.recommencer();return}
    });
    $$('input[name="emballage"]',root).forEach(function(r){r.addEventListener('change',function(){self.emb=r.value;self.embPrix=+r.getAttribute('data-emb');self.scene.setAttribute('data-emballage',r.value);self.change()})});
    $('[data-livraison]',root).addEventListener('change',function(e){self.livr=e.target.checked;self.change()});
    root.addEventListener('change',function(){self.coches()});this.coches();
    var mot=$('[data-mot]',root);
    mot.addEventListener('input',function(){self.mot=mot.value.slice(0,60);self.etiquette();self.annule()});
    var red=SM.reduit;SM.reduit=function(){return true};
    [['pivoine',6],['eucalyptus',2.5],['rose',4],['renoncule',3.5],['gypsophile',2]].forEach(function(x){self.ajouter(x[0],x[1])});
    SM.reduit=red;this.maj(false);
  },
  coches:function(){$$('.f-radio,.f-coche',this.root).forEach(function(l){var i=$('input',l);l.classList.toggle('coche',!!(i&&i.checked))})},
  total:function(){var t=this.embPrix+(this.livr?8:0);this.tiges.forEach(function(x){t+=x.prix});return Math.round(t*100)/100},
  libre:function(){var pris=this.tiges.map(function(x){return x.slot});for(var i=0;i<12;i++)if(pris.indexOf(i)<0)return i;return -1},
  ajouter:function(f,prix){
    var r=this.root,i=this.libre();
    if(i<0){$('[data-complet]',r).textContent='Votre bouquet est complet.';return}
    this.annule();
    var s=this.SLOTS[i],el=D.createElement('div');el.className='f-tige'+(SM.reduit()?'':' pousse');el.style.setProperty('--a',s[0]+'deg');el.style.setProperty('--h','calc('+s[1]+'px * var(--sc,1))');el.style.zIndex=20-i;
    var tr=D.createElement('span');tr.className='f-tige-trait';var fe=D.createElement('span');fe.className='f-tige-feuille';
    var b=D.createElement('button');b.type='button';b.className='f-tige-fleur';b.setAttribute('aria-label','Retirer du bouquet : '+this.NOMS[f]);
    var src=$('.f-choix[data-fleur="'+f+'"] .f-tete',r);if(src)b.appendChild(src.cloneNode(true));
    el.appendChild(tr);el.appendChild(fe);el.appendChild(b);this.zone.appendChild(el);
    this.tiges.push({el:el,slot:i,fleur:f,prix:prix});
    this.maj(true);
  },
  retirer:function(el){
    var k=-1;this.tiges.forEach(function(x,j){if(x.el===el)k=j});if(k<0)return;
    this.annule();this.tiges.splice(k,1);el.classList.add('part');
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},SM.reduit()?0:260);
    this.maj(true);
  },
  change:function(){this.annule();this.maj(true)},
  annule:function(){var r=this.root;this.scene.classList.remove('commande');$('[data-recap]',r).hidden=true;$('[data-f-msg]',r).textContent=''},
  etiquette:function(){var e=$('[data-etiquette]',this.root);e.hidden=!this.mot;$('[data-etiq-txt]',this.root).textContent=this.mot;var n=$('[data-mot-reste]',this.root);var rest=60-this.mot.length;n.textContent=rest+(rest>1?' caractères':' caractère')},
  maj:function(anim){
    var r=this.root,n=this.tiges.length,tot=$('[data-total]',r);
    $('[data-complet]',r).textContent=n>=12?'Votre bouquet est complet.':(n===0?'Touchez une fleur pour commencer le bouquet.':'');
    $('[data-compte-tiges]',r).textContent=n===0?'Aucune tige pour l’instant':n+(n>1?' tiges':' tige')+' sur 12';
    tot.textContent=SM.euros(this.total());
    if(anim&&!SM.reduit()){tot.classList.remove('tressaille');void tot.offsetWidth;tot.classList.add('tressaille')}
  },
  commander:function(){
    var r=this.root;
    if(!this.tiges.length){$('[data-f-msg]',r).textContent='Ajoutez au moins une fleur.';return}
    var noms={kraft:'papier kraft',lin:'toile de lin',vase:'vase en verre'},n=this.tiges.length;
    this.scene.classList.remove('commande');void this.scene.offsetWidth;this.scene.classList.add('commande');
    var t=n+(n>1?' tiges':' tige')+', '+noms[this.emb]+(this.mot?', avec un mot doux':'')+(this.livr?', livré aujourd’hui à Dudelange':', à retirer à l’atelier')+'. Total : '+SM.euros(this.total())+'.';
    $('[data-recap-txt]',r).textContent=t;$('[data-recap]',r).hidden=false;$('[data-f-msg]',r).textContent='';
  },
  recommencer:function(){
    var r=this.root;this.tiges.forEach(function(x){if(x.el.parentNode)x.el.parentNode.removeChild(x.el)});this.tiges=[];
    this.emb='kraft';this.embPrix=0;this.livr=false;this.mot='';
    $('input[value="kraft"]',r).checked=true;this.scene.setAttribute('data-emballage','kraft');$('[data-livraison]',r).checked=false;$('[data-mot]',r).value='';
    this.etiquette();this.annule();this.coches();this.maj(true);
  },
  rejouer:function(){}
};
