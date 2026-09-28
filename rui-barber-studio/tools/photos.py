"""Traitement des photos : orientation EXIF, recadrage par rôle, étalonnage, export WebP sans métadonnées.

Usage : python3 tools/photos.py  (lit photos-src/, écrit build/img/)
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
QUALITE = 80  # WebP : net à la taille affichée, poids contenu

# Boîtes (x0, y0, x1, y1) en pixels de la source, au ratio 4:5.
# Aucune mise à l'échelle vers le haut : les sources font 720 px de large.
PHOTOS = {
    "hero": {"src": "p4.jpg", "box": (120, 420, 630, 1058), "max_kb": 200},
    "coupe-1": {"src": "p1.jpg", "box": (140, 470, 700, 1170), "max_kb": 100},
    "coupe-2": {"src": "p2.jpg", "box": (20, 480, 540, 1130), "max_kb": 100},
    "coupe-3": {"src": "p7.jpg", "box": (90, 440, 500, 952), "max_kb": 100},
    "coupe-4": {"src": "p8.jpg", "box": (170, 370, 510, 795), "max_kb": 100},
    "coupe-5": {"src": "p6.jpg", "box": (10, 385, 390, 860), "max_kb": 100},
    "coupe-6": {"src": "p5.jpg", "box": (180, 330, 660, 930), "max_kb": 100},
    "coupe-7": {"src": "p3.jpg", "box": (130, 430, 560, 968), "max_kb": 100},
}


def open_rgb(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def grade(im):
    """Série propre : balance des blancs neutre, contraste doux, ombres légèrement froides."""
    a = np.asarray(im).astype(np.float32) / 255.0
    # Balance des blancs : gray-world partiel (60 %), calculé sur les tons moyens
    lum = a.mean(axis=2)
    mid = (lum > 0.15) & (lum < 0.85)
    means = a[mid].mean(axis=0)
    gain = means.mean() / means
    gain = 1 + 0.6 * (gain - 1)
    a = a * gain
    # Garde-fou peau : jamais rosée (on retient le rouge si le magenta domine)
    # Contraste franc mais doux : courbe en S légère
    a = np.clip(a, 0, 1)
    a = a + 0.10 * (a - 0.5) * (1 - np.abs(2 * a - 1))
    # Ombres très légèrement froides
    lum = a.mean(axis=2, keepdims=True)
    shadow = np.clip(1 - lum / 0.35, 0, 1)
    a = a + shadow * np.array([-0.006, 0.0, 0.012], dtype=np.float32)
    # Relève douce des basses lumières (photos de garage un peu sombres)
    a = np.clip(a, 0, 1) ** 0.95
    out = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
    return out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=35, threshold=3))


def export(im, max_kb):
    # Nouveau fichier : aucune métadonnée (ni EXIF, ni ICC, ni XMP)
    clean = Image.new("RGB", im.size)
    clean.paste(im)
    for q in range(QUALITE, 40, -3):
        buf = io.BytesIO()
        clean.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= max_kb * 1024:
            return buf.getvalue(), q
    return buf.getvalue(), q


def main():
    manifest = {}
    for name, spec in PHOTOS.items():
        im = open_rgb(SRC / spec["src"]).crop(spec["box"])
        im = grade(im)
        data, q = export(im, spec["max_kb"])
        (OUT / f"{name}.webp").write_bytes(data)
        manifest[name] = {"w": im.width, "h": im.height, "kb": round(len(data) / 1024, 1), "q": q}
        print(name, spec["src"], im.size, manifest[name]["kb"], "Ko", "q", q)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
