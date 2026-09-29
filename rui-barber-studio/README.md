# Rui’s Barber Studio — site vitrine (V5 « le dégradé net »)

Livrable : `index.html` (fichier unique, à glisser-déposer sur un nouveau site Netlify).
Planche de tokens : `tokens.html`. Captures : `livraison/`.

## Construire

```sh
pip install pillow pillow-heif fonttools brotli numpy
python3 tools/photos.py           # photos-src/ → build/img/ (EXIF appliqué puis supprimé, recadrage 4:5, étalonnage)
python3 tools/logo.py             # logo-src/ → build/logo/ (image carrée telle quelle, redimensionnée)
python3 tools/build.py            # échoue tant qu’il reste un « À COMPLÉTER » dans data/contenu.json
python3 tools/build.py --brouillon  # assemble quand même, « À COMPLÉTER » affichés surlignés
```

`data/contenu.json` est la source unique : textes, photos (rôle, recadrage, alt, légende), liens.

## Tester

```sh
python3 tests/static_checks.py    # poids, couleurs interdites, contrastes, métadonnées, JSON-LD, typographie
node tests/acceptance.mjs         # Playwright (Chromium --disable-lcd-text ; WebKit s’il est installé)
python3 tests/budgets.py          # budgets rouge / rose / violet / sombre sur les captures de acceptance.mjs
node tests/lighthouse.mjs         # Lighthouse mobile, page servie compressée
node tests/captures.mjs <dossier> # captures 320 / 390 / 834 / 1180 / 1440
```
