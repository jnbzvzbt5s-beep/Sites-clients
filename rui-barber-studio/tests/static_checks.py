"""Contrôles statiques de index.html (V5) : poids, couleurs, contrastes, photos, données, textes.

Usage : python3 tests/static_checks.py   (code de sortie 1 si un contrôle échoue)
"""
import base64
import colorsys
import html
import io
import json
import pathlib
import re
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").read_text(encoding="utf-8")
C = json.loads((ROOT / "data" / "contenu.json").read_text(encoding="utf-8"))
CSS = "\n".join(re.findall(r"<style>(.*?)</style>", PAGE, re.S))
JS = "\n".join(re.findall(r"<script>(.*?)</script>", PAGE, re.S))
SANS_DATA = re.sub(r"data:[^\"')]+", "data:…", PAGE)
CSS_SANS_DATA = re.sub(r"data:[^\"')]+", "data:…", CSS)
resultats, echecs = [], []


def verifier(num, nom, ok, detail=""):
    resultats.append((num, nom, bool(ok), detail))
    if not ok:
        echecs.append(nom)


# ---------- 16. Poids ----------
taille = (ROOT / "index.html").stat().st_size
verifier(16, "Poids ≤ 1,6 Mo", taille <= 1.6 * 1024 * 1024, f"{taille / 1024:.1f} Ko")

# ---------- 1. Aucune ressource externe, aucun stockage ----------
sources = re.findall(r'\s(?:src|srcset|poster)="([^"]+)"', PAGE) + re.findall(r'<link[^>]+href="([^"]+)"', PAGE)
externes = [s for s in sources if not s.startswith("data:")] + [u for u in re.findall(r"url\(([^)]+)\)", CSS) if "data:" not in u]
verifier(1, "Aucune ressource externe (src, link, url())", not externes, str(externes)[:120])
verifier(1, "Ni localStorage, ni sessionStorage, ni cookie, ni bibliothèque", not re.search(r"localStorage|sessionStorage|document\.cookie|import\s|require\(", JS))
verifier(1, "Aucune intégration (iframe, vidéo, embed)", not re.search(r"<(iframe|video|embed|object)\b", PAGE))
verifier(3, "html.no-js passé en js par un script en tête", '<html lang="fr" class="no-js">' in PAGE and PAGE.index('replace("no-js"') < PAGE.index("<style>"))
verifier(3, "Chaque module JS dans son propre try/catch (police, dates, ticket, visionneuse, pastille)", JS.count("try {") >= 5)

# ---------- 13/15. Couleurs interdites ----------
def couleurs(texte):
    out = []
    for h in re.findall(r"#([0-9a-fA-F]{6})\b", texte):
        out.append(("#" + h, tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)), 1.0))
    for m in re.finditer(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([.\d]+))?", texte):
        out.append((m.group(0), tuple(int(m.group(i)) for i in (1, 2, 3)), float(m.group(4) or 1)))
    return out


toutes = couleurs(CSS_SANS_DATA) + couleurs(SANS_DATA.replace(CSS, ""))
interdites = []
for nom, (r, g, b), a in toutes:
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    h *= 360
    rose = (h >= 330 or h <= 25) and s >= .25 and l >= .62      # définitions du §19
    violet = 240 <= h <= 330 and s >= .20 and .12 <= l <= .92
    if rose or violet:
        interdites.append(nom)
verifier(15, "Aucun rose, magenta ni violet dans le code", not interdites, f"{len(toutes)} couleurs ; {interdites}")
rouges_transparents = [n for n, (r, g, b), a in toutes if r > 150 and g < 80 and b < 80 and a < 1]
verifier(15, "Rouge jamais transparent, flouté ou en ombre", not rouges_transparents, str(rouges_transparents))
verifier(18, "Aucun bord en biais (polygon, skew, rotate de section)", not re.search(r"polygon\(|skew", CSS))
verifier(18, "Ruban tricolore exactement quatre fois dans la page", len(re.findall(r'class="ruban ruban--', PAGE)) == 4)
verifier(18, "Rouge uniquement dans le ruban, le point de « Moien ! », le séparateur et les boutons laqués",
         set(re.findall(r"var\(--rouge[\w-]*\)", CSS)) <= {"var(--rouge)"} and CSS.count("var(--rouge)") == 1)
REGLES = re.findall(r"([^{}]+)\{([^{}]*)\}", CSS_SANS_DATA)
sel_clip = [sel.strip() for sel, corps in REGLES if re.search(r"(?<![-\w])background-clip:\s*text", corps)]
sel_flou = [sel.strip() for sel, corps in REGLES if re.search(r"(?<![-\w])backdrop-filter:\s*blur", corps)]
verifier(18, "Aucun dégradé texte hors du grand « Rui »", sel_clip == [".rui__nom"], str(sel_clip))
verifier(18, "Flou d’arrière-plan seulement dans l’en-tête", sel_flou == [".entete"], str(sel_flou))

# ---------- 15. Contrastes AA, y compris aux extrémités des dégradés ----------
def lum(rgb):
    c = [x / 255 for x in rgb]
    c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def melange(dessus, dessous, a):
    return tuple(round(a * x + (1 - a) * y) for x, y in zip(rgb(dessus) if isinstance(dessus, str) else dessus, rgb(dessous) if isinstance(dessous, str) else dessous))


def ratio(a, b):
    la, lb = sorted((lum(rgb(a) if isinstance(a, str) else a), lum(rgb(b) if isinstance(b, str) else b)), reverse=True)
    return (la + .05) / (lb + .05)


V = dict(re.findall(r"--([a-z-]+):\s*(#[0-9A-Fa-f]{6})", CSS))
panneau_clair = melange(V["ciel"], V["nuit"], .36)            # haut gauche : halo ciel sur nuit
panneau_bas = melange(V["roi"], "#1B4589", .55)               # bas droite : halo roi sur fin de dégradé
ciel_page = "#D4E4F7"                                         # D1, coin haut droit
paires = [
    ("encre", "blanc", "texte, ticket, cartes", 4.5), ("encre", "porcelaine", "texte sur la page", 4.5),
    ("encre", "#E6EFFA", "bas du ciel de page", 4.5), ("encre", ciel_page, "haut droit du ciel de page", 4.5),
    ("gris", "blanc", "étiquettes, chapô", 4.5), ("gris", "porcelaine", "chapô, pied", 4.5),
    ("gris", "#E6EFFA", "bas de page", 4.5), ("gris", "#E4EEFA", "pied de page", 4.5), ("roi", "#E4EEFA", "numéros, liens du pied", 4.5), ("gris", ciel_page, "étiquettes sous le halo", 4.5),
    ("roi", "blanc", "liens, « Moien ! »", 4.5), ("roi", "porcelaine", "valeurs de l’aperçu", 4.5),
    ("roi", "brume", "valeur surlignée", 4.5),
    ("blanc", "rouge-vif", "haut du bouton laqué", 4.5), ("blanc", "rouge", "bouton laqué", 4.5),
    ("blanc", "rouge-profond", "bas du bouton, appui", 4.5),
    ("blanc", "roi", "tuile et puce choisies", 4.5), ("blanc", "nuit", "bouton nuit, titre du panneau", 4.5),
    ("blanc", "#1B4589", "titre du panneau, fin du dégradé", 4.5), ("blanc", panneau_clair, "titre sous le halo ciel", 4.5),
    ("ciel", "nuit", "étiquette du panneau", 4.5), ("ciel", panneau_clair, "étiquette sous le halo ciel", 3.0),
    ("brume", "nuit", "étapes", 4.5), ("brume", "marine", "étapes", 4.5), ("brume", "#1B4589", "note sous le ticket", 4.5),
    ("brume", panneau_bas, "note, coin bas droit", 4.5),
    ("encre", "#FFFFFF", "étiquette prix", 4.5), ("blanc", "#13305F", "numéro d’index dans le panneau", 4.5), ("roi", ciel_page, "numéro d’index sous le halo", 4.5),
]
for t, f, usage, seuil in paires:
    ct, cf = V.get(t, t), V.get(f, f) if isinstance(f, str) else f
    r = ratio(ct, cf)
    verifier(15, f"Contraste {t} sur {f if isinstance(f, str) else 'rgb' + str(f)} ≥ {seuil} ({usage})", r >= seuil, f"{r:.2f}:1")
verifier(15, "--ciel jamais en texte hors du panneau nuit",
         all(any(k in sel for k in ("panneau", "etapes", "visionneuse")) for sel, corps in re.findall(r"([^{}]+)\{([^{}]*)\}", CSS)
             if re.search(r"(?<![-\w])color:\s*var\(--ciel\)", corps)))

# ---------- 13. Photos, logo, métadonnées ----------
imgs = re.findall(r"<img\s[^>]*>", PAGE)
photos = [i for i in imgs if "logo__img" not in i and "src=" in i]
logos = [i for i in imgs if "logo__img" in i]
verifier(13, "Six photos avec width, height, decoding=async ; loading=lazy sauf le hero (fetchpriority=high)",
         len(photos) == 6 and all(re.search(r'width="\d+" height="\d+"', i) and 'decoding="async"' in i for i in photos)
         and 'fetchpriority="high"' in photos[0] and 'loading="lazy"' not in photos[0] and all('loading="lazy"' in i for i in photos[1:]))
verifier(13, "Alt précis sur chaque photo", all(re.search(r'alt="[^"]{30,}"', i) for i in photos))
verifier(13, "Logo : trois occurrences carrées, alt « Rui’s Barber Studio »",
         len(logos) == 3 and all('alt="Rui’s Barber Studio"' in i and re.search(r'width="(\d+)" height="\1"', i) for i in logos))
meta, poids = [], []
for i in photos + logos:
    m = re.search(r'src="data:image/(webp|png);base64,([^"]+)"', i)
    data = base64.b64decode(m.group(2))
    im = Image.open(io.BytesIO(data))
    if len(im.getexif()) or im.info.get("exif") or im.info.get("xmp") or b"EXIF" in data[:4096] or b"GPS" in data[:4096]:
        meta.append(i[:60])
    if i in photos:
        poids.append((len(data), im.size))
verifier(13, "Aucune métadonnée EXIF, GPS ni XMP dans les images", not meta, str(meta))
verifier(13, "Poids : hero ≤ 180 Ko, autres photos ≤ 80 Ko ; toutes en 4:5",
         poids[0][0] <= 180 * 1024 and all(p <= 80 * 1024 for p, _ in poids[1:]) and all(abs(w * 5 - h * 4) <= 5 for _, (w, h) in poids),
         ", ".join(f"{p / 1024:.0f} Ko {w}×{h}" for p, (w, h) in poids))

# ---------- Données, métadonnées, JSON-LD ----------
titre = html.unescape(re.search(r"<title>(.*?)</title>", PAGE).group(1))
desc = html.unescape(re.search(r'<meta name="description" content="([^"]+)"', PAGE).group(1))
verifier(16, "Titre « Rui’s Barber Studio — barbier à Mersch »", titre == "Rui’s Barber Studio — barbier à Mersch")
verifier(16, "Meta description exacte", desc == "Coupe complète à 15 € à Mersch. Proposez un créneau sur Instagram, Rui vous confirme.", desc)
verifier(16, "theme-color #F5F8FC, favicon et apple-touch-icon en data URI",
         'name="theme-color" content="#F5F8FC"' in PAGE and 'rel="icon" type="image/png" sizes="64x64" href="data:image/png' in PAGE
         and 'rel="apple-touch-icon" sizes="180x180" href="data:image/png' in PAGE)
verifier(16, "Open Graph titre et description ; og:image et og:url absents tant que l’URL est inconnue",
         'property="og:title"' in PAGE and 'property="og:description"' in PAGE and "og:image" not in PAGE and "og:url" not in PAGE)
ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', PAGE, re.S).group(1))
verifier(16, "JSON-LD HairSalon : name, image, adresse Mersch/LU, priceRange 15 €, sameAs ; ni téléphone, ni email, ni horaires",
         ld["@type"] == "HairSalon" and ld["name"] == "Rui’s Barber Studio" and ld["image"].startswith("data:image/")
         and ld["address"]["addressLocality"] == "Mersch" and ld["address"]["addressCountry"] == "LU"
         and ld["priceRange"] == "15 €" and ld["sameAs"] == [C["site"]["instagram"]["profil"]]
         and not any(k in ld for k in ("telephone", "email", "openingHours", "openingHoursSpecification")))
liens_ig = set(re.findall(r'href="(https://[^"]*(?:ig\.me|instagram\.com)[^"]*)"', PAGE))
verifier(16, "Liens Instagram = contenu.json", liens_ig == {C["site"]["instagram"]["message"], C["site"]["instagram"]["profil"]}, str(liens_ig))
verifier(16, "Aucun téléphone, e-mail ni horaire affiché", not re.search(r"mailto:|tel:|\b\d{2}[ .]\d{2}[ .]\d{2}\b|\bh\d{2}\b", SANS_DATA))

# ---------- 14. Textes ----------
visible = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)\b.*?</\1>", "", PAGE, flags=re.S)))
interdits = ["bienvenue", "passion", "excellence", "premium", "expérience unique", "n° 1", "le meilleur", "pas cher", "votre satisfaction"]
verifier(14, "Aucun mot interdit", not [m for m in interdits if m in visible.lower()])
verifier(14, "« Plus de 100 coupes » écrit dans le texte, jamais en compteur", "plus de 100 coupes" in visible.lower())
mauvais = re.findall(r"\S[  ][;!?]|\S [:»]|« ", visible)
verifier(14, "Fine insécable avant ; ! ?, insécable avant :, apostrophe ’", not mauvais and "'" not in visible, str(mauvais[:4]))
verifier(14, "Prix écrit « 15 € » avec insécable", "15 €" in visible and "15 €" not in visible)
verifier(14, "« À COMPLÉTER » affiché seulement dans les mentions légales, surligné",
         visible.count("À COMPLÉTER") == PAGE.count('<mark class="a-completer">') <= 1)
verifier(8, "Police Archivo en woff2 intégrée, variable (wght, wdth)", "font/woff2;base64," in CSS and "font-weight: 400 700" in CSS and "font-stretch: 75% 125%" in CSS)

largeur = max(len(n) for _, n, _, _ in resultats)
for num, nom, ok, detail in resultats:
    print(f"{'OK ' if ok else 'ÉCHEC'}  {str(num).rjust(2)}. {nom.ljust(largeur)}  {detail}")
print(f"\n{len(resultats) - len(echecs)}/{len(resultats)} contrôles statiques réussis.")
sys.exit(1 if echecs else 0)
