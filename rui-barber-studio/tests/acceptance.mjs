// Tests d’acceptation (section 14) — node tests/acceptance.mjs
// Moteurs : Chromium toujours ; WebKit si installé (PLAYWRIGHT_BROWSERS_PATH).
import { chromium, webkit } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'));
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const LARGEURS = [320, 390, 834, 1180, 1440];
const N = ' ';
const IG = SITE.instagram.message;

// Serveur local : ne sert que index.html, et compte chaque requête reçue.
let requetesServeur = [];
const serveur = http.createServer((req, res) => {
  requetesServeur.push(req.url);
  if (req.url.split('?')[0] === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(HTML);
  } else {
    res.writeHead(404); res.end();
  }
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${serveur.address().port}/`;

const resultats = [];
function verifier(moteur, nom, ok, detail = '') {
  resultats.push({ moteur, nom, ok: !!ok, detail });
  if (!ok) console.log(`  ÉCHEC [${moteur}] ${nom} ${detail}`);
}

// Référence indépendante : les jours attendus sont écrits à la main.
const SEMAINE_28_SEPT = [
  ['lundi 28 septembre', 'Aujourd’hui', 'lun. 28 sept.'],
  ['mardi 29 septembre', 'Demain', 'mar. 29 sept.'],
  ['mercredi 30 septembre', 'mer. 30 sept.', null],
  ['jeudi 1er octobre', 'jeu. 1er oct.', null],
  ['vendredi 2 octobre', 'ven. 2 oct.', null],
  ['samedi 3 octobre', 'sam. 3 oct.', null],
  ['dimanche 4 octobre', 'dim. 4 oct.', null],
];
const MOMENTS = [
  ['Le matin', 'le matin'], ['À midi', 'à midi'], ['L’après-midi', 'l’après-midi'],
  ['En fin de journée', 'en fin de journée'], ['Je suis flexible', 'je suis flexible'],
];
function attendu(jour, moment, prenom) {
  const l = [
    `Bonjour Rui${N}! Je voudrais un rendez-vous pour une coupe complète.`,
    `Jour${N}: ${jour ?? 'peu importe'}`,
    `Moment${N}: ${moment ?? 'je suis flexible'}`,
  ];
  if (prenom) l.push(`Prénom${N}: ${prenom}`);
  l.push(`Merci${N}!`);
  return l.join('\n');
}

async function lancer(type) {
  try { return await type.launch(); } catch (e) { return null; }
}

const exemples = [];
const moteurs = [['chromium', chromium], ['webkit', webkit]];
for (const [nomMoteur, type] of moteurs) {
  const navigateur = await lancer(type);
  if (!navigateur) {
    resultats.push({ moteur: nomMoteur, nom: 'Lancement du moteur', ok: null, detail: 'non installé : tests non exécutés' });
    continue;
  }
  console.log(`— ${nomMoteur} ${navigateur.version()}`);
  const M = nomMoteur;

  // 1 & 2. Console, réseau, cookies, défilement horizontal, barre d’action — à chaque largeur
  for (const w of LARGEURS) {
    const ctx = await navigateur.newContext({ viewport: { width: w, height: w < 768 ? 800 : 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    const requetes = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.text()); });
    page.on('pageerror', e => erreurs.push(String(e)));
    page.on('request', r => { if (!r.url().startsWith('data:')) requetes.push(r.url()); });
    requetesServeur = [];
    await page.goto(BASE + '?date=2026-09-28', { waitUntil: 'load' });
    // Parcours complet pour décoder toutes les images différées
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); }
    });
    await page.waitForTimeout(1300);
    const autres = requetes.filter(u => !u.startsWith(BASE));
    verifier(M, `${w}px : zéro erreur ni avertissement dans la console`, erreurs.length === 0, erreurs.join(' | '));
    verifier(M, `${w}px : zéro requête réseau hors document`, autres.length === 0 && requetesServeur.length === 1 && requetes.length === 1,
      `${requetes.length} requête(s) : ${requetes.join(', ')}`);
    const cookies = await ctx.cookies();
    const docCookie = await page.evaluate(() => document.cookie);
    verifier(M, `${w}px : zéro cookie`, cookies.length === 0 && docCookie === '');
    const deb = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const hors = [];
      document.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || el.closest("dialog") || el.closest("[aria-hidden=true]")) return;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > W + 0.5 || r.left < -0.5)) hors.push(el.className || el.tagName);
      });
      return { sw: document.documentElement.scrollWidth, W, hors: hors.slice(0, 5) };
    });
    verifier(M, `${w}px : zéro défilement horizontal`, deb.sw <= deb.W && deb.hors.length === 0, JSON.stringify(deb));
    // 9. Barre d’action
    const barre = await page.evaluate(() => {
      const b = document.querySelector('.barre');
      const cs = getComputedStyle(b);
      window.scrollTo(0, document.documentElement.scrollHeight);
      const r = b.getBoundingClientRect();
      const dernier = document.querySelector('.pied__credit a').getBoundingClientRect();
      return { visible: cs.display !== 'none', haut: r.top, bas: r.bottom, vh: window.innerHeight, dernierBas: dernier.bottom };
    });
    if (w < 768) {
      verifier(M, `${w}px : barre d’action visible, en bas`, barre.visible && Math.abs(barre.bas - barre.vh) < 1);
      verifier(M, `${w}px : la barre ne cache aucun contenu (fin de page au-dessus)`, barre.dernierBas <= barre.haut, JSON.stringify(barre));
    } else {
      verifier(M, `${w}px : pas de barre d’action`, !barre.visible);
    }
    // Zones tactiles ≥ 44 × 44
    const petites = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('a, button, .puce span, input:not([type=radio]), textarea').forEach(el => {
        if (el.closest('dialog') || getComputedStyle(el).display === 'none') return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        if (el.matches('.evitement')) return;
        if (r.height < 44 || (r.width < 44)) out.push(`${el.tagName}.${el.className}:${Math.round(r.width)}x${Math.round(r.height)} « ${el.textContent.trim().slice(0, 20)} »`);
      });
      return out;
    });
    verifier(M, `${w}px : zones tactiles ≥ 44 × 44 px`, petites.length === 0, petites.join(' ; '));
    await ctx.close();
  }

  // 3. Module : toutes les combinaisons
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-28');
    const puces = await page.$$eval('#jours .puce', ls => ls.map(l => ({
      texte: l.querySelector('span').firstChild.textContent,
      detail: l.querySelector('small')?.textContent ?? null,
      valeur: l.querySelector('input').value,
    })));
    const puceOk = puces.length === 8 && SEMAINE_28_SEPT.every(([v, t, d], i) =>
      puces[i].valeur === v && puces[i].texte === t && puces[i].detail === d) &&
      puces[7].texte === 'Peu importe' && puces[7].valeur === 'peu importe';
    verifier(M, 'Puces des jours (28 sept. 2026, heure du Luxembourg, « 1er »)', puceOk, JSON.stringify(puces.map(p => p.texte + (p.detail ? '/' + p.detail : ''))));
    const moments = await page.$$eval('input[name=moment]', ls => ls.map(i => [i.nextElementSibling.textContent, i.value]));
    verifier(M, 'Puces des moments', JSON.stringify(moments) === JSON.stringify(MOMENTS));

    const jours = [null, ...SEMAINE_28_SEPT.map(j => j[0]), 'peu importe'];
    const momentsV = [null, ...MOMENTS.map(m => m[1])];
    const prenoms = ['', 'Léa', '  Jean-Marc   Dos  Santos '];
    let total = 0, faux = [];
    for (const j of jours) for (const m of momentsV) for (const p of prenoms) {
      const val = await page.evaluate(({ j, m, p }) => {
        const f = document.getElementById('module');
        f.querySelectorAll('input[type=radio]').forEach(i => { i.checked = false; });
        if (j) f.querySelector(`input[name=jour][value="${j}"]`).checked = true;
        if (m) f.querySelector(`input[name=moment][value="${m}"]`).checked = true;
        const pr = document.getElementById('prenom');
        pr.value = p;
        pr.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new Event('change', { bubbles: true }));
        return document.getElementById('apercu').value;
      }, { j, m, p });
      const pNet = p.trim().replace(/\s+/g, ' ');
      const att = attendu(j, m, pNet);
      total++;
      if (val !== att) faux.push({ j, m, p, val });
      if (M === 'chromium' && ((j === null && m === null && p === '') || (j === 'jeudi 1er octobre' && m === 'le matin' && p === 'Léa') ||
          (j === 'peu importe' && m === 'en fin de journée' && p === '') || (j === 'lundi 28 septembre' && m === 'à midi' && p === '  Jean-Marc   Dos  Santos ') ||
          (j === 'mardi 29 septembre' && m === null && p === 'Léa'))) exemples.push(val);
    }
    verifier(M, `Module : ${total} combinaisons jour × moment × prénom (dont « rien de choisi »)`, faux.length === 0, JSON.stringify(faux.slice(0, 2)));

    // Vraie saisie : clics et frappe, prénom limité à 30 caractères, champ ≥ 16 px
    await page.reload();
    await page.click('#jours .puce:nth-child(4)');
    await page.click('.puce:has-text("L’après-midi")');
    await page.fill('#prenom', '');
    await page.type('#prenom', 'Maximilian-Alexander von Luxemburg');
    await page.waitForTimeout(300); // fin de la transition de 200 ms de la puce
    const saisi = await page.evaluate(() => ({ v: document.getElementById('apercu').value, len: document.getElementById('prenom').value.length,
      fs: parseFloat(getComputedStyle(document.getElementById('prenom')).fontSize),
      sel: getComputedStyle(document.querySelector('#jours .puce:nth-child(4) span')).backgroundColor }));
    verifier(M, 'Saisie réelle : message à jour, prénom ≤ 30 caractères, police ≥ 16 px',
      saisi.v === attendu('jeudi 1er octobre', 'l’après-midi', 'Maximilian-Alexander von Luxem') && saisi.len === 30 && saisi.fs >= 16, JSON.stringify(saisi));
    verifier(M, 'Puce choisie remplie de --bleu', saisi.sel === 'rgb(159, 203, 232)', saisi.sel);
    const scrollable = await page.evaluate(() => { const a = document.getElementById('apercu'); return a.scrollHeight <= a.clientHeight + 1; });
    verifier(M, 'Aperçu entièrement visible (sans barre de défilement)', scrollable);
    await ctx.close();
  }

  // 4. Bouton principal et « Copier le message »
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    if (M === 'chromium') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    await ctx.route(/ig\.me|instagram\.com/, r => r.fulfill({ status: 200, body: 'Instagram (simulé)' }));
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-28');
    await page.click('.puce:has-text("Demain")');
    await page.click('.puce:has-text("Le matin")');
    const href = await page.getAttribute('#envoyer', 'href');
    const tag = await page.$eval('#envoyer', e => e.tagName + '|' + e.target + '|' + e.rel);
    verifier(M, 'Bouton principal : vrai lien vers https://ig.me/m/ruis_barber_studio', href === IG && tag === 'A|_blank|noopener', `${href} ${tag}`);
    const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#envoyer')]);
    await page.waitForTimeout(300);
    const popupUrl = popup.url();
    const statut = await page.textContent('#statut');
    const msg = attendu('mardi 29 septembre', 'le matin', '');
    let presse = null;
    if (M === 'chromium') presse = await page.evaluate(() => navigator.clipboard.readText());
    verifier(M, 'Clic sur le bouton principal : Instagram s’ouvre (lien non bloqué)', popupUrl.startsWith(IG), popupUrl);
    verifier(M, 'Clic sur le bouton principal : message copié + confirmation', statut === `Message copié${N}: collez-le dans la conversation.` && (M !== 'chromium' || presse === msg), `${statut} / ${JSON.stringify(presse)}`);
    await popup.close();
    await page.evaluate(() => navigator.clipboard && navigator.clipboard.writeText && navigator.clipboard.writeText('vide').catch(() => {}));
    const urlAvant = page.url();
    await page.click('#copier');
    await page.waitForTimeout(200);
    const presse2 = M === 'chromium' ? await page.evaluate(() => navigator.clipboard.readText()) : null;
    verifier(M, '« Copier le message » copie sans quitter la page', page.url() === urlAvant && ctx.pages().length === 1 && (M !== 'chromium' || presse2 === msg), `${page.url()} ${JSON.stringify(presse2)}`);
    await ctx.close();
  }

  // 5. Presse-papiers absent ou refusé
  for (const [cas, init] of [
    ['absent', () => { Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined, configurable: true }); document.execCommand = () => false; }],
    ['refusé', () => { Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => ({ writeText: () => Promise.reject(new DOMException('refusé', 'NotAllowedError')) }), configurable: true }); document.execCommand = () => false; }],
  ]) {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/ig\.me|instagram\.com/, r => r.fulfill({ status: 200, body: 'ok' }));
    const page = await ctx.newPage();
    await page.addInitScript(init);
    await page.goto(BASE + '?date=2026-09-28');
    await page.click('#copier');
    await page.waitForTimeout(700);
    const etat = await page.evaluate(() => {
      const a = document.getElementById('apercu');
      const st = document.getElementById('statut').getBoundingClientRect();
      const barre = document.querySelector('.barre').getBoundingClientRect();
      window.__statutVisible = st.bottom <= barre.top && st.top >= 0;
      return { statut: document.getElementById('statut').textContent, erreur: document.getElementById('statut').classList.contains('est-erreur'),
        sel: [a.selectionStart, a.selectionEnd, a.value.length], us: getComputedStyle(a).userSelect || getComputedStyle(a).webkitUserSelect, ro: a.readOnly,
        visible: window.__statutVisible };
    });
    verifier(M, `Presse-papiers ${cas} : le message d’échec est visible, au-dessus de la barre d’action`, etat.visible);
    verifier(M, `Presse-papiers ${cas} : message d’échec affiché, texte sélectionné et sélectionnable`,
      etat.statut === `Copie impossible${N}: sélectionnez le message et copiez-le.` && etat.erreur && etat.sel[0] === 0 && etat.sel[1] === etat.sel[2] && etat.us !== 'none',
      JSON.stringify(etat));
    const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#envoyer')]);
    await page.waitForTimeout(150);
    verifier(M, `Presse-papiers ${cas} : le lien Instagram s’ouvre quand même`, popup.url().startsWith(IG));
    await ctx.close();
  }
  // Repli execCommand (navigateur intégré d’Instagram sans API Clipboard)
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined, configurable: true });
      window.__copie = null;
      document.execCommand = (c) => { if (c === 'copy') { const a = document.activeElement; window.__copie = a.value.slice(a.selectionStart, a.selectionEnd); return true; } return false; };
    });
    await page.goto(BASE + '?date=2026-09-28');
    await page.click('#copier');
    const copie = await page.evaluate(() => window.__copie);
    verifier(M, 'Sans API Clipboard, repli execCommand : le message complet est copié', copie === attendu(null, null, ''));
    await ctx.close();
  }

  // 6. Passage d’année, et heure du Luxembourg
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-12-31');
    const j = await page.$$eval('#jours .puce', ls => ls.map(l => [l.querySelector('input').value, l.querySelector('span').firstChild.textContent, l.querySelector('small')?.textContent ?? null]));
    const att = [['jeudi 31 décembre', 'Aujourd’hui', 'jeu. 31 déc.'], ['vendredi 1er janvier', 'Demain', 'ven. 1er janv.'],
      ['samedi 2 janvier', 'sam. 2 janv.', null], ['dimanche 3 janvier', 'dim. 3 janv.', null], ['lundi 4 janvier', 'lun. 4 janv.', null],
      ['mardi 5 janvier', 'mar. 5 janv.', null], ['mercredi 6 janvier', 'mer. 6 janv.', null], ['peu importe', 'Peu importe', null]];
    verifier(M, '?date=2026-12-31 : « Demain » = vendredi 1er janvier, passage au mois et à l’année', JSON.stringify(j) === JSON.stringify(att), JSON.stringify(j.slice(0, 3)));
    await page.click('.puce:has-text("Demain")');
    const v = await page.inputValue('#apercu');
    verifier(M, '?date=2026-12-31 : message « Jour : vendredi 1er janvier »', v.includes(`Jour${N}: vendredi 1er janvier`));
    await page.goto(BASE + '?date=2026-02-28');
    const f = await page.$eval('#jours .puce:nth-child(2) input', i => i.value);
    verifier(M, '?date=2026-02-28 : « Demain » = dimanche 1er mars', f === 'dimanche 1er mars', f);
    await ctx.close();
    // Heure du Luxembourg : à Honolulu il est encore le 28, au Luxembourg déjà le 29.
    const ctx2 = await navigateur.newContext({ timezoneId: 'Pacific/Honolulu' });
    const p2 = await ctx2.newPage();
    await p2.clock.setFixedTime(new Date('2026-09-28T23:30:00Z'));
    await p2.goto(BASE);
    const auj = await p2.$eval('#jours .puce:nth-child(1) input', i => i.value);
    verifier(M, 'Sans ?date : « Aujourd’hui » suit l’heure du Luxembourg (Honolulu 28 → Luxembourg 29)', auj === 'mardi 29 septembre', auj);
    await ctx2.close();
  }

  // 7. Clavier
  {
    const ctx = await navigateur.newContext({ viewport: { width: 1180, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-28');
    await page.keyboard.press('Tab');
    const evit = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return [a.textContent, r.top >= 0]; });
    verifier(M, 'Clavier : « Aller au contenu » en premier, visible au focus', evit[0] === 'Aller au contenu' && evit[1], JSON.stringify(evit));
    // Ordre de tabulation jusqu’au module
    const ordre = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        const cible = a.matches('input[type=radio]') ? a.nextElementSibling : a;
        const cs = getComputedStyle(cible);
        return { id: a.id, name: a.name || '', txt: (a.textContent || a.value || '').trim().slice(0, 24), tag: a.tagName,
          focus: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      ordre.push(info);
      if (info.id === 'copier') break;
    }
    const sansFocus = ordre.filter(o => !o.focus);
    verifier(M, 'Clavier : focus visible sur chaque élément atteint', sansFocus.length === 0, JSON.stringify(sansFocus.slice(0, 3)));
    const noms = ordre.map(o => o.name || o.id);
    const iJour = noms.indexOf('jour'), iMoment = noms.indexOf('moment'), iPrenom = noms.indexOf('prenom'), iEnv = noms.indexOf('envoyer');
    verifier(M, 'Clavier : ordre logique Jour → Moment → Prénom → Aperçu → Envoyer → Copier',
      iJour > 0 && iJour < iMoment && iMoment < iPrenom && iPrenom < noms.indexOf('apercu') && noms.indexOf('apercu') < iEnv && iEnv < noms.indexOf('copier'), noms.slice(-8).join(' > '));
    // Flèches dans chaque groupe
    await page.focus('#jours input');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const c1 = await page.evaluate(() => [document.activeElement.value, document.activeElement.checked]);
    const f1 = await page.evaluate(() => getComputedStyle(document.activeElement.nextElementSibling).outlineStyle);
    await page.focus('input[name=moment]');
    await page.keyboard.press('ArrowDown');
    const c2 = await page.evaluate(() => [document.activeElement.value, document.activeElement.checked]);
    const v = await page.inputValue('#apercu');
    verifier(M, 'Clavier : flèches dans « Jour » et « Moment », message à jour, focus visible',
      c1[0] === 'mercredi 30 septembre' && c1[1] && c2[0] === 'à midi' && c2[1] && f1 !== 'none' && v === attendu('mercredi 30 septembre', 'à midi', ''), JSON.stringify([c1, c2, f1]));
    await page.keyboard.press('Tab');
    await page.keyboard.type('Ana');
    verifier(M, 'Clavier : le prénom se saisit après les moments', (await page.inputValue('#apercu')).includes(`Prénom${N}: Ana`));
    await ctx.close();
  }

  // 8. Visionneuse
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: M === 'chromium' });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-28');
    const vignettes = page.locator('.vignette');
    const nb = await vignettes.count();
    await vignettes.nth(2).scrollIntoViewIfNeeded();
    await vignettes.nth(2).click();
    await page.waitForTimeout(250);
    const e1 = await page.evaluate(() => ({ open: document.getElementById('visionneuse').open, c: document.getElementById('vis-compteur').textContent,
      alt: document.getElementById('vis-img').alt, src: document.getElementById('vis-img').src.slice(0, 16) }));
    verifier(M, `Visionneuse : ouverture sur la 3e photo, compteur « 3 sur ${nb} »`, e1.open && e1.c === `3 sur ${nb}` && e1.alt.length > 10 && e1.src === 'data:image/webp;', JSON.stringify(e1));
    await page.keyboard.press('ArrowRight');
    const c2 = await page.textContent('#vis-compteur');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    const c3 = await page.textContent('#vis-compteur');
    verifier(M, 'Visionneuse : flèches du clavier', c2 === `4 sur ${nb}` && c3 === `2 sur ${nb}`, `${c2} / ${c3}`);
    await page.click('#vis-suiv');
    const c4 = await page.textContent('#vis-compteur');
    await page.click('#vis-prec');
    const c5 = await page.textContent('#vis-compteur');
    verifier(M, 'Visionneuse : boutons précédente / suivante', c4 === `3 sur ${nb}` && c5 === `2 sur ${nb}`, `${c4} / ${c5}`);
    // Balayage au doigt
    const balayer = (dx) => page.evaluate((dx) => {
      const fig = document.querySelector('.visionneuse__figure');
      const r = fig.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const t = (cx) => new Touch({ identifier: 1, target: fig, clientX: cx, clientY: y });
      fig.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x)], changedTouches: [t(x)], bubbles: true }));
      fig.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx)], bubbles: true }));
      return document.getElementById('vis-compteur').textContent;
    }, dx);
    const s1 = await balayer(-120);
    const s2 = await balayer(120);
    const s3 = await balayer(120);
    verifier(M, 'Visionneuse : balayage au doigt (gauche → suivante, droite → précédente, boucle)', s1 === `3 sur ${nb}` && s2 === `2 sur ${nb}` && s3 === `1 sur ${nb}`, `${s1} / ${s2} / ${s3}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const f1 = await page.evaluate(() => ({ open: document.getElementById('visionneuse').open, focus: document.activeElement === document.querySelectorAll('.vignette')[2] }));
    verifier(M, 'Visionneuse : Échap ferme, focus rendu à la vignette', !f1.open && f1.focus, JSON.stringify(f1));
    await vignettes.nth(5).click();
    await page.waitForTimeout(250);
    await page.mouse.click(8, 420);
    await page.waitForTimeout(100);
    const f2 = await page.evaluate(() => ({ open: document.getElementById('visionneuse').open, focus: document.activeElement === document.querySelectorAll('.vignette')[5] }));
    verifier(M, 'Visionneuse : toucher hors de la photo ferme, focus rendu', !f2.open && f2.focus, JSON.stringify(f2));
    await vignettes.nth(0).click();
    await page.waitForTimeout(250);
    await page.click('.visionneuse__img');
    const resteOuvert = await page.evaluate(() => document.getElementById('visionneuse').open);
    await page.click('#vis-fermer');
    const f3 = await page.evaluate(() => ({ open: document.getElementById('visionneuse').open, focus: document.activeElement === document.querySelectorAll('.vignette')[0] }));
    verifier(M, 'Visionneuse : toucher la photo ne ferme pas ; bouton Fermer ferme', resteOuvert && !f3.open && f3.focus, JSON.stringify(f3));
    await ctx.close();
  }

  // 10. Mouvement réduit (et, sans réduction, ouverture ≤ 1,2 s puis plus rien)
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-28');
    await page.click('.puce:has-text("Demain")');
    await page.locator('.vignette').first().click();
    const r = await page.evaluate(() => ({
      anims: document.getAnimations().length,
      heros: getComputedStyle(document.querySelector('.heros__titre')).animationName,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
      trans: getComputedStyle(document.querySelector('.puce span')).transitionDuration,
    }));
    verifier(M, 'Mouvement réduit : aucune animation, aucune transition, défilement instantané',
      r.anims === 0 && r.heros === 'none' && r.scroll === 'auto' && /^0s(, 0s)*$/.test(r.trans), JSON.stringify(r));
    await ctx.close();
    const ctx2 = await navigateur.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const p2 = await ctx2.newPage();
    await p2.goto(BASE + '?date=2026-09-28');
    const debut = await p2.evaluate(() => document.getAnimations().map(a => { const t = a.effect.getComputedTiming(); return [a.animationName, t.delay + t.duration]; }));
    await p2.waitForTimeout(1400);
    const apres = await p2.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    const max = Math.max(...debut.map(d => d[1]));
    verifier(M, 'Ouverture : logo, « Moien ! », titre, rayures — 1,2 s au plus, puis plus rien ne bouge',
      debut.length === 4 && max <= 1200 && apres === 0, JSON.stringify(debut) + ` ; en cours après 1,4 s : ${apres}`);
    await ctx2.close();
  }

  // Halo du héros : suit la souris sur ordinateur, s’arrête ensuite ; absent en mouvement réduit
  {
    const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '?date=2026-09-28');
    const t0 = await page.$eval('#halo', h => h.style.transform);
    await page.mouse.move(900, 300); await page.mouse.move(700, 500, { steps: 8 });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const h = document.getElementById('halo'), z = h.closest('.heros-bande').getBoundingClientRect();
      const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(h.style.transform) || [];
      return { actif: h.classList.contains('est-actif'), x: +m[1], y: +m[2], zt: z.top };
    });
    const t1 = await page.$eval('#halo', h => h.style.transform);
    await page.waitForTimeout(300);
    const t2 = await page.$eval('#halo', h => h.style.transform);
    verifier(M, 'Halo : suit la souris puis s’immobilise (aucune boucle continue)',
      t0 === '' && r.actif && Math.abs(r.x - 700) < 3 && Math.abs(r.y - (500 - r.zt)) < 3 && t1 === t2, JSON.stringify(r));
    await ctx.close();
    const ctx2 = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const p2 = await ctx2.newPage();
    await p2.goto(BASE);
    await p2.mouse.move(700, 500, { steps: 5 });
    await p2.waitForTimeout(300);
    const h2 = await p2.$eval('#halo', h => [getComputedStyle(h).display, h.style.transform]);
    verifier(M, 'Halo : absent en mouvement réduit', h2[0] === 'none' && h2[1] === '', JSON.stringify(h2));
    await ctx2.close();
  }

  // 11. JavaScript désactivé
  {
    const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE);
    const moduleVisible = await page.locator('#module').isVisible();
    const lien = page.locator('.rdv__sansjs a');
    const lienOk = await lien.isVisible() && (await lien.getAttribute('href')) === IG && (await lien.textContent()) === 'M’écrire sur Instagram';
    const titres = await page.locator('h1, h2').allTextContents();
    const photos = page.locator('main .vignette img');
    const nbImg = await photos.count();
    let visibles = 0;
    for (let i = 0; i < nbImg; i++) if (await photos.nth(i).isVisible()) visibles++;
    const textes = await page.locator('.rui__langues li').count();
    verifier(M, 'Sans JavaScript : module remplacé par « M’écrire sur Instagram »', !moduleVisible && lienOk);
    verifier(M, 'Sans JavaScript : tout le contenu reste lisible (titres, photos, langues, contact)',
      titres.length === 7 && visibles === nbImg && nbImg === 7 && textes === 5 && await page.locator('.contact__pseudo').isVisible(), `${titres.length} titres, ${visibles}/${nbImg} photos`);
    await page.screenshot({ path: path.join(ROOT, 'build', `sans-js-${M}.png`), fullPage: true });
    await ctx.close();
  }

  // 12. Textes alternatifs dans le DOM
  {
    const ctx = await navigateur.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE);
    const alts = await page.$$eval('main img', is => is.map(i => i.alt));
    verifier(M, 'Toutes les photos ont un texte alternatif précis (DOM)', alts.length === 7 && alts.every(a => a.length >= 12 && /vu|vus/.test(a)), JSON.stringify(alts));
    await ctx.close();
  }

  await navigateur.close();
}

serveur.close();

// Rapport
const parMoteur = {};
for (const r of resultats) (parMoteur[r.moteur] ??= []).push(r);
for (const [m, rs] of Object.entries(parMoteur)) {
  const ok = rs.filter(r => r.ok === true).length;
  console.log(`\n${m} : ${ok}/${rs.length} tests réussis`);
  for (const r of rs) console.log(`${r.ok === true ? 'OK ' : r.ok === null ? 'N/A' : 'ÉCHEC'}  ${r.nom}${r.detail && r.ok !== true ? '  → ' + r.detail : ''}`);
}
console.log('\nExemples de messages :');
exemples.forEach((e, i) => console.log(`--- ${i + 1}\n${e}`));
fs.writeFileSync(path.join(ROOT, 'build', 'acceptance.json'), JSON.stringify({ resultats, exemples }, null, 2));
process.exit(resultats.some(r => r.ok === false) ? 1 : 0);
