// Captures d’écran : node tests/captures.mjs <dossier> [ancre]   (ex. #les-coupes pour la vue des coupes)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const out = process.argv[2] || 'captures';
const ancre = process.argv[3] || '';
const url = pathToFileURL(path.resolve('index.html')).href + '?date=2026-09-29' + ancre;
const b = await chromium.launch({ args: ['--disable-lcd-text'] });
for (const [w, h] of [[390, 844], [1440, 900], [834, 1112], [320, 640], [1180, 820]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 900 ? 2 : 1, reducedMotion: 'reduce' });
  await p.goto(url);
  await p.waitForTimeout(300);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
  await p.waitForTimeout(300);
  const nom = ancre ? 'coupes' : 'index';
  await p.screenshot({ path: `${out}/${nom}-${w}-ecran1.png` });
  await p.screenshot({ path: `${out}/${nom}-${w}-page.png`, fullPage: true });
  await p.close();
}
await b.close();
