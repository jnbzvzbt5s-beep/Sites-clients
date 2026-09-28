"""Logo : détoure le cercle de la capture reçue (fond hors cercle rendu transparent), sans retouche.

Usage : python3 tools/logo.py  (lit logo-src/logo-capture.jpg, écrit build/logo/)
Le contenu du cercle est gardé tel quel : ni recadrage de ses éléments, ni changement de couleur.
"""
import io
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "logo-src" / "logo-capture.jpg"
OUT = ROOT / "build" / "logo"
OUT.mkdir(parents=True, exist_ok=True)

# Cercle mesuré sur la capture (bords à x = 116,5 / 966,5 et y = 118,5 / 968).
CX, CY, R = 541.5, 543.3, 423  # rayon réduit de 2 px : aucune frange du fond sombre
AFFICHAGE = 48  # hauteur d’affichage en px ; export à deux fois cette taille
SS = 4  # suréchantillonnage du masque pour un bord net


def disque(im, cx, cy, r):
    box = (round(cx - r), round(cy - r), round(cx + r), round(cy + r))
    carre = im.crop(box).convert("RGBA")
    n = carre.width
    masque = Image.new("L", (n * SS, n * SS), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, n * SS - 1, n * SS - 1), fill=255)
    carre.putalpha(masque.resize((n, n), Image.LANCZOS))
    return carre


def propre(im):
    """Nouvelle image : aucune métadonnée héritée de la capture."""
    out = Image.new("RGBA", im.size)
    out.paste(im)
    return out


def main():
    src = Image.open(SRC).convert("RGB")
    cercle = disque(src, CX, CY, R)
    taille = AFFICHAGE * 2
    logo = propre(cercle.resize((taille, taille), Image.LANCZOS))
    buf = io.BytesIO()
    logo.save(buf, "WEBP", quality=92, method=6)
    (OUT / "logo.webp").write_bytes(buf.getvalue())
    logo.save(OUT / "logo-apercu.png")

    # Favicon : la partie la plus reconnaissable, le monogramme « RBS » au centre du cercle.
    fav = disque(src, 555, 545, 340).resize((64, 64), Image.LANCZOS)
    buf = io.BytesIO()
    propre(fav).save(buf, "PNG", optimize=True)
    (OUT / "favicon.png").write_bytes(buf.getvalue())
    print(f"logo.webp {taille}×{taille} : {len((OUT / 'logo.webp').read_bytes()) / 1024:.1f} Ko ; "
          f"favicon.png 64×64 : {len(buf.getvalue()) / 1024:.1f} Ko")


if __name__ == "__main__":
    main()
