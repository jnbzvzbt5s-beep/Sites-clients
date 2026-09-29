"""Budgets de couleur (§4, §19.14), mesurés en HSL sur les captures de build/budget/ (images masquées).

Usage : python3 tests/budgets.py   (après node tests/acceptance.mjs)
"""
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOSSIER = ROOT / "build" / "budget"


def hsl(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(axis=2), a.min(axis=2)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d == 0, 0, d / (1 - np.abs(2 * l - 1) + 1e-9))
    h = np.zeros_like(l)
    m = d > 0
    rc, gc, bc = (mx == r) & m, (mx == g) & m & (mx != r), (mx == b) & m & (mx != r) & (mx != g)
    h[rc] = (60 * ((g - b)[rc] / d[rc])) % 360
    h[gc] = 60 * ((b - r)[gc] / d[gc]) + 120
    h[bc] = 60 * ((r - g)[bc] / d[bc]) + 240
    return h, s, l


def parts(path):
    h, s, l = hsl(path)
    n = h.size
    rouge = (((h >= 345) | (h <= 12)) & (s >= .55) & (l >= .25) & (l <= .60)).sum() / n
    rose = (((h >= 330) | (h <= 25)) & (s >= .25) & (l >= .62)).sum() / n
    violet = ((h >= 240) & (h <= 330) & (s >= .20) & (l >= .12) & (l <= .92)).sum() / n
    sombre = (l <= .22).sum() / n
    return rouge, rose, violet, sombre


def main():
    echecs = 0
    ecrans = sorted(DOSSIER.glob("ecran-*.png"))
    if not ecrans:
        sys.exit("Aucune capture : lancez d’abord node tests/acceptance.mjs")
    pire = {"rouge": 0, "rose": 0, "violet": 0}
    for p in ecrans:
        rouge, rose, violet, _ = parts(p)
        pire = {"rouge": max(pire["rouge"], rouge), "rose": max(pire["rose"], rose), "violet": max(pire["violet"], violet)}
        ok = rouge <= .06 and rose <= .0005 and violet <= .0002
        echecs += not ok
        print(f"{'OK ' if ok else 'ÉCHEC'} {p.name} : rouge {rouge:.2%} · rose {rose:.3%} · violet {violet:.3%}")
    pages = sorted(DOSSIER.glob("page-*.png"))
    for chemin_page in pages:
        w = chemin_page.stem
        rouge, rose, violet, sombre = parts(chemin_page)
        ok = rouge <= .025 and sombre <= .30
        echecs += not ok
        print(f"{'OK ' if ok else 'ÉCHEC'} {w} (page entière) : rouge {rouge:.2%} (≤ 2,5 %) · sombre {sombre:.1%} (≤ 30 %) · rose {rose:.3%} · violet {violet:.3%}")
    print(f"Pires écrans 390×844 : rouge {pire['rouge']:.2%} (≤ 6 %) · rose {pire['rose']:.3%} (≤ 0,05 %) · violet {pire['violet']:.3%} (≤ 0,02 %)")
    print(f"\n{len(ecrans) + len(pages) - echecs}/{len(ecrans) + len(pages)} contrôles de budget réussis.")
    sys.exit(1 if echecs else 0)


if __name__ == "__main__":
    main()
