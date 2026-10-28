"""Writes tools/refs/template/REFERENCIA_DE_ESTILO.png: approved camp props and Solen at 4x with the
style rules written on it, plus an isometric counter-example beside the game's crate. It goes with
every prompt card so the image generator sees the game's real look (docs/scene-art-plan.md).

    python3 -I tools/refs/template/style-reference.py [counter-example.png]
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
CAMP = os.path.join(REPO, 'src', 'assets', 'world', 'camp')
K = 4
NAMES = [('crate', 'Caja'), ('barrel', 'Barril'), ('tent', 'Tienda'), ('campfire', 'Fogata'), ('weapon_rack', 'Armero'), ('sacks', 'Sacos')]
BG = (52, 60, 44)


def frame(n):
    man = json.load(open(os.path.join(CAMP, 'manifest.json')))
    m = man['sprites'][n]
    im = Image.open(os.path.join(CAMP, m['file'])).convert('RGBA').crop((0, 0, m['frameW'], m['frameH']))
    a = np.asarray(im)
    ys, xs = np.where(a[..., 3] > 0)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def main():
    fig = Image.open(os.path.join(HERE, 'scale-figure.png')).convert('RGBA')
    items = [(fig, 'Solen, 94 px')] + [(frame(n), l) for n, l in NAMES]
    gap = 12
    H = max(i.height for i, _ in items) + 8
    W = sum(i.width for i, _ in items) + gap * (len(items) + 1)
    row = Image.new('RGBA', (W, H), BG + (255,))
    x, pos = gap, []
    for im, l in items:
        row.paste(im, (x, H - 4 - im.height), im)
        pos.append((x, l))
        x += im.width + gap
    big = row.resize((W * K, H * K), Image.NEAREST)
    f = ImageFont.load_default(size=26)
    fs = ImageFont.load_default(size=22)
    top = 150
    bad = Image.open(sys.argv[1]).convert('RGBA') if len(sys.argv) > 1 else None
    extra = (bad.height * 3 + 140) if bad else 0
    out = Image.new('RGB', (big.width + 40, top + big.height + 60 + extra), (28, 26, 34))
    d = ImageDraw.Draw(out)
    d.text((20, 14), 'REFERENCIA DE ESTILO - asi se ven los objetos dentro del juego (4x)', fill=(240, 235, 220), font=f)
    d.text((20, 52), 'Pixel art 16 bits - vista 3/4 FRONTAL (el frente de cara, la tapa un poco desde arriba) - luz arriba-izquierda', fill=(230, 220, 200), font=fs)
    d.text((20, 82), 'linea negra de 1 px alrededor - colores planos a bandas (3-4 tonos por material) - sin anti-alias ni degradados', fill=(230, 220, 200), font=fs)
    d.text((20, 112), 'escala: 1 m = 57 px; un personaje mide 94 px - la base de cada objeto toca el suelo - sin sombra proyectada', fill=(230, 220, 200), font=fs)
    out.paste(big, (20, top))
    for x, l in pos:
        d.text((20 + x * K, top + big.height + 6), l, fill=(200, 195, 180), font=fs)
    if bad:
        y = top + big.height + 50
        d.text((20, y), 'EVITAR: vista isometrica (30 grados, como en este ejemplo); las caras van de frente, no en diagonal.', fill=(255, 140, 120), font=fs)
        d.text((20, y + 28), 'ASI SI: la caja del juego, a la derecha, con el frente de cara.', fill=(150, 230, 150), font=fs)
        badb = bad.resize((bad.width * 3, bad.height * 3), Image.NEAREST)
        bg = Image.new('RGB', badb.size, BG)
        bg.paste(badb, (0, 0), badb)
        out.paste(bg, (20, y + 70))
        crate = frame('crate')
        cb = crate.resize((crate.width * 3, crate.height * 3), Image.NEAREST)
        bg2 = Image.new('RGB', cb.size, BG)
        bg2.paste(cb, (0, 0), cb)
        out.paste(bg2, (40 + badb.width, y + 70 + badb.height - cb.height))
    out.save(os.path.join(HERE, 'REFERENCIA_DE_ESTILO.png'))
    print('REFERENCIA_DE_ESTILO.png', out.size)


if __name__ == '__main__':
    main()
