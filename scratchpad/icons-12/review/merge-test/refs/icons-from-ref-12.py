"""Crops the owner's hotbar icon sheet 12 for the icon generator (tools/ui/ui-icons-12.ts).

His picture (docs/reference/icons-owner-reference-12.jpg, 2000x1116) shows three skill slots in a
row, each in his steel frame with gold corners and a label under it:

  SABUESO RAYO    (lightning_hound_raidon)  a lightning wolf leaping right on a violet storm sky
  LUNA CRECIENTE  (crescent_moon_dance)     three golden crescent slashes, a full moon, dark ninjas
  NIRVANA         (temple_of_nirvana)       white glowing feathers swirling on a violet haze

Like his sheets 2 to 7 it is pixel art: a 480x268 picture scaled up by 2000/480 = 4.1667 with
nearest neighbour and saved as JPEG. His pixels are taken back exactly as for those sheets (the grid
and the block medians of tools/refs/icons-from-ref-23.py, loaded from that file and not changed).

What is new on this sheet: his windows are wider than tall. Inside his inner line (black, but a
dark violet on the wolf's right-hand side) they are 144x115, 128x115 and 135x115 of his pixels,
while the hotbar's window is square (44x44, 88x88 at @2x). So that his drawing keeps its proportions (his moon stays round, his wolf keeps its build),
each icon is the square of his full height (115x115 of his pixels) placed so that his whole subject
stays in it; the columns left out are named below and in crops.json:

  lightning_hound_raidon  his window columns 29..143 (cut: 0..28, the far end of the lightning
                          trailing off the wolf's back; kept: the whole wolf, head, eye, jaws and
                          paws, and the sky to the right of the snout as he left it)
  crescent_moon_dance     columns 6..120 (cut: 0..5 and 121..127, dark sky with a few dots; kept:
                          the moon, the three crescents, the three ninjas, every sparkle)
  temple_of_nirvana       columns 9..123 (cut: 0..8 and 124..134, haze, the tip of the left
                          sparkle's arm and the last two columns of the right feather's tip)

His black inner line is rounded at the window's corners: its tip covers 3 of his pixels in each
top corner and 1 in each bottom corner. Those pixels (checked dark) take his art next to them,
as on sheet 2; only the wolf's square reaches a corner of his window (both right-hand corners).

Writes, in <out>/ref/:

  <id>.png          his square in his own pixels, 115x115 (the generator builds the icon from it)
  <id>@window.png   his whole window in his own pixels (for the comparison sheet)
  <id>@sheet.png    his square as cropped from the sheet (no resampling; his picture for the box
                    reductions the review compares with)
  <id>@windowsheet.png  his whole window as cropped from the sheet
  <id>@88.png, <id>@44.png   the sheet square scaled to 88 and 44 (Lanczos), for the comparison
  slot_<id>.png     his whole slot, frame included, from the sheet
  row-12.png        his row of three slots (sheet pixels)
  row-12@1x.png, row-12@4x.png   his row scaled (Lanczos) so his window is 44 (1x) or 176 (4x)
                    pixels tall, as tall as ours
  native-12.png     his whole sheet in his own pixels (480x268)
  study/<id>-x6.png his square in his pixels at 6x (nearest), to study the details
  crops.json        the grid (pitch, phase, checks) and every box, in his pixels and sheet pixels
  palette.json      the main colours of each icon (k-means on his pixels)

Every file is written under a temporary name and then renamed; the same picture always gives the
same bytes. Run with python3 -I:

  python3 -I tools/refs/icons-from-ref-12.py docs/reference/icons-owner-reference-12.jpg <stagingDir>
"""

import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image

# His grid and pixel recovery, exactly as for sheets 2 to 7 (that file is read only).
_spec = importlib.util.spec_from_file_location('icons_from_ref_23', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons-from-ref-23.py'))
R23 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R23)

SHEET = '12'
NATIVE = R23.NATIVE
SIDE = 115  # his window's height, and the side of the square taken from it

# Jutsu id, his window in his pixels (x0, y0, x1, y1; exclusive; everything inside his black inner
# line), the first column of the square in the window, his whole slot (frame and its dark outer
# edge), what it shows. Measured on his pixels: the inner line is the column / row just outside.
ICONS = [
    ('lightning_hound_raidon', (14, 64, 158, 179), 29, (7, 57, 166, 186), 'Sabueso rayo: a lightning wolf leaping right, jaws open, on a violet storm sky'),
    ('crescent_moon_dance', (179, 64, 307, 179), 6, (171, 57, 314, 186), 'Luna creciente: three golden crescent slashes, a full moon and dark ninjas on a purple night'),
    ('temple_of_nirvana', (331, 64, 466, 179), 9, (323, 57, 473, 186), 'Nirvana: white glowing feathers swirling on a violet haze with sparkles'),
]


def corner_tips(w, h):
    """The rounded tips of his inner line inside the window: 3 pixels per top corner, 1 per bottom
    corner, each with the pixel of his art that replaces it (the next one inward)."""
    out = []
    for cx, sx in ((0, 1), (w - 1, -1)):
        out += [((cx, 0), (cx + sx, 1)), ((cx + sx, 0), (cx + 2 * sx, 0)), ((cx, 1), (cx, 2))]
        out += [((cx, h - 1), (cx + sx, h - 2))]
    return out


def main():
    if len(sys.argv) != 3:
        sys.exit('usage: python3 -I tools/refs/icons-from-ref-12.py <icons-owner-reference-12.jpg> <stagingDir>')
    path, out = sys.argv[1], sys.argv[2]
    ref = os.path.join(out, 'ref')
    study = os.path.join(ref, 'study')
    os.makedirs(study, exist_ok=True)
    im = Image.open(path).convert('RGB')
    if abs(im.size[0] / NATIVE[0] - im.size[1] / NATIVE[1]) > 0.02:
        sys.exit('expected his 480x268 picture scaled up evenly, got %dx%d (%s)' % (im.size + (path,)))
    a = np.asarray(im).astype(float)
    g = R23.grid(a)
    nat, xs, ys, spread = R23.native(a, g)
    g['blockSpread'] = round(spread, 3)
    g['source'] = os.path.basename(path)
    crops = {'grid': {SHEET: g}, 'icons': {}}
    pal = {}
    R23.save_atomic(R23.to_img(nat), os.path.join(ref, 'native-%s.png' % SHEET))
    L = nat.mean(2)
    for jid, box, sq0, slot, what in ICONS:
        x0, y0, x1, y1 = box
        w, h = x1 - x0, y1 - y0
        if h != SIDE or not (0 <= sq0 and sq0 + SIDE <= w):
            sys.exit('%s: the square %d..%d does not fit his %dx%d window' % (jid, sq0, sq0 + SIDE - 1, w, h))
        # The window must sit inside his inner line: the line of his pixels just outside each side
        # is dark. It is black (below 30) except on the wolf's right, where his line is a dark
        # violet (below 80; the steel next to it is 98 to 111).
        sides = [L[y0:y1, x0 - 1], L[y0:y1, x1], L[y0 - 1, x0:x1], L[y1, x0:x1]]
        for k, s in enumerate(sides):
            dark = 80 if (jid, k) == ('lightning_hound_raidon', 1) else 30
            if np.mean(s < dark) < 0.97:
                sys.exit('%s: the window %s is not inside his inner line' % (jid, box))
        win = nat[y0:y1, x0:x1].copy()
        R23.save_atomic(R23.to_img(win), os.path.join(ref, jid + '@window.png'))
        # The tips of his inner line in the corners take his art next to them (only where the
        # square reaches them, but done on the whole window so both pictures agree).
        tips = []
        for (px, py), (sx, sy) in corner_tips(w, h):
            v = float(win[py, px].mean())
            if v > 45:
                sys.exit('%s: the corner pixel %d,%d of his window is not dark (%.0f)' % (jid, px, py, v))
            win[py, px] = win[sy, sx]
            if sq0 <= px < sq0 + SIDE:
                tips.append([px - sq0, py])
        sq = win[:, sq0:sq0 + SIDE]
        R23.save_atomic(R23.to_img(sq), os.path.join(ref, jid + '.png'))
        sb = (xs[x0 + sq0], ys[y0], xs[x0 + sq0 + SIDE], ys[y1])
        sc = im.crop(sb)
        R23.save_atomic(sc, os.path.join(ref, jid + '@sheet.png'))
        R23.save_atomic(sc.resize((88, 88), Image.LANCZOS), os.path.join(ref, jid + '@88.png'))
        R23.save_atomic(sc.resize((44, 44), Image.LANCZOS), os.path.join(ref, jid + '@44.png'))
        wb = (xs[x0], ys[y0], xs[x1], ys[y1])
        R23.save_atomic(im.crop(wb), os.path.join(ref, jid + '@windowsheet.png'))
        ss = (xs[slot[0]], ys[slot[1]], xs[slot[2]], ys[slot[3]])
        R23.save_atomic(im.crop(ss), os.path.join(ref, 'slot_' + jid + '.png'))
        R23.save_atomic(R23.to_img(sq).resize((SIDE * 6, SIDE * 6), Image.NEAREST), os.path.join(study, jid + '-x6.png'))
        crops['icons'][jid] = {
            'sheet': SHEET,
            'window': list(box),
            'windowSize': [w, h],
            'square': [x0 + sq0, y0, x0 + sq0 + SIDE, y1],
            'squareInWindow': [sq0, 0, sq0 + SIDE, SIDE],
            'cutColumns': [c for c in range(w) if not sq0 <= c < sq0 + SIDE],
            'cornerTipsFilled': tips,
            'slot': list(slot),
            'sheetSquare': list(sb),
            'sheetWindow': list(wb),
            'sheetSlot': list(ss),
            'what': what,
        }
        pal[jid] = R23.kmeans(sq, 16)
    s0, s1 = ICONS[0][3], ICONS[-1][3]
    rb = (xs[s0[0] - 2], ys[s0[1] - 2], xs[s1[2] + 2], ys[s1[3] + 2])
    row = im.crop(rb)
    R23.save_atomic(row, os.path.join(ref, 'row-%s.png' % SHEET))
    g['row'] = list(rb)
    # His row scaled so his window is as tall as ours (44 at 1x, 176 at 4x), for the comparison.
    wh = ys[ICONS[0][1][3]] - ys[ICONS[0][1][1]]
    for name, target in (('1x', 44), ('4x', 176)):
        k = target / wh
        R23.save_atomic(row.resize((round(row.size[0] * k), round(row.size[1] * k)), Image.LANCZOS), os.path.join(ref, 'row-%s@%s.png' % (SHEET, name)))
    g['rowScale'] = {'1x': 44 / wh, '4x': 176 / wh}
    R23.write_atomic(json.dumps(crops, indent=1) + '\n', os.path.join(ref, 'crops.json'))
    R23.write_atomic(json.dumps(pal, indent=1) + '\n', os.path.join(ref, 'palette.json'))
    print('wrote %d icons and their slots to %s' % (len(ICONS), ref))
    print('sheet %s: pitch %.4f x %.4f (spectrum %.4f x %.4f), phase %.2f %.2f, edge ratio %.2f %.2f, block spread %.2f' % (
        SHEET, g['pitch'][0], g['pitch'][1], g['spectrumPitch'][0], g['spectrumPitch'][1], g['phase'][0], g['phase'][1], g['edgeRatio'][0], g['edgeRatio'][1], g['blockSpread']))
    for jid, c in crops['icons'].items():
        print('  %s: window %dx%d, square columns %d..%d, corner tips filled in the square: %s' % (jid, c['windowSize'][0], c['windowSize'][1], c['squareInWindow'][0], c['squareInWindow'][2] - 1, c['cornerTipsFilled']))


if __name__ == '__main__':
    main()
