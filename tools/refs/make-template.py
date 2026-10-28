"""Writes the sheet template every new art sheet is drawn on (docs/scene-art-plan.md, section 3).

    python3 -I tools/refs/make-template.py <cols> <rows> <out.png> [--factor 8] [--cell 1024] [--gutter 32]
                                           [--labels "mesa baja,brasero,..."] [--spec <out.json>]

The template: a flat key-colour background (magenta #FF00FF), `cols` x `rows` cells of `cell`
picture pixels (= cell/factor game pixels) with a dark gutter between them, the scale figure
(tools/refs/template/scale-figure.png, our default legend at idle) blown up by `factor` in cell
0 so the drawing is made at our size and view, a dark strip under each cell for its label (never
inside the cell), and a short reminder in the top strip. Cell 0 is skipped by the converter.

With --spec it also writes the spec file tools/refs/sheet-from-template.py reads, with one piece
per label (ids from the labels, cell by cell after the figure's, kind "prop"), to be edited.
"""
import argparse
import json
import os
import re
import unicodedata

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
KEY = (255, 0, 255)
GUTTER_COL = (34, 32, 40)
TEXT = (235, 225, 205)
TOP = 96  # the reminder strip


def slug(label):
    s = unicodedata.normalize('NFKD', label).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_') or 'piece'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cols', type=int)
    ap.add_argument('rows', type=int)
    ap.add_argument('out')
    ap.add_argument('--factor', type=int, default=8)
    ap.add_argument('--cell', type=int, default=1024)
    ap.add_argument('--gutter', type=int, default=32)
    ap.add_argument('--labels', default='')
    ap.add_argument('--spec')
    ap.add_argument('--group', default='lote')
    a = ap.parse_args()
    c, g, f = a.cell, a.gutter, a.factor
    strip = 56
    font = ImageFont.load_default(size=30)
    small = ImageFont.load_default(size=24)
    W = g + a.cols * (c + g)
    H = TOP + g + a.rows * (c + g + strip)
    im = Image.new('RGB', (W, H), GUTTER_COL)
    d = ImageDraw.Draw(im)
    game = c // f
    d.text((g, 14), f'Plantilla {a.cols}x{a.rows} · cada celda = {game}x{game} px de juego (factor {f}) · fondo magenta puro · '
                    f'una pieza por celda, apoyada en el borde de abajo · sin texto ni sombras dentro · PNG', fill=TEXT, font=small)
    d.text((g, 52), 'Celda 0: la figura de escala (94 px de juego): dibuja todo a esa escala, vista 3/4 hacia la derecha, luz arriba-izquierda, linea negra de 1 px.', fill=TEXT, font=small)
    labels = [s.strip() for s in a.labels.split(',') if s.strip()]
    pieces = []
    k = 0
    for cy in range(a.rows):
        for cx in range(a.cols):
            x0 = g + cx * (c + g)
            y0 = TOP + g + cy * (c + g + strip)
            d.rectangle([x0, y0, x0 + c - 1, y0 + c - 1], fill=KEY)
            if cx == 0 and cy == 0:
                fig = Image.open(os.path.join(HERE, 'template', 'scale-figure.png')).convert('RGBA')
                big = fig.resize((fig.width * f, fig.height * f), Image.NEAREST)
                im.paste(big, (x0 + (c - big.width) // 2, y0 + c - big.height), big)
                d.text((x0 + 8, y0 + c + 12), 'Celda 0: figura de escala (no dibujar aqui)', fill=TEXT, font=font)
                continue
            label = labels[k] if k < len(labels) else f'celda {cx},{cy}'
            d.text((x0 + 8, y0 + c + 12), f'{k + 1}. {label}', fill=TEXT, font=font)
            pieces.append({'id': slug(label) if k < len(labels) else f'cell_{cx}_{cy}', 'label': label, 'labelEs': label,
                           'cell': [cx, cy], 'span': [1, 1], 'kind': 'prop', 'tags': []})
            k += 1
    im.save(a.out)
    print(f'{a.out}: {W}x{H}, {a.cols}x{a.rows} cells of {c} px ({game} game px), factor {f}')
    if a.spec:
        # the converter's grid has no label strips: it reads the template's geometry from the spec
        spec = {'group': a.group, 'factor': f, 'cell': c, 'gutter': g, 'cols': a.cols, 'rows': a.rows, 'top': TOP, 'strip': strip,
                'colors': 32, 'key': list(KEY), 'pieces': pieces}
        with open(a.spec, 'w') as fh:
            json.dump(spec, fh, indent=1, ensure_ascii=False)
        print(f'{a.spec}: {len(pieces)} pieces')


if __name__ == '__main__':
    main()
