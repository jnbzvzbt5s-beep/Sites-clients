"""Logo : l’image carrée telle quelle (ni recadrage, ni recoloration, ni déformation), redimensionnée seulement.

Usage : python3 tools/logo.py  (lit logo-src/logo-source.jpg, écrit build/logo/)
Les coins arrondis (22 %) sont faits en CSS, jamais dans le fichier.
"""
import io
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "logo-src" / "logo-source.jpg"
OUT = ROOT / "build" / "logo"
OUT.mkdir(parents=True, exist_ok=True)

WEBP = (88, 240, 64)   # en-tête 44 px, contact 120 px, pied 32 px (tous à deux fois leur taille)
PNG = (64, 180)        # favicon, apple-touch-icon


def propre(im):
    """Nouvelle image : aucune métadonnée héritée."""
    out = Image.new("RGB", im.size)
    out.paste(im)
    return out


def main():
    src = Image.open(SRC).convert("RGB")
    if src.width != src.height:
        raise SystemExit(f"Logo non carré : {src.size}")
    for n in WEBP:
        buf = io.BytesIO()
        propre(src.resize((n, n), Image.LANCZOS)).save(buf, "WEBP", quality=88, method=6)
        (OUT / f"logo-{n}.webp").write_bytes(buf.getvalue())
        print(f"logo-{n}.webp : {len(buf.getvalue()) / 1024:.1f} Ko")
    for n in PNG:
        buf = io.BytesIO()
        # Palette de 256 couleurs avec tramage : écart invisible à l’œil, fichier trois fois plus léger.
        propre(src.resize((n, n), Image.LANCZOS)).quantize(256, dither=Image.Dither.FLOYDSTEINBERG).save(buf, "PNG", optimize=True)
        (OUT / f"logo-{n}.png").write_bytes(buf.getvalue())
        print(f"logo-{n}.png : {len(buf.getvalue()) / 1024:.1f} Ko")


if __name__ == "__main__":
    main()
