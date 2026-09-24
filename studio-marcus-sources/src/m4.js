/* ---------- M4 : Studio Nova ---------- */
SM.mq.nova={
  init:function(root){
    var h=$('[data-lettres]',root);
    if(h&&!h._fait){
      h._fait=true;var txt=h.textContent,n=0;h.setAttribute('aria-label',txt);h.textContent='';
      txt.split(' ').forEach(function(mot,i,arr){
        var m=D.createElement('span');m.className='n-mot';m.setAttribute('aria-hidden','true');
        Array.prototype.forEach.call(mot,function(c){var s=D.createElement('span');s.className='n-l';s.style.setProperty('--l',n++);s.textContent=c;m.appendChild(s)});
        h.appendChild(m);if(i<arr.length-1)h.appendChild(D.createTextNode(' '));
      });
    }
    this.o=SM.onglets(root,{fondu:'n-sort',mi:220});
    var ruban=$('.n-ruban',root);
    $$('[data-gal]',root).forEach(function(b){b.addEventListener('click',function(){
      var v=$('.n-vis',ruban),pas=v?v.getBoundingClientRect().width+20:300;
      var k=ruban.getBoundingClientRect().width/ruban.offsetWidth||1;
      ruban.scrollBy({left:(+b.getAttribute('data-gal'))*pas/k,behavior:SM.reduit()?'auto':'smooth'});
    })});
  },
  rejouer:function(root){if(this.o)this.o.montrer('salon',false)}
};
