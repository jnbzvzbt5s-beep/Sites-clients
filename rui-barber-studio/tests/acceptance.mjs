// Tests d’acceptation V5 (§19) — node tests/acceptance.mjs
// Chromium lancé avec --disable-lcd-text ; WebKit si installé. Écrit build/acceptance.json et les captures de budget.
import { chromium, webkit } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FICHIERS = { '/': 'index.html', '/index.html': 'index.html', '/coupes.html': 'coupes.html' };
const LARGEURS = [320, 390, 834, 1180, 1440];
const IG = 'https://ig.me/m/ruis_barber_studio';
const FINE = ' ', NB = ' ';
const BUDGET = path.join(ROOT, 'build', 'budget');
fs.mkdirSync(BUDGET, { recursive: true });

let requetesServeur = [];
const serveur = http.createServer((req, res) => {
  requetesServeur.push(req.url);
  const f = FICHIERS[req.url.split(/[?#]/)[0]];
  if (f) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, f)));
  } else { res.writeHead(404); res.end(); }
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${serveur.address().port}/`;

const resultats = [];
const exemples = [];
function verifier(moteur, num, nom, ok, detail = '') {
  resultats.push({ moteur, num, nom, ok: !!ok, detail });
  if (!ok) console.log(`  ÉCHEC [${moteur}] ${num}. ${nom} ${detail}`);
}

// Référence indépendante, écrite à la main : semaine du mardi 29 septembre 2026.
const SEMAINE = [
  ['mardi 29 septembre', ' (aujourd’hui)', 'Aujourd’hui', '29', 'sept.'],
  ['mercredi 30 septembre', ' (demain)', 'Demain', '30', 'sept.'],
  ['jeudi 1er octobre', '', 'jeu.', '1er', 'oct.'],
  ['vendredi 2 octobre', '', 'ven.', '2', 'oct.'],
  ['samedi 3 octobre', '', 'sam.', '3', 'oct.'],
  ['dimanche 4 octobre', '', 'dim.', '4', 'oct.'],
  ['lundi 5 octobre', '', 'lun.', '5', 'oct.'],
];
const MOMENTS = ['le matin', 'à midi', 'l’après-midi', 'en fin de journée', 'je suis flexible'];
function attendu(jour, moment, prenom) {
  const l = [
    `Bonjour Rui${FINE}! Je voudrais un rendez-vous pour une coupe complète.`,
    `Jour${NB}: ${jour ?? 'à convenir'}`,
    `Moment${NB}: ${moment ?? 'à convenir'}`,
  ];
  if (prenom) l.push(`Prénom${NB}: ${prenom}`);
  l.push(`Merci${FINE}!`);
  return l.join('\n');
}
const nettoyer = p => p.replace(/\s+/g, ' ').trim().slice(0, 30).trim();

async function lancer(type) {
  try { return await type.launch({ args: type === chromium ? ['--disable-lcd-text'] : [] }); } catch (e) { return null; }
}

for (const [M, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const nav = await lancer(type);
  if (!nav) { resultats.push({ moteur: M, num: 0, nom: 'Lancement du moteur', ok: null, detail: 'non installé (téléchargement bloqué)' }); continue; }
  console.log(`— ${M} ${nav.version()}`);

  // 1, 2, 17 — console, réseau, cookies, défilement horizontal, ouverture, CLS — à chaque largeur
  for (const [pg, w] of ['', 'coupes.html'].flatMap(pg => LARGEURS.map(w => [pg, w]))) {
    const nomPage = pg || 'index.html';
    const ctx = await nav.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 } });
    const page = await ctx.newPage();
    const erreurs = [], requetes = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) erreurs.push(m.text()); });
    page.on('pageerror', e => erreurs.push(String(e)));
    page.on('request', r => { if (!r.url().startsWith('data:')) requetes.push(r.url()); });
    await page.addInitScript(() => {
      window.__cls = 0;
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
    });
    requetesServeur = [];
    await page.goto(BASE + pg + '?date=2026-09-29', { waitUntil: 'load' });
    const anims = await page.evaluate(() => document.getAnimations().map(a => { const t = a.effect.getComputedTiming(); return t.delay + t.duration; }));
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 15)); } });
    await page.waitForTimeout(1600);
    verifier(M, 1, `${nomPage} ${w}px : zéro erreur ni avertissement dans la console`, erreurs.length === 0, erreurs.join(' | '));
    verifier(M, 1, `${nomPage} ${w}px : aucune requête réseau hors data:`, requetes.length === 1 && requetesServeur.length === 1, requetes.join(', '));
    verifier(M, 1, `${nomPage} ${w}px : aucun cookie`, (await ctx.cookies()).length === 0 && (await page.evaluate(() => document.cookie)) === '');
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth]);
    verifier(M, 2, `${nomPage} ${w}px : aucun défilement horizontal`, sw[0] <= sw[2] && sw[1] <= sw[2], JSON.stringify(sw));
    const maxAnim = Math.max(0, ...anims);
    verifier(M, 17, `${nomPage} ${w}px : ouverture terminée en ≤ 1,5 s`, maxAnim <= 1500, `${maxAnim} ms`);
    const cls = await page.evaluate(() => window.__cls);
    verifier(M, 17, `${nomPage} ${w}px : CLS ≤ 0,01`, cls <= 0.01, cls.toFixed(4));
    await ctx.close();
  }

  // 3 — premier écran 390×844
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-29');
    const r = await page.evaluate(() => {
      const H = window.innerHeight;
      const box = s => document.querySelector(s).getBoundingClientRect();
      const dedans = b => b.top >= 0 && b.bottom <= H && b.left >= 0 && b.right <= window.innerWidth;
      const ph = box('.heros__photo');
      return { h1: dedans(box('h1')), prix: dedans(box('.etiquette-prix')), bouton: dedans(box('#cta-heros')),
        photo: Math.max(0, Math.min(H, ph.bottom) - Math.max(0, ph.top)) / ph.height };
    });
    verifier(M, 3, 'Premier écran 390×844 : h1, étiquette prix et bouton rouge entiers, ≥ 1/3 de la photo', r.h1 && r.prix && r.bouton && r.photo >= 1 / 3, JSON.stringify(r));
    await ctx.close();
  }

  // 4 — toutes les combinaisons du ticket
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-29');
    const tuiles = await page.$$eval('#tuiles .tuile', ls => ls.map(l => ({
      v: l.querySelector('input').value, nom: l.querySelector('input').getAttribute('aria-label'),
      haut: (l.querySelector('.tuile__haut') || l.querySelector('.tuile__seul')).textContent,
      num: l.querySelector('.tuile__num')?.textContent ?? null, mois: l.querySelector('.tuile__mois')?.textContent ?? null })));
    const okT = tuiles.length === 8 && SEMAINE.every(([v, rel, h, n, m], i) => tuiles[i].v === v && tuiles[i].nom === v + rel && tuiles[i].haut === h && tuiles[i].num === n && tuiles[i].mois === m)
      && tuiles[7].v === 'peu importe' && tuiles[7].haut === 'Peu importe';
    verifier(M, 4, 'Huit tuiles-calendrier (29 sept. 2026, « 1er », nom accessible complet)', okT, JSON.stringify(tuiles.slice(0, 3)));
    const jours = [null, ...SEMAINE.map(s => s[0] + s[1]), 'peu importe'];
    const valeursJour = [null, ...SEMAINE.map(s => s[0]), 'peu importe'];
    const prenoms = ['', 'Karim', 'Maximilian-Alexander-Luxembour', '   Léa   Dos  Santos  '];
    let total = 0; const faux = [];
    for (let ji = 0; ji < jours.length; ji++) for (const mo of [null, ...MOMENTS]) for (const p of prenoms) {
      const r = await page.evaluate(({ jv, mo, p }) => {
        const f = document.getElementById('ticket');
        f.querySelectorAll('input[type=radio]').forEach(i => { i.checked = false; });
        if (jv) f.querySelector(`input[name=jour][value="${jv}"]`).checked = true;
        if (mo) f.querySelector(`input[name=moment][value="${mo}"]`).checked = true;
        const pr = document.getElementById('prenom');
        pr.value = p;
        pr.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new Event('change', { bubbles: true }));
        let recu = null;
        const avant = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { recu = t; return Promise.resolve(); } } });
        document.getElementById('copier').click();
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: avant });
        return { recu, affiche: document.getElementById('apercu').innerText.trim() };
      }, { jv: valeursJour[ji], mo, p });
      const att = attendu(jours[ji], mo, nettoyer(p));
      total++;
      if (r.recu !== att || r.affiche !== att) faux.push({ j: jours[ji], mo, p, r });
      if (M === 'chromium' && ((ji === 0 && !mo && !p) || (ji === 3 && mo === 'l’après-midi' && p === 'Karim') || (ji === 1 && mo === 'le matin' && p === prenoms[3])
        || (ji === 8 && mo === 'je suis flexible' && !p) || (ji === 2 && !mo && p === prenoms[2]))) exemples.push(att);
    }
    verifier(M, 4, `Ticket : ${total} combinaisons jour × moment × prénom (vide, rempli, 31 caractères, espaces) — message copié et aperçu exacts`, faux.length === 0, JSON.stringify(faux.slice(0, 2)));
    const maxlen = await page.getAttribute('#prenom', 'maxlength');
    verifier(M, 4, 'Prénom limité à 30 caractères', maxlen === '30');
    await ctx.close();
  }

  // 5 — lien principal et presse-papiers simulé
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    let recu = null;
    await ctx.exposeBinding('__recu', (_s, t) => { recu = t; });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__recu(t); return Promise.resolve(); } } });
    });
    await ctx.route(/ig\.me|instagram\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Instagram (simulé)</p>' }));
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-29');
    const lien = await page.$eval('#envoyer', a => [a.tagName, a.getAttribute('href'), a.target]);
    await page.click('.tuile:has(input[value="jeudi 1er octobre"])');
    await page.click('.puce:has-text("L’après-midi")');
    await page.fill('#prenom', 'Karim');
    await Promise.all([page.waitForURL(/ig\.me/), page.click('#envoyer')]);
    verifier(M, 5, 'Lien principal = https://ig.me/m/ruis_barber_studio, ouvert normalement', lien[0] === 'A' && lien[1] === IG && lien[2] === '' && page.url().startsWith(IG), JSON.stringify(lien));
    verifier(M, 5, 'Le presse-papiers (simulé) reçoit le message dans le même geste', recu === attendu('jeudi 1er octobre', 'l’après-midi', 'Karim'), JSON.stringify(recu));
    await ctx.close();
  }

  // 6 — échec de copie simulé
  for (const [cas, init] of [
    ['refusée', () => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('refusé')) } }); document.execCommand = () => false; }],
    ['absente', () => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); document.execCommand = () => false; }],
  ]) {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.addInitScript(init);
    await page.goto(BASE + '?date=2026-09-29');
    await page.click('#copier');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({ statut: document.getElementById('statut').textContent, sel: window.getSelection().toString().trim(), texte: document.getElementById('apercu').innerText.trim() }));
    verifier(M, 6, `Copie ${cas} : message d’échec affiché et aperçu sélectionné`, r.statut === `La copie automatique n’a pas marché${NB}: le message est sélectionné, copiez-le.` && r.sel === r.texte && r.sel.length > 50, JSON.stringify(r).slice(0, 160));
    await ctx.close();
  }
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      window.__copie = null;
      document.execCommand = c => { if (c === 'copy') { window.__copie = window.getSelection().toString(); return true; } return false; };
    });
    await page.goto(BASE + '?date=2026-09-29');
    await page.click('#copier');
    const r = await page.evaluate(() => [window.__copie, document.getElementById('statut').textContent]);
    verifier(M, 6, 'Sans API Clipboard, repli execCommand : message copié et confirmation', r[0] && r[0].trim() === attendu(null, null, '') && r[1].startsWith('Message copié.'), JSON.stringify(r));
    await ctx.close();
  }

  // 7 — dates : passage d’année, changement d’heure, fuseau du Luxembourg
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const lire = () => page.$$eval('#tuiles .tuile', ls => ls.map(l => [l.querySelector('input').getAttribute('aria-label'),
      [(l.querySelector('.tuile__haut') || l.querySelector('.tuile__seul')).textContent, l.querySelector('.tuile__num')?.textContent, l.querySelector('.tuile__mois')?.textContent].filter(Boolean).join(' ')]));
    await page.goto(BASE + '?date=2026-12-31');
    const a = await lire();
    const attA = [['jeudi 31 décembre (aujourd’hui)', 'Aujourd’hui 31 déc.'], ['vendredi 1er janvier (demain)', 'Demain 1er janv.'], ['samedi 2 janvier', 'sam. 2 janv.'],
      ['dimanche 3 janvier', 'dim. 3 janv.'], ['lundi 4 janvier', 'lun. 4 janv.'], ['mardi 5 janvier', 'mar. 5 janv.'], ['mercredi 6 janvier', 'mer. 6 janv.'], ['Peu importe', 'Peu importe']];
    verifier(M, 7, '?date=2026-12-31 : « Demain » = vendredi 1er janvier (« 1er janv. »), passage d’année', JSON.stringify(a) === JSON.stringify(attA), JSON.stringify(a.slice(0, 3)));
    await page.goto(BASE + '?date=2026-10-24');
    const b = await lire();
    const attB = ['samedi 24 octobre (aujourd’hui)', 'dimanche 25 octobre (demain)', 'lundi 26 octobre', 'mardi 27 octobre', 'mercredi 28 octobre', 'jeudi 29 octobre', 'vendredi 30 octobre'];
    verifier(M, 7, '?date=2026-10-24 : changement d’heure du 25 octobre, aucun jour sauté ni doublé', JSON.stringify(b.slice(0, 7).map(x => x[0])) === JSON.stringify(attB), JSON.stringify(b.map(x => x[0])));
    await ctx.close();
    const ctx2 = await nav.newContext({ timezoneId: 'Pacific/Honolulu' });
    const p2 = await ctx2.newPage();
    await p2.clock.setFixedTime(new Date('2026-09-29T23:30:00Z'));
    await p2.goto(BASE);
    const auj = await p2.$eval('#tuiles input', i => i.value);
    verifier(M, 7, 'Sans ?date : jour calculé à l’heure du Luxembourg (Honolulu le 29, Luxembourg le 30)', auj === 'mercredi 30 septembre', auj);
    await ctx2.close();
  }

  // 8 — clavier
  {
    const ctx = await nav.newContext({ viewport: { width: 1180, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-29');
    await page.waitForFunction(() => !document.documentElement.classList.contains('attente'));
    await page.keyboard.press('Tab');
    const ev = await page.evaluate(() => [document.activeElement.textContent, document.activeElement.getBoundingClientRect().top >= 0]);
    verifier(M, 8, 'Clavier : « Aller au contenu » en premier, visible', ev[0] === 'Aller au contenu' && ev[1], JSON.stringify(ev));
    const ordre = [];
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        const cible = a.matches('input[type=radio]') ? a.nextElementSibling : a;
        const cs = getComputedStyle(cible);
        return { cle: a.id || a.name || (a.getAttribute('href') || '') + '|' + a.textContent.trim().slice(0, 18), focus: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      ordre.push(info);
      if (info.cle === 'copier') break;
    }
    const sans = ordre.filter(o => !o.focus);
    verifier(M, 8, 'Clavier : focus visible (2 px) sur chaque élément atteint', sans.length === 0, JSON.stringify(sans.slice(0, 3)));
    const cles = ordre.map(o => o.cle);
    const idx = k => cles.findIndex(c => c === k);
    verifier(M, 8, 'Clavier : ordre logique jour → moment → prénom → envoyer → copier',
      idx('jour') > 0 && idx('jour') < idx('moment') && idx('moment') < idx('prenom') && idx('prenom') < idx('envoyer') && idx('envoyer') < idx('copier'), cles.slice(-6).join(' > '));
    await page.focus('#tuiles input');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    const j = await page.evaluate(() => [document.activeElement.value, document.activeElement.checked]);
    await page.focus('input[name=moment]');
    await page.keyboard.press('ArrowRight');
    const m = await page.evaluate(() => [document.activeElement.value, document.activeElement.checked]);
    verifier(M, 8, 'Clavier : flèches dans les groupes de radios', j[0] === 'jeudi 1er octobre' && j[1] && m[0] === 'à midi' && m[1], JSON.stringify([j, m]));
    await page.goto(BASE + 'coupes.html');
    await page.waitForFunction(() => !document.documentElement.classList.contains('attente'));
    await page.locator('.galerie .vignette').first().click();
    await page.keyboard.press('Escape');
    const ferme = await page.evaluate(() => !document.getElementById('visionneuse').open);
    verifier(M, 8, 'Clavier : Échap ferme la visionneuse', ferme);
    await ctx.close();
  }

  // 9 — visionneuse
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + 'coupes.html');
    const v = page.locator('.galerie .vignette');
    const n = await v.count();
    await v.nth(2).scrollIntoViewIfNeeded();
    await v.nth(2).click();
    await page.waitForTimeout(250);
    const c1 = await page.textContent('#vis-compteur');
    await page.keyboard.press('ArrowRight');
    const c2 = await page.textContent('#vis-compteur');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    const c3 = await page.textContent('#vis-compteur');
    const balayer = dx => page.evaluate(dx => {
      const fig = document.querySelector('.visionneuse__figure'), r = fig.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const t = cx => new Touch({ identifier: 1, target: fig, clientX: cx, clientY: y });
      fig.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x)], changedTouches: [t(x)], bubbles: true }));
      fig.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx)], bubbles: true }));
      return document.getElementById('vis-compteur').textContent;
    }, dx);
    const s1 = await balayer(-120), s2 = await balayer(120);
    await page.keyboard.press('Escape');
    const f = await page.evaluate(() => document.activeElement === document.querySelectorAll('.galerie .vignette')[2]);
    await v.nth(4).click(); await page.waitForTimeout(250);
    await page.mouse.click(6, 420); await page.waitForTimeout(100);
    const f2 = await page.evaluate(() => [!document.getElementById('visionneuse').open, document.activeElement === document.querySelectorAll('.galerie .vignette')[4]]);
    verifier(M, 9, `Visionneuse : ouverture, compteur « 3 sur ${n} », flèches, balayage, focus rendu`,
      c1 === `3 sur ${n}` && c2 === `4 sur ${n}` && c3 === `2 sur ${n}` && s1 === `3 sur ${n}` && s2 === `2 sur ${n}` && f && f2[0] && f2[1], JSON.stringify([c1, c2, c3, s1, s2, f, f2]));
    await ctx.close();
  }

  // 10 — pastille mobile : visible si et seulement si aucun autre appel à l’action n’est à l’écran
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-29');
    await page.waitForTimeout(300);
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const ecarts = [];
    let vue = 0, cachee = 0;
    for (let y = 0; y < H; y += 350) {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(260);
      const r = await page.evaluate(() => {
        const h = window.innerHeight;
        const attendu = ![...document.querySelectorAll('[data-masque-pastille]')].some(el => { const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < h; });
        const p = document.getElementById('pastille');
        return { attendu, reel: getComputedStyle(p).opacity === '1' };
      });
      if (r.attendu !== r.reel) ecarts.push(y);
      r.reel ? vue++ : cachee++;
    }
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const pied = await page.evaluate(() => {
      const p = document.getElementById('pastille');
      return getComputedStyle(p).opacity !== '1' || document.querySelector('.pied__credit').getBoundingClientRect().bottom <= p.getBoundingClientRect().top;
    });
    verifier(M, 10, 'Pastille : visible seulement quand aucun autre appel à l’action n’est à l’écran, jamais sur le pied de page',
      ecarts.length === 0 && vue > 0 && cachee > 0 && pied, JSON.stringify({ ecarts, vue, cachee, pied }));
    const large = await (async () => { await page.setViewportSize({ width: 1180, height: 900 }); return page.$eval('#pastille', p => getComputedStyle(p).display); })();
    verifier(M, 10, 'Pastille : absente dès 768 px', large === 'none');
    await page.goto(BASE + 'coupes.html');
    verifier(M, 10, 'Pastille : absente de la page des coupes (la carte de fin porte le bouton)', (await page.$$('#pastille')).length === 0);
    await ctx.close();
  }

  // 11 — mouvement réduit
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-29');
    const r = await page.evaluate(() => ({
      anims: document.getAnimations().length,
      opacites: ['h1', '.heros__actions', '.etiquette-prix', '.regle__trait', '.ruban--haut'].map(s => getComputedStyle(document.querySelector(s)).opacity),
      transform: getComputedStyle(document.querySelector('.ruban--haut')).transform,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    }));
    verifier(M, 11, 'Mouvement réduit : aucune animation, tout visible immédiatement', r.anims === 0 && r.opacites.every(o => o === '1') && r.transform === 'none' && r.scroll === 'auto', JSON.stringify(r));
    await ctx.close();
  }

  // 12 — JavaScript désactivé
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE);
    const ticket = await page.locator('#ticket').isVisible();
    const texte = (await page.locator('#apercu').innerText()).trim();
    const lien = page.locator('#envoyer');
    const libelle = (await lien.innerText()).trim();
    const phrase = await page.locator('.ticket__sansjs').isVisible();
    const champs = await page.locator('.ticket__champ').evaluateAll(ls => ls.every(l => getComputedStyle(l).display === 'none'));
    const pastille = await page.locator('#pastille').evaluate(p => getComputedStyle(p).display);
    const vides = await page.locator('main h2').evaluateAll(hs => hs.filter(h => {
      const s = h.closest('section'); const r = s.getBoundingClientRect(), rh = h.getBoundingClientRect();
      return r.bottom - rh.bottom < 120;
    }).map(h => h.textContent));
    verifier(M, 12, 'JS désactivé : ticket visible, message type, lien « Écrire à Rui sur Instagram », pastille masquée, aucun titre suivi d’un vide',
      ticket && texte === attendu(null, null, '') && libelle === 'Écrire à Rui sur Instagram' && (await lien.getAttribute('href')) === IG && phrase && champs && pastille === 'none' && vides.length === 0,
      JSON.stringify({ ticket, libelle, phrase, champs, pastille, vides }));
    await page.screenshot({ path: path.join(ROOT, 'build', `sans-js-${M}.png`), fullPage: true });
    await ctx.close();
  }

  // 13 — logo et textes alternatifs
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE);
    const logos = await page.$$eval('img.logo__img', is => is.map(i => ({ n: [i.naturalWidth, i.naturalHeight], a: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)], fit: getComputedStyle(i).objectFit, alt: i.alt })));
    verifier(M, 13, 'Logo carré, jamais recadré ni déformé (3 occurrences), alt « Rui’s Barber Studio »',
      logos.length === 3 && logos.every(l => l.n[0] === l.n[1] && l.a[0] === l.a[1] && l.alt === 'Rui’s Barber Studio' && l.fit === 'fill'), JSON.stringify(logos));
    const alts = await page.$$eval('main img:not(.logo__img)', is => is.map(i => i.alt));
    await page.goto(BASE + 'coupes.html');
    const alts2 = await page.$$eval('main img:not(.logo__img)', is => is.map(i => i.alt));
    verifier(M, 13, 'Photos : alt précis sur chacune (accueil 4, coupes 5)', alts.length === 4 && alts2.length === 5 && [...alts, ...alts2].every(a => a.length >= 30 && /vu|vus/.test(a)), JSON.stringify(alts2));
    await ctx.close();
  }

  // 14 — captures pour les budgets de couleur (analysées par tests/budgets.py)
  if (M === 'chromium') {
    for (const [pg, w] of [['', 390], ['', 1440], ['coupes.html', 390], ['coupes.html', 1440]]) {
      const pre = pg ? 'coupes-' : '';
      const ctx = await nav.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(BASE + pg + '?date=2026-09-29');
      await page.addStyleTag({ content: 'img{visibility:hidden!important}.bouton--rouge{color:transparent!important}.bouton--rouge svg{visibility:hidden}' });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(BUDGET, `page-${pre}${w}.png`), fullPage: true });
      if (w === 390) {
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0, k = 0; y < H - 200; y += 600, k++) {
          await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(BUDGET, `ecran-${pre}${String(k).padStart(2, '0')}.png`) });
        }
      }
      await ctx.close();
    }
  }

  // 18 — revue : ruban exactement quatre fois
  {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE);
    const n = await page.$$eval('.ruban', r => r.filter(x => x.offsetWidth > 0).length);
    await page.goto(BASE + 'coupes.html');
    const n2 = await page.$$eval('.ruban', r => r.filter(x => x.offsetWidth > 0).length);
    verifier(M, 18, 'Ruban tricolore : quatre fois sur l’accueil, deux sur la page des coupes', n === 4 && n2 === 2, `${n} / ${n2}`);
    await ctx.close();
  }

  // 19 — deux pages : « Voir les coupes » mène à la page 2 ; une coupe de l’accueil s’ouvre directement
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE);
    await page.waitForFunction(() => !document.documentElement.classList.contains('attente'));
    await Promise.all([page.waitForURL(/coupes\.html$/), page.click('.heros .lien-fleche')]);
    const h1 = await page.textContent('h1');
    verifier(M, 19, '« Voir les coupes » ouvre la page des coupes', h1.trim() === 'Les coupes', h1);
    await page.goto(BASE);
    await page.waitForFunction(() => !document.documentElement.classList.contains('attente'));
    await page.locator('.vitrine__photo').nth(1).scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(/coupes\.html/), page.locator('.vitrine__photo').nth(1).click()]);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ open: document.getElementById('visionneuse').open, c: document.getElementById('vis-compteur').textContent, hash: location.hash }));
    verifier(M, 19, 'Une coupe de l’accueil s’ouvre en grand sur la page 2 (« 2 sur 5 »)', r.open && r.c === '2 sur 5' && r.hash === '', JSON.stringify(r));
    await page.keyboard.press('Escape');
    await page.goto(BASE + 'coupes.html');
    await Promise.all([page.waitForURL(/index\.html$/), page.click('.lien-fleche--retour')]);
    verifier(M, 19, 'Lien « Accueil » de la page des coupes', (await page.locator('h1').textContent()).includes('Une coupe nette'));
    await ctx.close();
  }

  // 20 — sans JavaScript, les coupes s’agrandissent quand même (:target)
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + 'coupes.html');
    await page.locator('.galerie .vignette').nth(2).click();
    const r = await page.evaluate(() => {
      const f = document.querySelector('#photo-3 .photo'), cs = getComputedStyle(f), b = f.getBoundingClientRect();
      return { pos: cs.position, couvre: b.width >= window.innerWidth - 1 && b.height >= window.innerHeight - 1, compteur: document.querySelector('#photo-3 .photo__compteur').textContent };
    });
    await page.click('#photo-3 .photo__suiv');
    const suiv = await page.evaluate(() => location.hash);
    await page.click('#photo-4 .photo__fermer');
    const ferme = await page.evaluate(() => getComputedStyle(document.querySelector('#photo-4 .photo')).position);
    verifier(M, 20, 'Sans JS : la photo cliquée s’affiche en grand, suivante et fermer fonctionnent',
      r.pos === 'fixed' && r.couvre && r.compteur === '3 sur 5' && suiv === '#photo-4' && ferme !== 'fixed', JSON.stringify({ r, suiv, ferme }));
    await ctx.close();
  }

  await nav.close();
}
serveur.close();

const parMoteur = {};
for (const r of resultats) (parMoteur[r.moteur] ??= []).push(r);
for (const [m, rs] of Object.entries(parMoteur)) {
  console.log(`\n${m} : ${rs.filter(r => r.ok === true).length}/${rs.length} tests réussis`);
  for (const r of rs) console.log(`${r.ok === true ? 'OK ' : r.ok === null ? 'N/A' : 'ÉCHEC'}  ${String(r.num).padStart(2)}. ${r.nom}${r.ok !== true && r.detail ? '  → ' + r.detail : ''}`);
}
console.log('\nExemples de messages :');
exemples.forEach((e, i) => console.log(`--- ${i + 1}\n${e}`));
fs.writeFileSync(path.join(ROOT, 'build', 'acceptance.json'), JSON.stringify({ resultats, exemples }, null, 2));
process.exit(resultats.some(r => r.ok === false) ? 1 : 0);
