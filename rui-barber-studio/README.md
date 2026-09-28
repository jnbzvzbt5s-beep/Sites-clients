# Rui’s Barber Studio — site vitrine

Livrable : `index.html` (fichier unique, à déposer tel quel sur Netlify).

## Construire

```sh
pip install pillow pillow-heif fonttools brotli numpy
python3 tools/photos.py    # photos-src/ → build/img/ (recadrage, étalonnage, WebP sans métadonnées)
python3 tools/logo.py      # logo-src/ → build/logo/ (cercle détouré, favicon « RBS »)
python3 tools/build.py     # data/ + src/ → index.html
```

- `data/site.json` : source unique (prix, liens Instagram, textes de contact, métadonnées, JSON-LD).
- `data/photos.json` : rôle, texte alternatif, légende et point focal de chaque photo.
- `src/logo.html` : composant du logo (cercle « RBS » + nom), utilisé en en-tête et en pied de page.
- `fonts/` : Archivo variable (OFL), réduite à la construction.

## Tester

```sh
python3 tests/static_checks.py      # poids, couleurs, contrastes, métadonnées, concordance des données
node tests/acceptance.mjs           # Playwright : Chromium (+ WebKit s’il est installé)
node tests/lighthouse.mjs           # Lighthouse mobile, page servie compressée
node tests/captures.mjs <dossier>   # captures 320 / 390 / 834 / 1180 / 1440
```
