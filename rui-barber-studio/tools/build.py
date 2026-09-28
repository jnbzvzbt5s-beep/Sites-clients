"""Assemble index.html (un seul fichier) à partir de data/ et src/.

Usage : python3 tools/build.py
Pré-requis : python3 tools/photos.py (build/img/) et tools/logo.py (build/logo/), police Archivo dans FONT_SRC.
"""
import base64
import html
import json
import os
import pathlib
import re
import subprocess
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = ROOT / "data"
BUILD = ROOT / "build"
OUT = ROOT / "index.html"
FONT_SRC = pathlib.Path(os.environ.get(
    "ARCHIVO_WOFF2",
    ROOT / "fonts" / "archivo-latin-wdth-normal.woff2",
))

MOIS_JOURS = (
    "janvier février mars avril mai juin juillet août septembre octobre novembre décembre "
    "janv. févr. avr. juil. sept. oct. nov. déc. "
    "lundi mardi mercredi jeudi vendredi samedi dimanche lun. mar. mer. jeu. ven. sam. dim. 0123456789"
)


def lire(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


def chemin(ctx, cle):
    v = ctx
    for part in cle.split("."):
        v = v[part]
    return v


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(pathlib.Path(path).read_bytes()).decode("ascii")


def sous_ensemble_police(texte):
    chars = sorted({c for c in texte if c.isprintable() or c in "  "})
    unicodes = ",".join(f"U+{ord(c):04X}" for c in chars)
    out = BUILD / "archivo-subset.woff2"
    # Axes limités aux valeurs utilisées : graisse 400–900, largeur 100–125.
    borne = BUILD / "archivo-400-700.ttf"
    f = instancer.instantiateVariableFont(TTFont(FONT_SRC), {"wght": (400, 900), "wdth": (100, 125)})
    f.flavor = None
    f.save(borne)
    subprocess.run([
        sys.executable, "-m", "fontTools.subset", str(borne),
        f"--unicodes={unicodes}",
        "--flavor=woff2",
        "--layout-features=kern,liga,calt,tnum,lnum",
        "--desubroutinize",
        "--name-IDs=*",
        f"--output-file={out}",
    ], check=True)
    return out, chars


def favicon():
    """Favicon : le monogramme « RBS » du logo (build/logo/favicon.png, par tools/logo.py)."""
    return data_uri(BUILD / "logo" / "favicon.png", "image/png")


def balise_img(fichier, alt, focal, manifest, lazy=True, prioritaire=False, classe=None):
    m = manifest[fichier]
    attrs = [
        f'src="{data_uri(BUILD / "img" / (fichier + ".webp"), "image/webp")}"',
        f'alt="{html.escape(alt, quote=True)}"',
        f'width="{m["w"]}"',
        f'height="{m["h"]}"',
        'decoding="async"',
    ]
    if lazy:
        attrs.append('loading="lazy"')
    if prioritaire:
        attrs.append('fetchpriority="high"')
    if focal:
        attrs.append(f'style="object-position:{focal}"')
    if classe:
        attrs.append(f'class="{classe}"')
    return "<img " + " ".join(attrs) + ">"


def galerie(photos, manifest):
    def vignette(p):
        leg = p.get("legende") or ""
        img = balise_img(p["fichier"], p["alt"], p.get("focal"), manifest)
        return (f'<button class="vignette" type="button" aria-haspopup="dialog" '
                f'data-legende="{html.escape(leg, quote=True)}">{img}</button>')

    v = photos["vedette"]
    parties = ['<div class="galerie">', '<figure class="vedette">', vignette(v)]
    if v.get("legende"):
        parties.append(f'<figcaption>{html.escape(v["legende"])}</figcaption>')
    parties.append("</figure>")
    parties.append('<ul class="grille" aria-label="Autres coupes">')
    for p in photos["grille"]:
        parties.append(f"<li>{vignette(p)}</li>")
    parties.append("</ul></div>")
    return "\n    ".join(parties)


def jsonld(site):
    d = {
        "@context": "https://schema.org",
        "@type": "HairSalon",
        "name": site["nom"],
        "address": {
            "@type": "PostalAddress",
            "addressLocality": site["ville"],
            "addressCountry": site["pays"],
        },
        "priceRange": site["prestation"]["affichage"],
        "sameAs": [site["instagram"]["profil"]],
        "makesOffer": {
            "@type": "Offer",
            "name": site["prestation"]["nom"],
            "price": str(site["prestation"]["prix"]),
            "priceCurrency": site["prestation"]["devise"],
        },
    }
    # « image » n’est ajoutée qu’avec une adresse de site définitive (URL absolue requise).
    if site.get("adresse_site"):
        d["url"] = site["adresse_site"]
        d["image"] = site["adresse_site"].rstrip("/") + "/apercu.jpg"
    return json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def mentions(site):
    ml = site.get("mentions_legales")
    if not ml:
        return ""
    lignes = "".join(f"<p>{html.escape(l)}</p>" for l in ml)
    return f'<li><details class="pied__mentions"><summary>Mentions légales</summary>{lignes}</details></li>'


def main():
    BUILD.mkdir(exist_ok=True)
    site = json.loads(lire(DATA / "site.json"))
    photos = json.loads(lire(DATA / "photos.json"))
    manifest = json.loads(lire(BUILD / "img" / "manifest.json"))

    page = lire(SRC / "page.html")
    css = lire(SRC / "styles.css")
    js = lire(SRC / "app.js")
    logo = lire(SRC / "logo.html").strip()

    # 1. Textes issus de la source de données unique
    page = page.replace("{{> logo}}", logo)
    page = page.replace("{{logo_src}}", data_uri(BUILD / "logo" / "logo.webp", "image/webp"))
    page = page.replace("{{mentions}}", mentions(site))

    def remplacer(m):
        cle = m.group(1)
        if cle in ("css", "js", "jsonld", "favicon", "gallery"):
            return m.group(0)
        return html.escape(str(chemin(site, cle)), quote=True)

    page = re.sub(r"\{\{\s*([a-z_]+(?:\.[a-z_]+)*)\s*\}\}", remplacer, page)

    # 2. Police : sous-ensemble des caractères réellement utilisés
    texte = re.sub(r"<[^>]+>", " ", page) + json.dumps(site, ensure_ascii=False) + \
        json.dumps(photos, ensure_ascii=False) + js + MOIS_JOURS + html.unescape(page)
    police, chars = sous_ensemble_police(html.unescape(texte))
    css = css.replace("{{font}}", data_uri(police, "font/woff2"))

    # 3. Script : configuration issue des données
    cfg = {
        "barbier": site["barbier"],
        "prestation": site["prestation"]["nom"].lower(),
        "message": site["instagram"]["message"],
    }
    js = js.replace("{{jsconfig}}", json.dumps(cfg, ensure_ascii=False))

    # 4. Images, galerie, favicon, JSON-LD, CSS et JS
    if "{{img:hero}}" in page:
        h = photos["hero"]
        page = page.replace("{{img:hero}}", balise_img(h["fichier"], h["alt"], h.get("focal"), manifest,
                                                       lazy=False, prioritaire=True))
    page = page.replace("{{gallery}}", galerie(photos, manifest))
    page = page.replace("{{favicon}}", favicon())
    page = page.replace("{{jsonld}}", jsonld(site))
    page = page.replace("{{css}}", css.strip())
    page = page.replace("{{js}}", js.strip())

    reste = re.findall(r"\{\{[^}]*\}\}", page)
    if reste:
        sys.exit(f"Espaces réservés non remplacés : {reste}")

    OUT.write_text(page, encoding="utf-8")
    taille = OUT.stat().st_size
    print(f"index.html : {taille / 1024:.1f} Ko ({taille} octets) — police {police.stat().st_size / 1024:.1f} Ko, {len(chars)} caractères")


if __name__ == "__main__":
    main()
