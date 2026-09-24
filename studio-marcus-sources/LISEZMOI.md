# Studio Marcus — sources de la fiche

Le livrable est `../index.html` (un seul fichier autonome, à déposer sur Netlify).

- `src/` : écrin (`ecrin.css`, `body.html`, `app.js`), maquettes M1 à M6 (`m1.*` … `m6.*`), configurateur (`conf.js`, `cameleon.*`), avant/après (`vieux.*`), impression (`print.css`).
- `fonts/` : Instrument Serif, Instrument Sans (axes wght et wdth) et Fraunces (opsz, wght, SOFT, WONK), réduites au latin utile.
- `python3 build.py` régénère `../index.html`.
- `node tests.js` lance les tests d'acceptation (Playwright, Chromium).
