"""Photos : orientation EXIF, recadrage 4:5 (contenu.json), étalonnage en série, WebP sans métadonnées.

Usage : python3 tools/photos.py  (lit photos-src/ et data/contenu.json, écrit build/img/)
Aucune mise à l’échelle vers le haut : les sources font 720 px de large.
"""
import io
import json
import pathlib

import numpy as np
from PIL import Image, ImageFilter, ImageOps

try:
    import pillow_heif  # lecture des HEIC si présents
    pillow_heif.register_heif_opener()
except ImportError:
    pass

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "photos-src"
OUT = ROOT / "build" / "img"
OUT.mkdir(parents=True, exist_ok=True)

# Plafonds de poids (Ko) par rôle, et plafonds de taille (px) : jamais au-delà de la source.
MAX_KO = {"hero": 180, "vedette": 80, "vignette": 80, "portrait": 90}
MAX_PX = {"hero": (1120, 1400), "vedette": (800, 1000), "vignette": (400, 500), "portrait": (800, 1000)}
NUIT = np.array([10, 28, 58], dtype=np.float32) / 255.0


def ouvrir(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def etalonner(im):
    """Même balance des blancs neutre partout ; ombres refroidies vers --nuit (8 % au plus) ; aucun filtre."""
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a.mean(axis=2)
    mid = (lum > 0.15) & (lum < 0.85)
    moy = a[mid].mean(axis=0)
    gain = 1 + 0.6 * (moy.mean() / moy - 1)  # gray-world partiel : peau conservée
    a = np.clip(a * gain, 0, 1)
    a = a + 0.08 * (a - 0.5) * (1 - np.abs(2 * a - 1))  # contraste doux
    lum = a.mean(axis=2, keepdims=True)
    q25 = np.quantile(lum, 0.25)
    poids = 0.08 * np.clip(1 - lum / max(q25, 1e-3), 0, 1)  # quart le plus sombre seulement
    a = a * (1 - poids) + NUIT * poids
    out = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
    return out.filter(ImageFilter.UnsharpMask(radius=1.0, percent=30, threshold=3))


def exporter(im, max_ko):
    propre = Image.new("RGB", im.size)  # nouvelle image : ni EXIF, ni GPS, ni ICC, ni XMP
    propre.paste(im)
    for q in range(80, 40, -3):  # 80 : net à la taille affichée, poids contenu
        buf = io.BytesIO()
        propre.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= max_ko * 1024:
            return buf.getvalue(), q
    return buf.getvalue(), q


def main():
    contenu = json.loads((ROOT / "data" / "contenu.json").read_text(encoding="utf-8"))
    manifeste = {}
    for p in contenu["photos"]:
        x0, y0, x1, y1 = p["recadrage"]
        if abs((x1 - x0) * 5 - (y1 - y0) * 4) > 5:
            raise SystemExit(f"{p['fichier']} : recadrage hors 4:5 ({x1 - x0}×{y1 - y0})")
        im = etalonner(ouvrir(SRC / p["source"]).crop((x0, y0, x1, y1)))
        mw, mh = MAX_PX[p["role"]]
        if im.width > mw:
            im = im.resize((mw, mh), Image.LANCZOS)
        variantes = [("", im, MAX_KO[p["role"]])]
        # Miniature pour la vitrine de l’accueil (affichée ≈ 100–270 px) : pas de doublon lourd dans le fichier unique
        variantes.append(("-mini", im.resize((280, 350), Image.LANCZOS), 40))
        if p["role"] == "hero" and p.get("galerie"):
            variantes.append(("-vignette", im.resize(MAX_PX["vignette"], Image.LANCZOS), MAX_KO["vignette"]))
        for suffixe, v, max_ko in variantes:
            data, q = exporter(v, max_ko)
            nom = p["fichier"] + suffixe
            (OUT / f"{nom}.webp").write_bytes(data)
            manifeste[nom] = {"w": v.width, "h": v.height, "ko": round(len(data) / 1024, 1), "q": q}
            print(f"{nom:16} {p['source']} {v.width}×{v.height} {len(data) / 1024:.1f} Ko (q {q})")
    (OUT / "manifest.json").write_text(json.dumps(manifeste, indent=2))


if __name__ == "__main__":
    main()
