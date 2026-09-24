// Tests d'acceptation Studio Marcus — node tests.js [fichier]
const { chromium } = require('playwright');
const fs = require('fs');
const FILE = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
const URL = 'file://' + FILE;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const res = []; const erreursGlobales = []; const externes = [];
function ok(n, c, d = '') { res.push([n, !!c, d]); console.log((c ? 'OK   ' : 'ÉCHEC ') + n + (d ? '  — ' + d : '')); }
const pause = ms => new Promise(r => setTimeout(r, ms));
let browser;
async function page(opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: opt.w || 1440, height: opt.h || 900 }, reducedMotion: opt.reduit ? 'reduce' : 'no-preference', javaScriptEnabled: opt.js !== false, hasTouch: !!opt.touch });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('dialog', d => { errs.push('dialog: ' + d.message()); d.dismiss(); });
  await ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith('file:') && !u.startsWith('data:')) { externes.push(u); return r.abort(); } r.continue(); });
  if (opt.init) await p.addInitScript(opt.init);
  p._errs = errs; p._ctx = ctx;
  await p.goto(URL + (opt.q || ''));
  if (opt.attente !== 0) await p.waitForTimeout(opt.attente || 2000);
  return p;
}
async function fin(p, nom) { if (p._errs.length) erreursGlobales.push(nom + ' : ' + p._errs.join(' | ')); await p._ctx.close(); }
const hscroll = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function ouvrir(p, id) { await p.evaluate(id => { document.querySelector('.vt[data-vt="' + id + '"]').scrollIntoView({ block: 'center', behavior: 'instant' }) }, id); await p.waitForTimeout(300); await p.click('.vt[data-vt="' + id + '"] .vt-cadre'); await p.waitForTimeout(700); }

(async () => {
  browser = await chromium.launch({ executablePath: EXE });

  // 1-2, 5 : largeurs, défilement horizontal, vitrines qui s'allument
  for (const [w, h] of [[1440, 900], [1180, 820], [834, 1194], [390, 844], [320, 640]]) {
    const p = await page({ w, h });
    let maxH = await hscroll(p);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h * 0.8) { await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(120); maxH = Math.max(maxH, await hscroll(p)); }
    ok(`[2] Aucun défilement horizontal à ${w}px`, maxH <= 0, 'dépassement ' + maxH + 'px');
    const allumees = [];
    for (const id of ['kremer', 'reuter', 'schmit', 'nova', 'comptoir', 'fleurs']) {
      await p.evaluate(id => document.querySelector('.vt[data-vt="' + id + '"]').scrollIntoView({ block: 'center', behavior: 'instant' }), id);
      await p.waitForTimeout(250);
      if (await p.evaluate(id => document.querySelector('.vt[data-vt="' + id + '"]').classList.contains('allumee'), id)) allumees.push(id);
    }
    ok(`[5] Les six vitrines s'allument à ${w}px`, allumees.length === 6, allumees.join(','));
    const actifsMax = await p.evaluate(async () => { let m = 0; for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 60)); m = Math.max(m, document.querySelectorAll('.vt .mq[data-actif="true"]').length); } return m; });
    ok(`[19] Jamais plus de deux maquettes animées à ${w}px`, actifsMax <= 2, 'max ' + actifsMax);
    // miniature : bonne largeur de conception
    const mw = await p.evaluate(() => getComputedStyle(document.querySelector('.vt .vt-ecran')).getPropertyValue('--mq-w').trim());
    ok(`[6.5] Miniature conçue sur ${w > 900 ? 1280 : 390} px à ${w}px`, mw === (w > 900 ? '1280px' : '390px'), mw);
    await fin(p, 'largeur ' + w);
  }

  // 3 : intro
  {
    let p = await page({ attente: 0 });
    await p.waitForTimeout(1950);
    const r = await p.evaluate(() => { const e = document.querySelector('.rideau'); return !e || getComputedStyle(e).visibility === 'hidden'; });
    ok('[3] L\'intro disparaît en moins de 2 s', r); await fin(p, 'intro');
    p = await page({ attente: 0, touch: true });
    await p.waitForTimeout(250); await p.mouse.click(300, 300); await p.waitForTimeout(500);
    ok('[3] L\'intro se passe au clic', await p.evaluate(() => !document.querySelector('.rideau'))); await fin(p, 'intro clic');
    p = await page({ attente: 0, touch: true });
    await p.waitForTimeout(250); await p.touchscreen.tap(200, 300); await p.waitForTimeout(500);
    ok('[3] L\'intro se passe au toucher', await p.evaluate(() => !document.querySelector('.rideau'))); await fin(p, 'intro toucher');
    p = await page({ attente: 0, init: () => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '.rideau{animation:none!important}'; document.head.appendChild(s); }); } });
    await p.waitForFunction(() => performance.now() > 3150, null, { polling: 20 }); const encore = await p.evaluate(() => !!document.querySelector('.rideau'));
    await p.waitForFunction(() => performance.now() > 4100, null, { polling: 20 }); const parti = await p.evaluate(() => !document.querySelector('.rideau'));
    ok('[3] Filet de sécurité à 3,5 s', encore && parti, `présent à 3 s : ${encore}, retiré à 3,8 s : ${parti}`); await fin(p, 'intro filet');
  }

  // 4 : heures
  for (const [q, t, s] of [['08:12', 'Il est 8 h 12.', 'Votre premier client vient de vous chercher sur son téléphone.'], ['15:47', 'Il est 15 h 47.', 'Quelqu’un cherche votre commerce en ce moment. Qu’est-ce qu’il trouve ?'], ['19:26', 'Il est 19 h 26.', 'Votre boutique vient de fermer. Votre site, lui, reste ouvert.'], ['23:40', 'Il est 23 h 40.', 'Tout le quartier dort. Votre vitrine, elle, reste allumée.'], ['04:05', 'Il est 4 h 05.', 'Tout le quartier dort. Votre vitrine, elle, reste allumée.']]) {
    const p = await page({ q: '?heure=' + q, attente: 300 });
    const [a, b] = await p.evaluate(() => [document.querySelector('[data-heure]').textContent.replace(/ /g, ' '), document.querySelector('[data-suite]').textContent.replace(/ /g, ' ')]);
    ok(`[4] ?heure=${q}`, a === t && b === s.replace(/ /g, ' '), a + ' / ' + b); await fin(p, 'heure');
  }
  {
    const p = await page({ attente: 300 });
    const [a, lux] = await p.evaluate(() => [document.querySelector('[data-heure]').textContent, new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Luxembourg', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).format(new Date())]);
    const [hh, mm] = lux.split(':');
    ok('[4] Heure réelle du Luxembourg', a === `Il est ${+hh} h ${mm}.`, a + ' vs ' + lux); await fin(p, 'heure réelle');
  }

  // 6 : ouvrir / fermer, clavier, Échap, focus, boucle
  {
    const p = await page();
    const ids = ['kremer', 'reuter', 'schmit', 'nova', 'comptoir', 'fleurs'];
    for (const id of ids) {
      await ouvrir(p, id);
      const o = await p.evaluate(id => { const c = document.querySelector('[data-calque]'); return !c.hidden && !!c.querySelector('.mq[data-mq="' + id + '"]') && document.querySelector('main').inert && c.getAttribute('role') === 'dialog' && c.getAttribute('aria-modal') === 'true'; }, id);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      const f = await p.evaluate(id => document.querySelector('[data-calque]').hidden && document.activeElement === document.querySelector('.vt[data-vt="' + id + '"] .vt-cadre') && !!document.querySelector('.vt[data-vt="' + id + '"] .mq'), id);
      ok(`[6] ${id} : clic, Échap, focus rendu`, o && f);
      await p.focus('.vt[data-vt="' + id + '"] .vt-cadre'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
      const k = await p.evaluate(() => !document.querySelector('[data-calque]').hidden);
      await p.click('[data-sortir]'); await p.waitForTimeout(300);
      ok(`[6] ${id} : ouverture à la touche Entrée, bouton Sortir`, k && await p.evaluate(() => document.querySelector('[data-calque]').hidden));
    }
    await p.click('.vt[data-vt="kremer"] .vt-plaque button[data-ouvrir]'); await p.waitForTimeout(600);
    await p.click('[data-prec]'); await p.waitForTimeout(200);
    const a = await p.evaluate(() => document.querySelector('[data-calque-cadre] .mq').getAttribute('data-mq'));
    await p.click('[data-suiv]'); await p.waitForTimeout(200);
    const b = await p.evaluate(() => document.querySelector('[data-calque-cadre] .mq').getAttribute('data-mq'));
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(200);
    const c = await p.evaluate(() => document.querySelector('[data-calque-cadre] .mq').getAttribute('data-mq'));
    ok('[6] Précédent / suivant bouclent (bouton et flèches)', a === 'fleurs' && b === 'kremer' && c === 'fleurs', [a, b, c].join(' → '));
    const y0 = await p.evaluate(() => document.body.style.top);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const y1 = await p.evaluate(() => Math.round(scrollY));
    ok('[6] Défilement bloqué puis position restaurée', y0 && Math.abs(-parseInt(y0) - y1) < 3, y0 + ' → ' + y1);
    // 7 : mode téléphone
    const sel = { kremer: '.k-liens', reuter: '.r-liens', schmit: '.s-onglets', nova: '.n-onglets', comptoir: '.c-liens', fleurs: '.f-liens' };
    for (const id of ids) {
      await ouvrir(p, id); await p.click('[data-mode="tel"]'); await p.waitForTimeout(300);
      const r = await p.evaluate(([id, s]) => { const m = document.querySelector('.telephone-ecran .mq[data-mq="' + id + '"]'); if (!m) return 'absente'; const e = m.querySelector(s), cs = getComputedStyle(e); return m.getBoundingClientRect().width + ' ' + (cs.display === 'none' || cs.order === '3'); }, [id, sel[id]]);
      ok(`[7] Mode Téléphone ${id} : 390 px et mise en page téléphone`, /^(390|\d+\.\d+) true$/.test(r) && await p.evaluate(() => document.querySelector('.telephone-ecran').clientWidth === 390), r);
      await p.click('[data-mode="ordi"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    }
    await fin(p, 'calque');
  }

  // 8 : Garage et Nova
  {
    const p = await page();
    await ouvrir(p, 'schmit');
    await p.waitForTimeout(2600);
    const cpt = await p.evaluate(() => [...document.querySelectorAll('[data-calque] [data-compte]')].map(e => e.textContent).join(','));
    const aig = await p.evaluate(() => { const a = document.querySelector('[data-calque] .s-aiguille'); return a.getAnimations().length > 0 || getComputedStyle(a).transform !== 'none'; });
    ok('[8] Garage : compteurs 9 et 24, aiguille animée', cpt === '9,24' && aig, cpt);
    const pages = [];
    for (const o of ['services', 'occasions', 'avis', 'atelier']) { await p.click(`[data-calque] [data-onglet="${o}"]`); await p.waitForTimeout(650); pages.push(await p.evaluate(o => !document.querySelector(`[data-calque] [data-page="${o}"]`).hidden, o)); }
    ok('[8] Garage : quatre pages', pages.every(Boolean), pages.join(','));
    await p.click('[data-calque] [data-onglet="avis"]'); await p.waitForTimeout(700);
    const i0 = await p.evaluate(() => [...document.querySelectorAll('[data-calque] .s-temoin')].findIndex(e => e.classList.contains('actif')));
    await p.waitForTimeout(5300);
    const i1 = await p.evaluate(() => [...document.querySelectorAll('[data-calque] .s-temoin')].findIndex(e => e.classList.contains('actif')));
    ok('[8] Garage : les avis tournent', i0 !== i1, i0 + ' → ' + i1);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await ouvrir(p, 'nova');
    const np = [];
    for (const o of ['prestations', 'galerie', 'equipe', 'salon']) { await p.click(`[data-calque] [data-onglet="${o}"]`); await p.waitForTimeout(500); np.push(await p.evaluate(o => !document.querySelector(`[data-calque] [data-page="${o}"]`).hidden, o)); }
    ok('[8] Nova : quatre pages', np.every(Boolean), np.join(','));
    await p.click('[data-calque] [data-onglet="galerie"]'); await p.waitForTimeout(600);
    const s0 = await p.evaluate(() => document.querySelector('[data-calque] .n-ruban').scrollLeft);
    await p.click('[data-calque] [data-gal="1"]'); await p.waitForTimeout(900);
    const s1 = await p.evaluate(() => document.querySelector('[data-calque] .n-ruban').scrollLeft);
    ok('[8] Nova : la galerie défile', s1 > s0, s0 + ' → ' + s1);
    await fin(p, 'garage nova');
  }

  // 9 : Comptoir
  {
    const p = await page();
    await ouvrir(p, 'comptoir');
    const C = '[data-calque] .mq-comptoir ';
    const txt = s => p.evaluate(s => document.querySelector(s).textContent.replace(/ /g, ' '), s);
    await p.click(C + '[data-table="7"]'); await p.waitForTimeout(200);
    const r1 = await txt(C + '[data-r="table"]');
    const lev = await p.evaluate(C => document.querySelector(C + '[data-table="7"]').classList.contains('choisie'), C);
    ok('[9] Table choisie → récapitulatif', r1 === 'Table 7, 4 places' && lev, r1);
    await p.click(C + '[data-table="6"]', { force: true }); await p.waitForTimeout(150);
    ok('[9] Table réservée non sélectionnable', (await txt(C + '[data-r="table"]')) === 'Table 7, 4 places');
    const pleins = await p.evaluate(C => [...document.querySelectorAll(C + '.c-cren')].filter(b => b.disabled).map(b => +b.dataset.c), C);
    if (pleins.length) { await p.click(C + `[data-c="${pleins[0]}"]`, { force: true }); }
    ok('[9] Créneaux complets non cliquables', pleins.length > 0 && (await txt(C + '[data-r="heure"]')) === 'À choisir', 'complets : ' + pleins.join(','));
    // les créneaux diffèrent selon le jour
    for (let i = 0; i < 12; i++) await p.click(C + '[data-cv="-1"]');
    const c1 = await txt(C + '[data-r="couverts"]');
    for (let i = 0; i < 12; i++) await p.click(C + '[data-cv="1"]');
    const c10 = await txt(C + '[data-r="couverts"]');
    ok('[9] Couverts de 1 à 10', c1 === '1 couvert' && c10 === '10 couverts', c1 + ' / ' + c10);
    for (let i = 0; i < 3; i++) await p.click(C + '[data-cv="-1"]');
    const t7 = await txt(C + '[data-r="table"]'), prop = await txt(C + '[data-proposition]');
    ok('[9] À 7 couverts, la grande table est proposée et sélectionnée', t7.includes('salon privé') && prop.includes('salon privé'), t7);
    await p.click(C + '[data-confirmer]'); await p.waitForTimeout(200);
    const manque = await txt(C + '[data-manque]'), tremble = await p.evaluate(C => document.querySelector(C + '[data-creneaux]').classList.contains('tremble'), C);
    ok('[9] Sans heure : message et créneaux qui tremblent', manque.includes('l’heure') && tremble, manque);
    const libre = await p.evaluate(C => [...document.querySelectorAll(C + '.c-cren')].find(b => !b.disabled).dataset.c, C);
    await p.click(C + `[data-c="${libre}"]`); await p.click(C + '[data-confirmer]'); await p.waitForTimeout(300);
    ok('[9] Confirmation', (await txt(C + '[data-confirmer]')).trim() === 'Réservation confirmée');
    await p.click(C + '[data-j="3"]'); await p.waitForTimeout(100);
    ok('[9] Jour choisi → récapitulatif', (await txt(C + '[data-r="jour"]')).length > 5);
    const FR = /\b(Votre|votre|Choisissez|couverts?|Confirmer|Réserv|Ce soir|Appeler|places|Heure|Jour|Vue de face|salon privé|fèves|oignons|beurre|mardi|lundi|jeudi|vendredi|samedi|dimanche|mercredi|Faites|À choisir|Attribuée|Bistrot|Tourner|Cuisine|complet)\b/;
    for (const l of ['de', 'en', 'pt']) {
      await p.click(C + `[data-langue="${l}"]`); await p.waitForTimeout(150);
      const t = await p.evaluate(C => { const r = document.querySelector(C.trim()); return r.innerText + ' ' + [...r.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' '); }, C);
      const m = t.match(FR);
      ok(`[9] Comptoir en ${l.toUpperCase()} : aucun texte français`, !m, m ? 'trouvé : ' + m[0] : '');
    }
    await p.click(C + '[data-langue="fr"]');
    // rotation
    const a0 = await p.evaluate(C => document.querySelector(C + '[data-plan]').style.getPropertyValue('--angle'), C);
    await p.click(C + '[data-tourner="30"]');
    const a1 = await p.evaluate(C => document.querySelector(C + '[data-plan]').style.getPropertyValue('--angle'), C);
    const box = await p.locator(C + '[data-scene-salle]').boundingBox();
    await p.mouse.move(box.x + 30, box.y + box.height - 20); await p.mouse.down(); await p.mouse.move(box.x + 230, box.y + box.height - 20, { steps: 8 }); await p.mouse.up();
    const a2 = await p.evaluate(C => document.querySelector(C + '[data-plan]').style.getPropertyValue('--angle'), C);
    ok('[9] La salle pivote (bouton et glisser)', a0 !== a1 && a1 !== a2, [a0, a1, a2].join(' → '));
    await fin(p, 'comptoir');
  }

  // 10 : Fleurs
  {
    const p = await page();
    await ouvrir(p, 'fleurs');
    const F = '[data-calque] .mq-fleurs ';
    const PR = { pivoine: 6, rose: 4, renoncule: 3.5, tulipe: 3, eucalyptus: 2.5, gypsophile: 2 };
    await p.click(F + '[data-recommencer]', { force: true }).catch(() => { });
    await p.evaluate(F => SM.mq.fleurs.recommencer(), F);
    const n0 = await p.evaluate(F => document.querySelectorAll(F + '.f-tige').length, F);
    const ordre = ['pivoine', 'rose', 'renoncule', 'tulipe', 'eucalyptus', 'gypsophile', 'pivoine', 'rose', 'tulipe', 'renoncule', 'pivoine', 'eucalyptus', 'gypsophile'];
    let attendu = 0;
    for (let i = 0; i < ordre.length; i++) { await p.click(F + `.f-choix[data-fleur="${ordre[i]}"]`); if (i < 12) attendu += PR[ordre[i]]; }
    await p.waitForTimeout(400);
    const n12 = await p.evaluate(F => document.querySelectorAll(F + '.f-tige').length, F);
    const compl = await p.evaluate(F => document.querySelector(F + '[data-complet]').textContent, F);
    ok('[10] Ajout jusqu\'à 12 tiges, puis « complet »', n0 === 0 && n12 === 12 && compl.includes('complet'), `${n0} → ${n12}, ${compl}`);
    await p.click(F + '.f-tige:first-child .f-tige-fleur'); await p.waitForTimeout(400); attendu -= PR['pivoine'];
    const n11 = await p.evaluate(F => document.querySelectorAll(F + '.f-tige').length, F);
    ok('[10] Retrait d\'une tige', n11 === 11, n11);
    await p.click(F + 'input[value="vase"]', { force: true }); attendu += 12;
    const emb = await p.evaluate(F => document.querySelector(F + '[data-scene-bouquet]').dataset.emballage, F);
    await p.click(F + 'input[value="lin"]', { force: true }); attendu += 3 - 12;
    await p.click(F + '[data-livraison]', { force: true }); attendu += 8;
    await p.fill(F + '[data-mot]', 'Bon anniversaire, Lina');
    const etiq = await p.evaluate(F => { const e = document.querySelector(F + '[data-etiquette]'); return !e.hidden && e.textContent; }, F);
    const tot = await p.evaluate(F => document.querySelector(F + '[data-total]').textContent.replace(/ /g, ' '), F);
    const att = (Math.round(attendu * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: attendu % 1 ? 2 : 0 }) + ' €';
    ok('[10] Emballages, livraison, total exact', emb === 'vase' && tot === att, `${tot} (attendu ${att})`);
    ok('[10] Mot doux sur l\'étiquette', etiq === 'Bon anniversaire, Lina', etiq);
    await p.click(F + '[data-commander]'); await p.waitForTimeout(400);
    const rec = await p.evaluate(F => { const r = document.querySelector(F + '[data-recap]'); return !r.hidden && r.textContent.replace(/ /g, ' '); }, F);
    ok('[10] Commande : récapitulatif', rec && rec.includes(att) && rec.includes('11 tiges') && await p.evaluate(F => document.querySelector(F + '[data-scene-bouquet]').classList.contains('commande'), F), rec);
    await p.click(F + '[data-recommencer]'); await p.waitForTimeout(300);
    const z = await p.evaluate(F => [document.querySelectorAll(F + '.f-tige').length, document.querySelector(F + '[data-total]').textContent.replace(/ /g, ' ')], F);
    ok('[10] Recommencer', z[0] === 0 && z[1] === '0 €', z.join(' / '));
    await fin(p, 'fleurs');
  }

  // 11 : configurateur
  {
    const p = await page();
    await p.evaluate(() => document.querySelector('#vitrine').scrollIntoView({ behavior: 'instant' }));
    await p.fill('[data-conf] [name="nom"]', 'Garage Müller & Fils');
    await p.selectOption('[data-conf] [name="metier"]', 'garage');
    await p.fill('[data-conf] [name="ville"]', 'Differdange');
    await p.waitForTimeout(2600);
    const r = await p.evaluate(() => {
      const cam = document.querySelector('.mq-cam'), q = s => document.querySelector(s);
      return {
        neon: q('[data-conf-neon]').getAttribute('aria-label'), allumees: [...q('[data-conf-neon] .neon').children].every(s => s.classList.contains('on') && s.getAttribute('aria-hidden') === 'true'),
        lettres: q('[data-conf-neon] .neon').children.length, fond: cam.style.getPropertyValue('--c-fond'), titre: q('[data-cam-titre]').textContent, p0: q('[data-cam-p="0"]').textContent,
        ill: !q('[data-ill="garage"]').hasAttribute('hidden') && q('[data-ill="boulangerie"]').hasAttribute('hidden'),
        rt: q('[data-r-titre]').textContent.replace(/ /g, ' '), url: q('[data-r-url]').textContent, h: q('[data-r-h]').textContent, mail: q('[data-conf-mail]').getAttribute('href')
      };
    });
    ok('[11] Enseigne néon au nom tapé, lettres allumées, aria', r.neon.includes('Garage Müller & Fils') && r.allumees && r.lettres === 20, r.neon);
    ok('[11] Vitrine caméléon : palette, titre, prestations, illustration', r.fond === '#121416' && r.titre === 'Votre voiture entre de bonnes mains.' && r.p0 === 'Entretien toutes marques' && r.ill, r.fond + ' / ' + r.titre);
    ok('[11] Aperçu de recherche et slug', r.rt === 'Ce que verra quelqu’un qui cherche un garage à Differdange' && r.url === 'garage-muller-fils.lu' && r.h === 'Garage Müller & Fils, garage à Differdange', r.url + ' / ' + r.rt);
    const dec = decodeURIComponent(r.mail.split('body=')[1]), suj = decodeURIComponent(r.mail.split('subject=')[1].split('&')[0]);
    ok('[11] mailto', r.mail.startsWith('mailto:studio.marcus.web@gmail.com?subject=') && suj.replace(/ /g, ' ') === 'Ma vitrine : Garage Müller & Fils' && dec.includes('je suis Garage Müller & Fils, garage à Differdange'), suj);
    const sl = await p.evaluate(() => [SM.slug('Café Élégance & Co'), SM.slug('--Chez  Amado--'), SM.slug('Ça coûte très très très très cher chez nous')]);
    ok('[11] Règles du slug', sl[0] === 'cafe-elegance-co' && sl[1] === 'chez-amado' && sl[2].length <= 30 && !sl[2].endsWith('-'), sl.join(' | '));
    await p.fill('[data-conf] [name="nom"]', '<img src=x onerror=alert(1)>');
    await p.waitForTimeout(1500);
    const x = await p.evaluate(() => ({ imgs: document.querySelectorAll('.conf-rendu img, .mq-cam img').length, t: document.querySelector('[data-cam-nom]').textContent, n: document.querySelector('[data-r-nom]').textContent }));
    ok('[11] Saisie HTML affichée en texte brut', x.imgs === 0 && x.t === '<img src=x onerror=alert(1)>'.slice(0, 28) && !p._errs.some(e => e.startsWith('dialog')), x.t);
    await fin(p, 'configurateur');
  }

  // 12 : liens personnalisés
  {
    let p = await page({ q: '?nom=Chez%20Amado&metier=restaurant&ville=Differdange', attente: 2400 });
    const r = await p.evaluate(() => ({ s: document.querySelector('[data-suite]').textContent, b: document.querySelector('[data-bouton-principal]').textContent, nom: document.querySelector('[name="nom"]').value, met: document.querySelector('[name="metier"]').value, v: document.querySelector('[name="ville"]').value, neon: document.querySelector('[data-conf-neon]').getAttribute('aria-label'), on: document.querySelectorAll('[data-conf-neon] .neon span.on').length }));
    ok('[12] ?nom=&metier=&ville= : hero et configurateur', r.s === 'Chez Amado, votre vitrine est allumée plus bas.' && r.b === 'Voir la vitrine de Chez Amado' && r.nom === 'Chez Amado' && r.met === 'restaurant' && r.v === 'Differdange' && r.neon.includes('Chez Amado') && r.on === 10, JSON.stringify(r));
    await fin(p, 'prospect 1');
    p = await page({ q: '?vitrine=comptoir&nom=Chez%20Amado', attente: 2600 });
    const v = await p.evaluate(() => ({ ouvert: !document.querySelector('[data-calque]').hidden, mq: document.querySelector('[data-calque-cadre] .mq') && document.querySelector('[data-calque-cadre] .mq').dataset.mq, nom: document.querySelector('[data-calque-nom]').textContent, men: document.querySelector('[data-calque-mention]').textContent, logo: document.querySelector('.mq-comptoir [data-nom-commerce]').textContent, autres: document.querySelector('.mq-kremer [data-nom-commerce]').textContent }));
    ok('[12] ?vitrine=comptoir&nom= : Le Comptoir à ce nom', v.ouvert && v.mq === 'comptoir' && v.nom.startsWith('Chez Amado') && v.men === 'Démonstration préparée pour Chez Amado' && v.logo === 'Chez Amado' && v.autres === 'Boulangerie Kremer', JSON.stringify(v));
    await fin(p, 'prospect 2');
    p = await page({ q: '?nom=%3Cscript%3Ealert(1)%3C%2Fscript%3E&metier=pirate&vitrine=inconnue&ville=' + 'x'.repeat(40) + '&heure=99:99', attente: 2400 });
    const w = await p.evaluate(() => ({ s: document.querySelector('[data-suite]').textContent, c: document.querySelector('[data-calque]').hidden, n: document.querySelector('[name="nom"]').value, v: document.querySelector('[name="ville"]').value }));
    ok('[12] Valeurs invalides ignorées sans erreur', !w.s.includes('script') && w.c && w.n === '' && w.v === 'Esch-sur-Alzette' && p._errs.length === 0, JSON.stringify(w) + p._errs.join('|'));
    await fin(p, 'prospect invalide');
  }

  // 13 : avant / après
  {
    const p = await page({ touch: true });
    await p.evaluate(() => document.querySelector('[data-aa]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await p.waitForTimeout(400);
    const b = await p.locator('[data-aa-range]').boundingBox();
    await p.mouse.move(b.x + b.width * .5, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width * .2, b.y + b.height / 2, { steps: 6 }); await p.mouse.up();
    const m = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-aa-scene]')).getPropertyValue('--p')));
    await p.touchscreen.tap(b.x + b.width * .8, b.y + b.height / 2); await p.waitForTimeout(100);
    const t = await p.evaluate(() => +document.querySelector('[data-aa-range]').value);
    await p.focus('[data-aa-range]'); const v0 = await p.evaluate(() => +document.querySelector('[data-aa-range]').value);
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
    const k = await p.evaluate(() => [+document.querySelector('[data-aa-range]').value, getComputedStyle(document.querySelector('[data-aa-scene]')).getPropertyValue('--p').trim(), getComputedStyle(document.querySelector('.aa-apres')).clipPath]);
    ok('[13] Avant/après : souris', m > 15 && m < 25, m);
    ok('[13] Avant/après : doigt', t > 70 && t < 90, t);
    ok('[13] Avant/après : clavier et clip-path', k[0] === v0 - 2 && k[1] === (v0 - 2) + '%' && k[2].includes('inset'), k.join(' / '));
    const clone = await p.evaluate(() => { const c = document.querySelector('.aa-apres .mq'); return c && c.querySelectorAll('[id]').length === 0 && !c.id && document.querySelectorAll('.mq[data-mq="kremer"]').length === 1; });
    const ids = await p.evaluate(() => { const a = [...document.querySelectorAll('[id]')].map(e => e.id); return a.length - new Set(a).size; });
    ok('[13] Clone de Kremer sans id, aucun id en double', clone && ids === 0, 'doublons : ' + ids);
    await fin(p, 'avant après');
  }

  // 14 : accordéon
  {
    const p = await page();
    await p.evaluate(() => document.querySelector('[data-faq]').scrollIntoView({ behavior: 'instant' }));
    const b = p.locator('.faq-b').first();
    await b.click(); await p.waitForTimeout(400);
    const o = await p.evaluate(() => [document.querySelector('.faq-b').getAttribute('aria-expanded'), document.querySelector('.faq-r').getBoundingClientRect().height]);
    await b.click(); await p.waitForTimeout(400);
    const f = await p.evaluate(() => [document.querySelector('.faq-b').getAttribute('aria-expanded'), document.querySelector('.faq-r').getBoundingClientRect().height]);
    ok('[14] Accordéon : ouverture, fermeture, aria-expanded', o[0] === 'true' && o[1] > 20 && f[0] === 'false' && f[1] < 1, JSON.stringify([o, f]));
    await fin(p, 'faq');
  }

  // 15 : mouvement réduit
  {
    const p = await page({ reduit: true, attente: 300 });
    const intro = await p.evaluate(() => !document.querySelector('.rideau'));
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 50)); } });
    await p.waitForTimeout(300);
    const inf = await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).map(a => a.animationName || 'x'));
    const caches = await p.evaluate(() => [...document.querySelectorAll('.vt .mq .ch, .vt .mq .s-page:not([hidden]) .s-c')].filter(e => parseFloat(getComputedStyle(e).opacity) < 0.99).length);
    ok('[15] Mouvement réduit : pas d\'intro', intro);
    ok('[15] Mouvement réduit : aucune animation continue', inf.length === 0, inf.join(','));
    ok('[15] Mouvement réduit : tout visible', caches === 0, caches + ' éléments masqués');
    await ouvrir(p, 'comptoir');
    await p.click('[data-calque] [data-table="5"]'); const t = await p.evaluate(() => document.querySelector('[data-calque] [data-r="table"]').textContent);
    await p.keyboard.press('Escape'); await ouvrir(p, 'fleurs');
    const n = await p.evaluate(() => document.querySelectorAll('[data-calque] .f-tige').length);
    await p.click('[data-calque] .f-choix[data-fleur="rose"]'); const n2 = await p.evaluate(() => document.querySelectorAll('[data-calque] .f-tige').length);
    ok('[15] Mouvement réduit : outils utilisables', t.includes('Table 5') && n2 === n + 1, t);
    await fin(p, 'réduit');
  }

  // 16 : impression
  {
    const p = await page();
    await p.emulateMedia({ media: 'print' });
    const r = await p.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, col: getComputedStyle(document.querySelector('.titre')).color, calque: getComputedStyle(document.querySelector('.calque')).display, halo: getComputedStyle(document.querySelector('.halo')).display, faq: document.querySelector('.faq-r').getBoundingClientRect().height, anim: document.getAnimations().filter(a => a.playState === 'running').length, mq: [...document.querySelectorAll('.vt .mq .ch')].filter(e => getComputedStyle(e).opacity !== '1').length }));
    ok('[16] Impression : fond blanc, texte sombre', r.bg === 'rgb(255, 255, 255)' && /rgb\(2[0-9], 2[0-9], 1[0-9]\)/.test(r.col), r.bg + ' ' + r.col);
    ok('[16] Impression : pas de calque, pas d\'animation, contenu visible', r.calque === 'none' && r.halo === 'none' && r.faq > 10 && r.anim === 0 && r.mq === 0, JSON.stringify(r));
    await p.pdf({ path: require('path').join(require('os').tmpdir(), 'impression.pdf'), format: 'A4', printBackground: true });
    await fin(p, 'impression');
  }

  // 17 : sans JavaScript
  {
    const p = await page({ js: false, attente: 1500 });
    const r = await p.evaluate(() => {
      const vis = e => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
      return {
        js: document.documentElement.classList.contains('js'), titre: document.querySelector('[data-heure]').textContent,
        boutons: [...document.querySelectorAll('.needs-js')].filter(vis).length, mqs: [...document.querySelectorAll('.vt .vt-ecran')].map(e => Math.round(e.getBoundingClientRect().height)),
        contact: vis(document.querySelector('.contact-mail')) && vis(document.querySelector('[data-mail-contact]')), h: document.documentElement.scrollWidth - innerWidth,
        rideau: document.querySelector('.rideau') ? getComputedStyle(document.querySelector('.rideau')).transform : 'absent', faq: document.querySelector('.faq-r').getBoundingClientRect().height,
        ch: [...document.querySelectorAll('.mq .ch')].filter(e => getComputedStyle(e).opacity !== '1').length
      };
    });
    ok('[17] Sans JS : lisible, maquettes visibles et coupées à 560 px, contact visible, aucun bouton inutile', !r.js && r.titre === 'Vos clients vous cherchent.' && r.boutons === 0 && r.mqs.every(h => h > 200 && h <= 560) && r.contact && r.h <= 0 && r.faq > 10 && r.ch === 0, JSON.stringify(r));
    await p.waitForTimeout(1000);
    ok('[17] Sans JS : le rideau se lève seul', await p.evaluate(() => getComputedStyle(document.querySelector('.rideau')).visibility === 'hidden'));
    await fin(p, 'sans js');
  }

  // 18 : sans View Transitions
  {
    const p = await page({ init: () => { delete Document.prototype.startViewTransition; } });
    const sans = await p.evaluate(() => typeof document.startViewTransition);
    await ouvrir(p, 'nova');
    const o = await p.evaluate(() => !document.querySelector('[data-calque]').hidden);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok('[18] Sans startViewTransition : repli sans erreur', sans === 'undefined' && o && p._errs.length === 0, p._errs.join('|'));
    await fin(p, 'sans vt');
    const q = await page();
    ok('[18] Avec View Transitions : API présente', await q.evaluate(() => typeof document.startViewTransition === 'function'));
    await ouvrir(q, 'nova'); await q.keyboard.press('Escape'); await fin(q, 'avec vt');
  }

  // 19 : pause hors écran
  {
    const p = await page();
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const m = document.querySelector('.mq[data-mq="schmit"]'); return [m.dataset.actif, getComputedStyle(m.querySelector('.s-defile')).animationPlayState, getComputedStyle(document.querySelector('.mq-nova .n-nappe--a')).animationPlayState]; });
    await p.evaluate(() => document.querySelector('.vt[data-vt="schmit"]').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(500);
    const s = await p.evaluate(() => { const m = document.querySelector('.mq[data-mq="schmit"]'); return [m.dataset.actif, getComputedStyle(m.querySelector('.s-defile')).animationPlayState]; });
    ok('[19] Maquette hors écran en pause, reprise à l\'écran', r.join() === 'false,paused,paused' && s.join() === 'true,running', r.join() + ' / ' + s.join());
    await fin(p, 'pause');
  }

  // 20 : couleurs
  {
    const src = fs.readFileSync(FILE, 'utf8').replace(/base64,[A-Za-z0-9+/=]+/g, '');
    const bleus = [];
    const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100]; };
    const test = (c, r, g, b) => { const [h, s] = hsl(r, g, b); if (h >= 190 && h <= 250 && s > 15) bleus.push(c); };
    for (const m of src.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) { let x = m[1]; if (x.length === 3) x = x.split('').map(c => c + c).join(''); test(m[0], parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)); }
    for (const m of src.matchAll(/%23([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) { let x = m[1]; if (x.length === 3) x = x.split('').map(c => c + c).join(''); test(m[0], parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)); }
    for (const m of src.matchAll(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/g)) test(m[0], +m[1], +m[2], +m[3]);
    for (const m of src.matchAll(/hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%/g)) { const h = +m[1], s = +m[2]; if (h >= 190 && h <= 250 && s > 15) bleus.push(m[0]); }
    const noms = src.match(/:\s*(blue|navy|teal|cyan|aqua|steelblue|skyblue|royalblue|dodgerblue|cornflowerblue|lightblue|deepskyblue|midnightblue|slateblue|cadetblue|powderblue|lightsteelblue|darkblue|mediumblue)\b/gi) || [];
    ok('[20] Aucune teinte bleue dans le fichier', bleus.length === 0 && noms.length === 0, [...new Set(bleus.concat(noms))].slice(0, 12).join(' '));
    // couleurs calculées réellement rendues
    const p = await page();
    const vus = await p.evaluate(() => {
      const out = new Set(); const props = ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke', 'outlineColor'];
      for (const e of document.querySelectorAll('*')) { const cs = getComputedStyle(e); for (const k of props) { const v = cs[k]; if (v && v.startsWith('rgb')) out.add(v); } }
      return [...out];
    });
    const bl2 = []; for (const v of vus) { const m = v.match(/(\d+(?:\.\d+)?)/g).map(Number); const a = m.length > 3 ? m[3] : 1; if (a === 0) continue; const [h, s] = hsl(m[0], m[1], m[2]); if (h >= 190 && h <= 250 && s > 15) bl2.push(v); }
    ok('[20] Aucune teinte bleue dans les couleurs calculées', bl2.length === 0, bl2.join(' '));
    await fin(p, 'couleurs');
  }

  // 21 : poids
  const ko = fs.statSync(FILE).size / 1024;
  ok('[21] Poids ≤ 900 Ko', ko <= 900, ko.toFixed(0) + ' Ko');

  // 1 : console et réseau (sur tous les tests)
  ok('[1] Zéro erreur ou avertissement dans la console', erreursGlobales.length === 0, erreursGlobales.join(' || ').slice(0, 800));
  ok('[1] Zéro requête réseau externe', externes.length === 0, externes.slice(0, 5).join(' '));

  // typographie
  {
    const html = fs.readFileSync(FILE, 'utf8');
    const p = await page({ js: false, attente: 300 });
    const t = await p.evaluate(() => document.body.innerText);
    const fautes = [];
    for (const m of t.matchAll(/[^\s  ]( )([;:!?»])/g)) fautes.push('espace avant ' + m[2] + ' : ' + t.slice(Math.max(0, m.index - 20), m.index + 3));
    for (const m of t.matchAll(/(\d) €/g)) fautes.push('€ : ' + t.slice(m.index - 5, m.index + 4));
    if (/'/.test(t)) fautes.push('apostrophe droite : ' + t.slice(t.indexOf("'") - 20, t.indexOf("'") + 5));
    if (/lorem|Bienvenue sur/i.test(t)) fautes.push('texte interdit');
    if (/\+352|href="tel:/i.test(html)) fautes.push('numéro de téléphone');
    ok('[règle 9] Typographie française (texte sans JS)', fautes.length === 0, fautes.slice(0, 5).join(' | '));
    await fin(p, 'typo');
    const q = await page({ q: '?heure=15:47' });
    await q.evaluate(()=>SM.ouvrir('comptoir'));await q.waitForTimeout(800);await q.evaluate(()=>document.querySelector('[data-calque] [data-confirmer]').click());
    const t2 = await q.evaluate(() => document.body.innerText + document.querySelector('[data-calque]').innerText);
    const f2 = [];
    for (const m of t2.matchAll(/[^\s\u00a0\u202f]( )([;:!?»])/g)) f2.push(t2.slice(Math.max(0, m.index - 20), m.index + 3));
    for (const m of t2.matchAll(/(\d) €/g)) f2.push(t2.slice(m.index - 5, m.index + 4));
    if (/'/.test(t2)) f2.push('apostrophe : ' + t2.slice(t2.indexOf("'") - 20, t2.indexOf("'") + 5));
    ok('[règle 9] Typographie française (texte avec JS)', f2.length === 0, f2.slice(0, 5).join(' | '));
    await fin(q, 'typo js');
  }

  await browser.close();
  const e = res.filter(r => !r[1]);
  console.log(`\n${res.length - e.length}/${res.length} tests réussis`);
  fs.writeFileSync(require('path').join(require('os').tmpdir(), 'resultats.json'), JSON.stringify(res, null, 1));
  process.exit(e.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
