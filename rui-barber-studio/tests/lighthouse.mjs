// Lighthouse mobile, index.html servi compressé (gzip, comme Netlify) : node tests/lighthouse.mjs [fichier] [sortie.json]
import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const fichier = process.argv[2] || 'index.html';
const sortie = process.argv[3] || 'build/lighthouse.json';
const gz = zlib.gzipSync(fs.readFileSync(fichier), { level: 9 });
const srv = http.createServer((req, res) => {
  if (req.url !== '/') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'gzip', 'cache-control': 'no-cache' });
  res.end(gz);
});
await new Promise(r => srv.listen(8767, '127.0.0.1', r));
const lh = process.env.LIGHTHOUSE || '/tmp/fontwork/node_modules/.bin/lighthouse';
try {
  await new Promise((resolve) => {
    import('node:child_process').then(({ execFile }) => {
      execFile(lh, ['http://127.0.0.1:8767/', '--quiet', '--chrome-flags=--headless=new --no-sandbox',
        '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${sortie}`],
        { env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }, timeout: 180000 },
        () => resolve());
    });
  });
} finally { srv.close(); }
const d = JSON.parse(fs.readFileSync(sortie, 'utf8'));
const s = Object.fromEntries(Object.entries(d.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
console.log(JSON.stringify(s), 'FCP', d.audits['first-contentful-paint'].displayValue, 'LCP', d.audits['largest-contentful-paint'].displayValue,
  'TBT', d.audits['total-blocking-time'].displayValue, 'CLS', d.audits['cumulative-layout-shift'].displayValue, `(${(gz.length / 1024).toFixed(0)} Ko compressés)`);
