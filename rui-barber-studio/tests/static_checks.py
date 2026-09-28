"""Contrôles statiques de index.html : poids, couleurs, contrastes, photos, données, textes.

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
SITE = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
PHOTOS = json.loads((ROOT / "data" / "photos.json").read_text(encoding="utf-8"))

echecs = []
resultats = []


def verifier(nom, ok, detail=""):
    resultats.append((nom, ok, detail))
    if not ok:
        echecs.append(nom)


# ---------- 14. Poids ----------
taille = (ROOT / "index.html").stat().st_size
verifier("Poids ≤ 1,6 Mo", taille <= 1.6 * 1024 * 1024, f"{taille / 1024:.1f} Ko")

# ---------- 1. Aucune ressource externe, aucun stockage ----------
css = "\n".join(re.findall(r"<style>(.*?)</style>", PAGE, re.S))
js = "\n".join(re.findall(r"<script>(.*?)</script>", PAGE, re.S))
sources = re.findall(r'\s(?:src|srcset|poster|data)="([^"]+)"', PAGE) + re.findall(r'<link[^>]+href="([^"]+)"', PAGE)
externes = [s for s in sources if not s.startswith("data:")]
urls_css = [u for u in re.findall(r"url\(([^)]+)\)", css) if not u.strip("'\" ").startswith("data:")]
verifier("Aucune ressource externe (src, link, url())", not externes and not urls_css, str(externes + urls_css)[:120])
verifier("Ni localStorage, ni sessionStorage, ni cookie dans le script",
         not re.search(r"localStorage|sessionStorage|document\.cookie", js))
verifier("Aucune balise iframe, video, embed", not re.search(r"<(iframe|video|embed|object)\b", PAGE))
verifier("Un seul script exécutable, en fin de page",
         len(re.findall(r"<script>", PAGE)) == 1 and PAGE.rfind("<script>") > PAGE.rfind("</footer>"))

# ---------- Liens externes : rel="noopener" ----------
liens_ext = re.findall(r'<a\s[^>]*href="(https?://[^"]+)"[^>]*>', PAGE)
sans_noopener = [m.group(0) for m in re.finditer(r'<a\s[^>]*href="https?://[^"]+"[^>]*>', PAGE) if 'rel="noopener"' not in m.group(0)]
verifier("Liens externes en rel=\"noopener\"", not sans_noopener, f"{len(liens_ext)} liens")

# ---------- 13. Couleurs : aucun rose ----------
def couleurs(texte):
    out = []
    for h in re.findall(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", texte):
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        out.append(("#" + h, tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))))
    for m in re.finditer(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", texte):
        out.append((m.group(0), tuple(int(m.group(i)) for i in (1, 2, 3))))
    return out


roses = []
toutes = couleurs(css) + couleurs(re.sub(r"data:[^\"')]+", "", PAGE.replace(css, "")))
for nom, (r, g, b) in toutes:
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if 290 <= h * 360 <= 355 and s > 0.15:
        roses.append(nom)
verifier("Aucune couleur rose (teinte 290–355°, saturation > 15 %)", not roses,
         f"{len(set(n for n, _ in toutes))} couleurs analysées" + (f" ; roses : {roses}" if roses else ""))

# ---------- 13. Contrastes AA ----------
def lum(hexa):
    hexa = hexa.lstrip("#")
    c = [int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


V = {k: v for k, v in re.findall(r"--([a-z-]+):\s*(#[0-9A-Fa-f]{6})", css)}
paires = [
    # (texte, fond, seuil, usage)
    ("encre", "blanc", 4.5, "texte courant"),
    ("encre", "bleu-pale", 4.5, "galerie, module de rendez-vous"),
    ("encre", "bleu", 4.5, "puce choisie"),
    ("gris", "blanc", 4.5, "texte secondaire"),
    ("gris", "bleu-pale", 4.5, "légendes, notes du module"),
    ("blanc", "nuit", 4.5, "héros, en-tête, bande Rui"),
    ("blanc", "bleu-fonce", 4.5, "fin du dégradé bleu nuit, boutons bleus"),
    ("nuit-texte", "nuit", 4.5, "texte secondaire sur bleu nuit"),
    ("nuit-texte", "bleu-fonce", 4.5, "texte secondaire, fin du dégradé"),
    ("bleu", "nuit", 4.5, "« Moien ! »"),
    ("bleu", "bleu-fonce", 3.0, "« Moien ! » si le dégradé passe derrière"),
    ("blanc", "rouge", 4.5, "prix, boutons rouges"),
    ("blanc", "rouge-fonce", 4.5, "bouton rouge au survol"),
    ("bleu-fonce", "blanc", 4.5, "liens, pseudo, boutons au trait"),
    ("bleu-fonce", "bleu-pale", 4.5, "boutons dans le module"),
    ("gris", "blanc", 3.0, "bordure des puces et du champ"),
    ("bleu-fonce", "blanc", 3.0, "anneau de focus sur fond clair"),
]
for t, f, seuil, usage in paires:
    r = ratio(V[t], V[f])
    verifier(f"Contraste {t} sur {f} ≥ {seuil} ({usage})", r >= seuil, f"{r:.2f}:1")
for t, f, seuil, usage in [("#8A2A1B", V["bleu-pale"], 4.5, "message d’échec de copie"),
                           (V["bleu"], "#0E1115", 4.5, "compteur de la visionneuse"),
                           ("#C9CDD2", "#0B1F3D", 4.5, "texte du pied de page"),
                           ("#FFFFFF", "#B51914", 4.5, "bas du dégradé rouge"),
                           ("#FFFFFF", "#D8261F", 4.5, "haut du dégradé rouge"),
                           ("#E6E8EA", "#141619", 4.5, "légende de la visionneuse"),
]:
    r = ratio(t, f)
    verifier(f"Contraste {t} sur {f} ≥ {seuil} ({usage})", r >= seuil, f"{r:.2f}:1")
regles_bleu = [sel.strip() for sel, corps in re.findall(r"([^{}]+)\{([^{}]*)\}", css)
               if re.search(r"(?<![-\w])color:\s*var\(--bleu\)", corps)]
# Zones sombres (bleu nuit ou quasi noir) : le bleu clair y est lisible.
ZONES_SOMBRES = ("visionneuse", "entete", "heros")
verifier("Le bleu clair ne sert jamais de texte sur fond clair (seulement sur les zones sombres)",
         all(any(z in r for z in ZONES_SOMBRES) for r in regles_bleu), str(regles_bleu))

# ---------- 12. Photos : texte alternatif, aucune métadonnée ----------
imgs = re.findall(r"<img\s[^>]*>", PAGE)
contenu = [i for i in imgs if 'src="data:image/webp' in i and "logo__img" not in i and "heros__logo" not in i]
logos = [i for i in imgs if "logo__img" in i]
verifier("Logo : même composant en en-tête et pied de page, 48 px, image décorative à côté du nom",
         len(logos) == 2 and all('height="48"' in i and 'alt=""' in i for i in logos) and PAGE.count('class="logotype"') == 2)
sans_alt = [i[:80] for i in contenu if not re.search(r'alt="[^"]{12,}"', i)]
verifier("Chaque photo a un texte alternatif précis", len(contenu) >= 7 and not sans_alt,
         f"{len(contenu)} photos")
verifier("Chaque photo a width, height et decoding=async",
         all(re.search(r'width="\d+"', i) and re.search(r'height="\d+"', i) and 'decoding="async"' in i for i in contenu))
verifier("Photos des coupes (sous la ligne de flottaison) en loading=lazy",
         all('loading="lazy"' in i for i in contenu))
verifier("Aucune photo de coupe au premier plan du héros", "<img" not in PAGE[PAGE.index('heros-bande"'):PAGE.index('id="coupes"')])
meta_trouvees = []
poids = []
for i in contenu:
    b64 = re.search(r'src="data:image/webp;base64,([^"]+)"', i).group(1)
    data = base64.b64decode(b64)
    poids.append(len(data))
    chunks = []
    pos = 12
    while pos + 8 <= len(data):
        cid = data[pos:pos + 4]
        size = int.from_bytes(data[pos + 4:pos + 8], "little")
        chunks.append(cid)
        pos += 8 + size + (size & 1)
    im = Image.open(io.BytesIO(data))
    if b"EXIF" in chunks or b"XMP " in chunks or b"ICCP" in chunks or len(im.getexif()) or im.info.get("exif"):
        meta_trouvees.append(chunks)
verifier("Aucune métadonnée EXIF, XMP ni ICC dans les photos", not meta_trouvees, f"{len(contenu)} photos lues")
verifier("Photos ≤ 100 Ko chacune",
         all(p <= 100 * 1024 for p in poids),
         ", ".join(f"{p / 1024:.0f}" for p in poids) + " Ko")
for p in [PHOTOS["vedette"], *PHOTOS["grille"]]:
    verifier(f"Texte alternatif présent : {p['fichier']}", html.escape(p["alt"], quote=True) in PAGE)

# ---------- Source de données unique : concordance ----------
N = " "
prix = SITE["prestation"]["affichage"]
prix_affiches = [html.unescape(x) for x in re.findall(r"data-prix>([^<]+)<", PAGE)]
verifier("Prix affichés = JSON", len(prix_affiches) == 2 and all(p == prix for p in prix_affiches), str(prix_affiches))
verifier("Aucun autre prix en euros dans le texte",
         set(re.findall(r"(\d+)\s?(?:&nbsp;| )?€", html.unescape(re.sub(r"<script.*?</script>|<style.*?</style>", "", PAGE, flags=re.S)))) == {str(SITE["prestation"]["prix"])})
hrefs = re.findall(r'href="([^"]+)"', PAGE)
ig = [h for h in hrefs if "instagram" in h or "ig.me" in h]
verifier("Liens Instagram = JSON", ig and set(ig) <= {SITE["instagram"]["message"], SITE["instagram"]["profil"]}, f"{len(ig)} liens")
verifier("Le bouton principal pointe vers la messagerie",
         re.search(r'id="envoyer" href="' + re.escape(SITE["instagram"]["message"]) + '"', PAGE) is not None)
ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', PAGE, re.S).group(1))
verifier("JSON-LD HairSalon = JSON",
         ld["@type"] == "HairSalon" and ld["name"] == SITE["nom"] and ld["priceRange"] == prix
         and ld["address"]["addressLocality"] == SITE["ville"] and ld["address"]["addressCountry"] == SITE["pays"]
         and ld["sameAs"] == [SITE["instagram"]["profil"]])
verifier("JSON-LD sans téléphone, e-mail ni horaires",
         not any(k in ld for k in ("telephone", "email", "openingHours", "openingHoursSpecification")))
for cle in ("seul_moyen", "lieu"):
    m = re.search(rf'data-contact="{cle}">([^<]+)<', PAGE)
    verifier(f"Texte de contact « {cle} » = JSON", m and html.unescape(m.group(1)) == SITE["contact"][cle])
cfg = json.loads(re.search(r"var CFG = (\{.*?\});", js).group(1))
verifier("Configuration du module = JSON",
         cfg["message"] == SITE["instagram"]["message"] and cfg["barbier"] == SITE["barbier"]
         and cfg["prestation"] == SITE["prestation"]["nom"].lower())
verifier("Pseudo affiché = JSON", html.escape(SITE["instagram"]["affichage"]) in PAGE)

# ---------- Métadonnées ----------
titre = html.unescape(re.search(r"<title>(.*?)</title>", PAGE).group(1))
desc = html.unescape(re.search(r'<meta name="description" content="([^"]+)"', PAGE).group(1))
verifier("Titre", titre == SITE["meta"]["titre"], titre)
verifier("Meta description ≈ 150 caractères (Mersch, 15 €, Instagram)",
         135 <= len(desc) <= 160 and "Mersch" in desc and prix in desc and "Instagram" in desc, f"{len(desc)} caractères")
verifier("lang=fr, theme-color = --nuit (haut de page), favicon en data URI",
         '<html lang="fr">' in PAGE and f'name="theme-color" content="{V["nuit"]}"' in PAGE
         and re.search(r'<link rel="icon" type="image/png" href="data:image/png', PAGE) is not None)
verifier("Open Graph titre et description, pas d’og:image sans adresse définitive",
         'property="og:title"' in PAGE and 'property="og:description"' in PAGE
         and ('property="og:image"' in PAGE) == bool(SITE.get("adresse_site")))

# ---------- Textes ----------
visible = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)\b.*?</\1>", "", PAGE, flags=re.S)))
visible_min = visible.lower()
interdits = ["bienvenue", "passion", "excellence", "premium", "expérience unique", "n° 1", "n°1",
             "le meilleur", "la meilleure", "pas cher", "votre satisfaction"]
trouves = [m for m in interdits if m in visible_min or m in js.lower()]
verifier("Aucun mot interdit", not trouves, str(trouves))
verifier("« Plus de 100 coupes » écrit dans le texte", "plus de 100 coupes" in visible_min)
mauvais = re.findall(r"\S[ ](?:[;:!?»])|«[ ]", visible)
verifier("Espaces insécables avant ; : ! ? » et après «", not mauvais, str(mauvais[:5]))
verifier("Apostrophes typographiques dans le texte", "'" not in visible, "")
verifier("Aucun émoji", not re.search(r"[\U0001F300-\U0001FAFF☀-➿]", visible))
verifier("Police Archivo en woff2 intégrée avec font-display: swap",
         "font/woff2;base64," in css and "font-display: swap" in css)

# ---------- Rapport ----------
largeur = max(len(n) for n, _, _ in resultats)
for nom, ok, detail in resultats:
    print(f"{'OK ' if ok else 'ÉCHEC'}  {nom.ljust(largeur)}  {detail}")
print(f"\n{len(resultats) - len(echecs)}/{len(resultats)} contrôles statiques réussis.")
sys.exit(1 if echecs else 0)
