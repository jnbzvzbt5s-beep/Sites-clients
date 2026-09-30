"""Assemble index.html, fichier unique et autonome (accueil + vue « Les coupes »), à partir de data/contenu.json et de src/.

Usage : python3 tools/build.py [--brouillon]
  Sans option, le script échoue s’il reste un « À COMPLÉTER » dans contenu.json.
  Avec --brouillon, il assemble quand même et surligne les « À COMPLÉTER » affichés.
Pré-requis : tools/photos.py (build/img/) et tools/logo.py (build/logo/).
"""
import base64
import html
import io
import json
import math
import pathlib
import re
import subprocess
import sys

import numpy as np
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
BUILD = ROOT / "build"
PAGES = {"accueil.html": ROOT / "index.html"}
FONT_SRC = ROOT / "fonts" / "archivo-latin-wdth-normal.woff2"
A_COMPLETER = "À COMPLÉTER"
UNICODES = ("U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2019,U+201C-201E,"
            "U+2026,U+2009,U+202F,U+20AC")
CLES_BRUTES = {"url", "message", "profil", "source", "fichier", "lang", "theme", "code", "pseudo"}

ICONES = {
    "instagram": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
    "fleche-bas": '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>',
    "coche": '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    "copier": '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    "fermer": '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    "chevron-gauche": '<path d="M14.5 6 8.5 12l6 6"/>',
    "chevron-droite": '<path d="M9.5 6l6 6-6 6"/>',
    "fleche-droite": '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
    "fleche-ouvrir": '<path d="M8 16 16 8M10 8h6v6"/>',
}


# ---------- Contenu ----------
def typo(s):
    """Typographie française : fine insécable avant ; ! ? et dans « », insécable avant : et avant €."""
    s = s.replace("'", "’")
    s = re.sub(r" ?([;!?])", "\u202f\\1", s)
    s = re.sub(r" :", "\u00a0:", s)
    s = s.replace("« ", "«\u202f").replace(" »", "\u202f»")
    s = re.sub(r"(\d) €", "\\1\u00a0€", s)
    return s


def appliquer_typo(v, cle=None):
    if isinstance(v, dict):
        return {k: appliquer_typo(x, k) for k, x in v.items()}
    if isinstance(v, list):
        return [appliquer_typo(x, cle) for x in v]
    if isinstance(v, str) and cle not in CLES_BRUTES and not v.startswith("http"):
        return typo(v)
    return v


def a_completer(v, chemin=""):
    if isinstance(v, dict):
        return [c for k, x in v.items() for c in a_completer(x, f"{chemin}.{k}" if chemin else k)]
    if isinstance(v, list):
        return [c for i, x in enumerate(v) for c in a_completer(x, f"{chemin}[{i}]")]
    return [chemin] if isinstance(v, str) and A_COMPLETER in v else []


def rempli(v):
    return bool(v) and A_COMPLETER not in str(v)


def chemin(ctx, cle):
    for part in cle.split("."):
        ctx = ctx[part]
    return ctx


def e(s):
    return html.escape(str(s), quote=True)


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(pathlib.Path(path).read_bytes()).decode("ascii")


# ---------- Police ----------
def police():
    """Archivo variable, axes réduits aux valeurs utilisées, espace fine insécable ajoutée, sous-ensemble woff2."""
    f = instancer.instantiateVariableFont(TTFont(FONT_SRC), {"wght": (400, 700), "wdth": (75, 125)})
    for table in f["cmap"].tables:
        if table.isUnicode() and 0x2009 in table.cmap:
            table.cmap[0x202F] = table.cmap[0x2009]  # U+202F absente d’Archivo : même dessin que U+2009
    f.flavor = None
    borne = BUILD / "archivo-borne.ttf"
    f.save(borne)
    out = BUILD / "archivo-sous-ensemble.woff2"
    subprocess.run([sys.executable, "-m", "fontTools.subset", str(borne), f"--unicodes={UNICODES}",
                    "--flavor=woff2", "--layout-features=kern,liga,tnum,case", "--desubroutinize",
                    f"--output-file={out}"], check=True)
    return out


# ---------- Motifs générés ----------
def regle():
    """M2a : 16 traits, position (1,18^i − 1) / (1,18^15 − 1) depuis le bas ; repères 0, 0,5, 1, 2, 3."""
    reperes = {0: "0", 6: "0,5", 10: "1", 13: "2", 15: "3"}
    parts = ['<div class="regle" aria-hidden="true"><span class="regle__barre"></span><span class="regle__ligne"></span>']
    for i in range(16):
        p = (1.18 ** i - 1) / (1.18 ** 15 - 1)
        grand = " regle__trait--grand" if i in reperes else ""
        parts.append(f'<span class="regle__trait{grand}" style="--p:{p:.4f};--i:{i}"></span>')
        if i in reperes:
            parts.append(f'<span class="regle__chiffre" style="--p:{p:.4f};--i:{i}">{reperes[i]}</span>')
    parts.append("</div>")
    return "".join(parts)


def separateur(rouge_pct):
    """M2b : filet, 25 traits serrés à gauche (1,12^i − 1)/(1,12^24 − 1), un seul trait rouge."""
    traits = []
    for i in range(25):
        x = 1000 * (1.12 ** i - 1) / (1.12 ** 24 - 1)
        traits.append(f'<line x1="{x:.2f}" y1="1" x2="{x:.2f}" y2="7"/>')
    xr = 10 * rouge_pct
    return (f'<div class="enveloppe separateur" aria-hidden="true"><svg viewBox="0 0 1000 14" preserveAspectRatio="none" focusable="false">'
            f'<g class="separateur__filet" stroke="#C9D8EA" stroke-width="1" vector-effect="non-scaling-stroke" fill="none">'
            f'<line x1="0" y1="7" x2="1000" y2="7" vector-effect="non-scaling-stroke"/>'
            + "".join(t.replace("/>", ' vector-effect="non-scaling-stroke"/>') for t in traits) +
            f'</g><line class="separateur__rouge" x1="{xr:.1f}" y1="1" x2="{xr:.1f}" y2="13" stroke="#D7141A" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>')


def trame():
    """M3 : points de 12 px, r = 2,6 × (1 − d)^1,5 depuis le coin haut droit ; points sous 0,35 px supprimés."""
    taille, pas = 264, 12
    cercles = []
    for y in range(pas // 2, taille, pas):
        for x in range(pas // 2, taille, pas):
            d = min(1.0, math.hypot(taille - x, y) / taille)
            r = 2.6 * (1 - d) ** 1.5
            if r >= 0.35:
                cercles.append(f'<circle cx="{x}" cy="{y}" r="{r:.2f}"/>')
    return (f'<svg viewBox="0 0 {taille} {taille}" focusable="false" fill="currentColor">'
            + "".join(cercles) + "</svg>")


def grain():
    """Tuile 96×96 de bruit monochrome (utilisée à 5 % d’opacité sur le panneau nuit)."""
    rng = np.random.default_rng(23)
    im = Image.fromarray(rng.integers(0, 256, (96, 96), dtype=np.uint8), "L")
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


# ---------- Blocs HTML ----------
def icone(nom):
    return f'<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONES[nom]}</svg>'


def logo(site, taille, charge_differee=True):
    fichier = {44: "logo-88.webp", 32: "logo-64.webp", 120: "logo-240.webp"}[taille]
    lazy = ' loading="lazy"' if charge_differee else ""
    return (f'<img class="logo__img" src="{data_uri(BUILD / "logo" / fichier, "image/webp")}" alt="{e(site["nom"])}" '
            f'width="{taille}" height="{taille}" decoding="async"{lazy}>')


def logotype(site):
    return f'<span class="logotype" aria-hidden="true"><b>{e(site["nom_court"])}</b> {e(site["nom_suite"])}</span>'


def image(photo, manifeste, hero=False):
    m = manifeste[photo["fichier"]]
    attrs = (f'src="{data_uri(BUILD / "img" / (photo["fichier"] + ".webp"), "image/webp")}" alt="{e(photo["alt"])}" '
             f'width="{m["w"]}" height="{m["h"]}" decoding="async"')
    attrs += ' fetchpriority="high"' if hero else ' loading="lazy"'
    return f"<img {attrs}>"


def galerie(photos, manifeste, t):
    """Galerie de la vue « Les coupes ». Chaque photo est un lien #photo-N : sans JS, :target l’agrandit ; avec JS, la visionneuse s’ouvre."""
    serie = [p for p in photos if p["role"] == "vedette"] + [p for p in photos if p["role"] == "vignette"]
    n = len(serie)
    out = ['<ul class="galerie">']
    for k, p in enumerate(serie, start=1):
        prec, suiv = (k - 2) % n + 1, k % n + 1
        vedette = k == 1
        index = "" if vedette else f'<span class="photo__index" aria-hidden="true">{k:02d}</span>'
        figure = (f'<figure class="photo"><a class="vignette" href="#photo-{k}" aria-label="{e(t["agrandir"])} : {e(p["alt"])}">'
                  f'{image(p, manifeste)}<span class="photo__ouvrir" aria-hidden="true">{icone("fleche-ouvrir")}</span></a>{index}'
                  f'<span class="photo__cible" aria-hidden="true">'
                  f'<a class="photo__fermer" href="#galerie" tabindex="-1">{icone("fermer")}<span>{e(t["fermer"])}</span></a>'
                  f'<a class="photo__prec" href="#photo-{prec}" tabindex="-1">{icone("chevron-gauche")}</a>'
                  f'<a class="photo__suiv" href="#photo-{suiv}" tabindex="-1">{icone("chevron-droite")}</a>'
                  f'<span class="photo__compteur chiffres">{k} sur {n}</span></span></figure>')
        leg = f'<p class="photo__legende">{e(p["legende"])}</p>' if rempli(p.get("legende")) else ""
        if vedette:
            out.append(f'<li class="galerie__item galerie__item--vedette" id="photo-{k}"><div class="cadre">{figure}'
                       '<span class="repere repere--haut" aria-hidden="true"></span><span class="repere repere--bas" aria-hidden="true"></span>'
                       f'</div>{leg}</li>')
        else:
            out.append(f'<li class="galerie__item" id="photo-{k}">{figure}{leg}</li>')
    out.append("</ul>")
    return "\n      ".join(out)


def vitrine(photos, manifeste, t):
    """Accueil : trois coupes qui mènent chacune à sa photo dans la vue « Les coupes »."""
    serie = ([p for p in photos if p["role"] == "vedette"] + [p for p in photos if p["role"] == "vignette"])[:3]
    items = "".join(f'<li><a class="vitrine__photo" href="#photo-{k}" aria-label="{e(t["agrandir"])} : {e(p["alt"])}">'
                    f'{image(p, manifeste)}<span class="photo__ouvrir" aria-hidden="true">{icone("fleche-ouvrir")}</span></a></li>'
                    for k, p in enumerate(serie, start=1))
    return f'<ul class="vitrine__photos">{items}</ul>'


def moments(t):
    out = []
    for m in t["moments"]:
        valeur = m[0].lower() + m[1:]
        out.append(f'<label class="puce"><input type="radio" name="moment" value="{e(valeur)}"><span>{e(m)}</span></label>')
    return "\n                ".join(out)


def apercu(t):
    salut, fin = t["message"]["salut"], t["message"]["fin"]
    return (f'<div class="apercu" id="apercu" aria-labelledby="apercu-titre">'
            f'<span class="apercu__ligne">{e(salut)}</span>'
            f'<span class="apercu__ligne">{e(t["ticket_jour"])}\u00a0: <b data-champ="jour">{e(t["a_convenir"])}</b></span>'
            f'<span class="apercu__ligne">{e(t["ticket_moment"])}\u00a0: <b data-champ="moment">{e(t["a_convenir"])}</b></span>'
            f'<span class="apercu__ligne" data-ligne="prenom" hidden>{e(t["ticket_prenom"])}\u00a0: <b data-champ="prenom"></b></span>'
            f'<span class="apercu__ligne">{e(fin)}</span></div>')


def jsonld(c):
    s = c["site"]
    d = {
        "@context": "https://schema.org",
        "@type": "HairSalon",
        "name": s["nom"],
        "image": data_uri(BUILD / "logo" / "logo-88.webp", "image/webp"),
        "address": {"@type": "PostalAddress", "addressLocality": s["ville"], "addressCountry": s["pays"]},
        "priceRange": s["prestation"]["affichage"],
        "sameAs": [s["instagram"]["profil"]],
    }
    if rempli(s.get("url")):
        d["url"] = s["url"]
    return json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


PALETTE = [
    ("--blanc", "#FFFFFF", "cartes, ticket, bandes du ruban"), ("--porcelaine", "#F5F8FC", "fond de page"),
    ("--brume", "#DDE9F6", "halos, surlignages"), ("--filet", "#C9D8EA", "lignes, bordures"),
    ("--ciel", "#7DB0E8", "ruban, accents du panneau"), ("--roi", "#1F54A6", "liens, puces choisies"),
    ("--marine", "#13305F", "milieu de dégradé"), ("--nuit", "#0A1C3A", "panneau de rendez-vous"),
    ("--encre", "#0E1D35", "titres et texte"), ("--gris", "#5B6579", "texte secondaire"),
    ("--rouge", "#D7141A", "action"), ("--rouge-vif", "#E3242B", "haut du laqué"),
    ("--rouge-profond", "#A30E1B", "bas du laqué, appui"),
]


def planche(css):
    """Planche de tokens (tokens.html) : palette, dégradés, motifs, états des composants."""
    tpl = (SRC / "tokens.html").read_text(encoding="utf-8")
    palette = "\n    ".join(
        f'<div class="pastille-couleur"><i style="background:{h}"></i><p><b>{n}</b>{h}<br>{r}</p></div>' for n, h, r in PALETTE)
    tpl = (tpl.replace("{{palette}}", palette).replace("{{separateur}}", separateur(25).replace('class="enveloppe separateur"', 'class="separateur"'))
           .replace("{{regle}}", regle()).replace("{{trame}}", trame()).replace("{{css}}", css.strip()))
    (ROOT / "tokens.html").write_text(tpl, encoding="utf-8")


def main():
    brouillon = "--brouillon" in sys.argv
    brut = json.loads((ROOT / "data" / "contenu.json").read_text(encoding="utf-8"))
    manquants = a_completer(brut)
    if manquants and not brouillon:
        print("Il reste des « À COMPLÉTER » dans contenu.json :\n  " + "\n  ".join(manquants))
        print("Complétez-les, ou relancez avec --brouillon pour une version de relecture.")
        sys.exit(1)
    c = appliquer_typo(brut)
    site, t = c["site"], c["textes"]
    manifeste = json.loads((BUILD / "img" / "manifest.json").read_text())

    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    partiels = {n: (SRC / "partials" / f"{n}.html").read_text(encoding="utf-8") for n in ("tete", "entete", "pied", "fin")}

    hero = [p for p in c["photos"] if p["role"] == "hero"][0]
    mentions = site["mentions_legales"]
    if A_COMPLETER in mentions:
        mentions_html = f'<mark class="a-completer">{e(mentions)}</mark>'
    else:
        mentions_html = e(mentions)

    blocs = {
        "{{logo:44}}": logo(site, 44, charge_differee=False) + logotype(site),
        "{{logo:32}}": logo(site, 32) + logotype(site),
        "{{logo_tuile:120}}": logo(site, 120).replace('class="logo__img"', 'class="logo__img profil__logo"'),
        "{{img:hero}}": image(hero, manifeste, hero=True),
        "{{regle}}": regle(),
        "{{separateur:25}}": separateur(25),
        "{{separateur:40}}": separateur(40),
        "{{separateur:60}}": separateur(60),
        "{{galerie}}": galerie(c["photos"], manifeste, t),
        "{{vitrine}}": vitrine(c["photos"], manifeste, t),
        "{{trame:ciel}}": trame(),
        "{{trame:brume}}": trame(),
        "{{trame:blanc}}": trame(),
        "{{etapes}}": "\n          ".join(f'<li><span class="etapes__num" aria-hidden="true">{i}</span>{e(x)}</li>'
                                           for i, x in enumerate(t["etapes"], start=1)),
        "{{moments}}": moments(t),
        "{{apercu}}": apercu(t),
        "{{rui_texte}}": "\n        ".join(f"<p>{e(p)}</p>" for p in t["rui_texte"]),
        "{{langues}}": "\n          ".join(
            f'<li lang="{l["lang"]}"><span class="langues__texte">{e(l["texte"])}</span><span class="etiquette" lang="fr">{l["code"]}</span></li>'
            for l in t["langues"]),
        "{{mentions}}": mentions_html,
        "{{favicon}}": data_uri(BUILD / "logo" / "logo-64.png", "image/png"),
        "{{apple_touch}}": data_uri(BUILD / "logo" / "logo-180.png", "image/png"),
        "{{jsonld}}": jsonld(c),
    }
    for nom in ICONES:
        blocs["{{icone:" + nom + "}}"] = icone(nom)

    police_fichier = police()
    css = css.replace("{{font}}", data_uri(police_fichier, "font/woff2")).replace("{{grain}}", grain())
    cfg = {
        "salut": t["message"]["salut"], "fin": t["message"]["fin"],
        "jour": t["ticket_jour"], "moment": t["ticket_moment"], "prenom": t["ticket_prenom"],
        "a_convenir": t["a_convenir"], "peu_importe": t["peu_importe"],
        "aujourdhui": "Aujourd’hui", "demain": "Demain",
        "rel_aujourdhui": "(aujourd’hui)", "rel_demain": "(demain)",
        "statut_ok": t["statut_ok"], "statut_echec": t["statut_echec"],
        "message": site["instagram"]["message"],
    }
    js = js.replace("{{jsconfig}}", json.dumps(cfg, ensure_ascii=False))

    contextes = {
        "accueil.html": {"{{page_titre}}": e(c["meta"]["titre"])},
    }
    for gabarit, sortie in PAGES.items():
        page = (SRC / gabarit).read_text(encoding="utf-8")
        for n in sorted(partiels, key=len, reverse=True):
            page = page.replace("{{> " + n + "}}", partiels[n])
        for k, v in contextes[gabarit].items():
            page = page.replace(k, v)
        page = re.sub(r"\{\{((?:site|meta|textes)(?:\.[a-z_]+)+)\}\}", lambda m: e(chemin(c, m.group(1))), page)
        # Index de section « 01 — Les coupes » : le numéro en bleu roi
        page = re.sub(r'(<p class="etiquette"[^>]*>)(\d{2}) — ', r'\1<span class="etiquette__num">\2</span> — ', page)
        for k, v in blocs.items():
            page = page.replace(k, v)
        page = page.replace("{{css}}", css.strip()).replace("{{js}}", js.strip())
        reste = re.findall(r"\{\{[^}]*\}\}", page)
        if reste:
            sys.exit(f"{gabarit} : espaces réservés non remplacés : {sorted(set(reste))}")
        sortie.write_text(page, encoding="utf-8")
        print(f"{sortie.name} : {sortie.stat().st_size / 1024:.1f} Ko" + (" — BROUILLON" if brouillon else ""))
    planche(css)
    print(f"police : {police_fichier.stat().st_size / 1024:.1f} Ko")
    if manquants:
        print("À COMPLÉTER restants :\n  " + "\n  ".join(manquants))


if __name__ == "__main__":
    main()
