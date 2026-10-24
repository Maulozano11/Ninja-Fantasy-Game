"""Crops the owner's hotbar icon sheet 24 (the senbon set) for the icon generator (tools/ui/ui-icons-23.ts).

His picture (docs/reference/icons-owner-reference-24.jpg, 2026-10-24, 2000x1116) shows four skill
slots in a row, in his steel frame with gold corners and a label under each: SENBON (senbon),
UNTAR VENENO (poison, the weapon-poison button), UNTAR POCISION DE CURA and SENBON CURATIVO
(healSenbon). The third is left out (SKIP, his words): that ability will not exist.

Unlike his sheets 2 to 22 his pixels are not on one grid across the whole picture: each slot has its
own pitch (6.05 to 6.69 sheet pixels across, 6.58 down) and phase. So the grid is measured per slot,
on the slot alone (the strongest period of its edge energy, tools/refs/icons-from-ref-23.py
spectrum_pitch, and the phase that puts the most edge energy on the cell edges), and his pixels are
taken back as on the other sheets (the median of each block's interior, R23.native).

His art window is found on his pixels: from the middle of the slot outward on each side, the first
column (or row) of his pixels that is his black inner line over 85% of the slot's middle; the window
is everything inside the four. It must be square within 10%. The tip of his line where it rounds a
window's corner takes his art next to it (as tools/refs/icons-from-ref-13.py clean_corners).

Writes, in <out>/ref/, the files tools/ui/ui-icons-23.ts reads (as the other crop scripts): his
window in his pixels <id>.png, <id>@sheet.png, <id>@88.png, <id>@44.png, slot_<id>.png, row-24.png,
row-24@1x.png, row-24@4x.png, study/<id>-x8.png, crops.json, palette.json. Every file is written
under a temporary name and then renamed; the same picture always gives the same bytes. Run with
python3 -I:

  python3 -I tools/refs/icons-from-ref-24.py 24=docs/reference/icons-owner-reference-24.jpg <stagingDir>
  UI_OUT=<stagingDir> UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts

then copy <id>.png and <id>@2x.png into src/assets/ui_icons and <stagingDir>/manifest.json as
src/assets/ui_icons/manifest_24.json.
"""

import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image

_here = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('icons_from_ref_23', os.path.join(_here, 'icons-from-ref-23.py'))
R23 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R23)
_spec13 = importlib.util.spec_from_file_location('icons_from_ref_13', os.path.join(_here, 'icons-from-ref-13.py'))
R13 = importlib.util.module_from_spec(_spec13)
_spec13.loader.exec_module(R13)

# Icon id (the button's id), his slot on the sheet in sheet pixels (x0, y0, x1, y1: his frame with a
# little of the ground round it), his label, what it shows.
SHEET = [
    ('senbon', (86, 222, 496, 634), 'SENBON', 'Senbon: three steel needles with ring ends flying up-right, cyan sparks, on teal and green'),
    ('poison', (558, 222, 968, 634), 'UNTAR VENENO', 'Weapon poison: a bottle pouring green venom over a sword blade, on violet'),
    ('healSenbon', (1504, 222, 1914, 634), 'SENBON CURATIVO', 'Healing senbon: two crossed needles in a green glow with sparkles, on teal'),
]
SKIP = [('UNTAR POCISION DE CURA', 'coat with a healing potion', 'ignora untar arma con posicion no lo pondremos')]

# His frame round his window, in his pixels (for slot_<id>.png): steel, a darker band and his line.
FRAME = 6


def slot_grid(a):
    """His grid on one slot: pitch and phase across and down, as R23.grid but on the slot alone."""
    L = a.mean(2)
    gx = np.abs(np.diff(L, axis=1)).mean(0)
    gy = np.abs(np.diff(L, axis=0)).mean(1)
    px, py = R23.spectrum_pitch(gx), R23.spectrum_pitch(gy)
    if not (5 < px < 8 and 5 < py < 8):
        sys.exit('his pixels on this slot are not 5 to 8 sheet pixels: %.3f x %.3f' % (px, py))

    def phase(g, p):
        n = int(len(g) / p)
        best = None
        for t in range(int(p * 20)):
            ph = t / 20
            idx = [int(np.floor(ph + k * p)) - 1 for k in range(1, n)]
            idx = [i for i in idx if 0 <= i < len(g)]
            e = float(g[idx].mean())
            if best is None or e > best[0] + 1e-9:
                best = (e, ph)
        return best

    ex, phx = phase(gx, px)
    ey, phy = phase(gy, py)
    size = (int((a.shape[1] - phx) / px), int((a.shape[0] - phy) / py))
    return {
        'pitch': [round(px, 4), round(py, 4)],
        'phase': [phx, phy],
        'edgeRatio': [round(ex / float(gx.mean()), 3), round(ey / float(gy.mean()), 3)],
        'size': list(size),
    }


def window(nat):
    """His art window in his pixels: inside the first line of his black on each side, from the middle out."""
    h, w, _ = nat.shape
    dark = np.vectorize(lambda r, g, b: R13.line_black((r, g, b)), otypes=[bool])(nat[..., 0], nat[..., 1], nat[..., 2])
    my0, my1, mx0, mx1 = int(h * 0.2), int(h * 0.8), int(w * 0.2), int(w * 0.8)
    col = lambda x: dark[my0:my1, x].mean() >= 0.85
    row = lambda y: dark[y, mx0:mx1].mean() >= 0.85
    x0 = next(x for x in range(w // 2, -1, -1) if col(x)) + 1
    x1 = next(x for x in range(w // 2, w) if col(x))
    y0 = next(y for y in range(h // 2, -1, -1) if row(y)) + 1
    y1 = next(y for y in range(h // 2, h) if row(y))
    return x0, y0, x1, y1


def main():
    args = sys.argv[1:]
    if len(args) != 2 or not args[0].startswith('24='):
        sys.exit('usage: python3 -I tools/refs/icons-from-ref-24.py 24=<icons-owner-reference-24.jpg> <stagingDir>')
    path, out = args[0][3:], args[1]
    ref = os.path.join(out, 'ref')
    study = os.path.join(ref, 'study')
    os.makedirs(study, exist_ok=True)
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    crops = {'grid': {'24': {'source': os.path.basename(path), 'size': list(im.size), 'perSlot': True}}, 'icons': {}, 'leftOut': {'24': [{'label': l, 'id': i, 'why': w} for l, i, w in SKIP]}}
    pal = {}
    for jid, (sx0, sy0, sx1, sy1), label, what in SHEET:
        sa = a[sy0:sy1, sx0:sx1]
        g = slot_grid(sa)
        nat, xs, ys, spread = R23.native(sa, {'pitch': g['pitch'], 'phase': g['phase']}, tuple(g['size']))
        g['blockSpread'] = round(spread, 3)
        x0, y0, x1, y1 = window(nat)
        if abs((x1 - x0) / (y1 - y0) - 1) > 0.1:
            sys.exit('%s: the window %s is not (within 10%%) square' % (jid, (x0, y0, x1, y1)))
        win, tips = R13.clean_corners(nat[y0:y1, x0:x1], 1)
        R23.save_atomic(R23.to_img(win), os.path.join(ref, jid + '.png'))
        sb = (sx0 + xs[x0], sy0 + ys[y0], sx0 + xs[x1], sy0 + ys[y1])
        sc = im.crop(sb)
        R23.save_atomic(sc, os.path.join(ref, jid + '@sheet.png'))
        R23.save_atomic(sc.resize((88, 88), Image.LANCZOS), os.path.join(ref, jid + '@88.png'))
        R23.save_atomic(sc.resize((44, 44), Image.LANCZOS), os.path.join(ref, jid + '@44.png'))
        slot = (max(0, x0 - FRAME), max(0, y0 - FRAME), min(len(xs) - 1, x1 + FRAME), min(len(ys) - 1, y1 + FRAME))
        ss = (sx0 + xs[slot[0]], sy0 + ys[slot[1]], sx0 + xs[slot[2]], sy0 + ys[slot[3]])
        R23.save_atomic(im.crop(ss), os.path.join(ref, 'slot_' + jid + '.png'))
        w, h = x1 - x0, y1 - y0
        R23.save_atomic(R23.to_img(win).resize((w * 8, h * 8), Image.NEAREST), os.path.join(study, '%s-x8.png' % jid))
        crops['icons'][jid] = {'sheet': '24', 'label': label, 'box': [x0, y0, x1, y1], 'size': [w, h], 'slotGrid': g, 'sheetBox': list(sb), 'sheetSlot': list(ss), 'cornerTips': tips, 'what': what}
        pal[jid] = R23.kmeans(win, 16)
    # His row (the three slots used, the one left out between them stays in the picture).
    s0, s1 = crops['icons'][SHEET[0][0]]['sheetSlot'], crops['icons'][SHEET[-1][0]]['sheetSlot']
    rb = (s0[0] - 8, s0[1] - 8, s1[2] + 8, s1[3] + 8)
    row = im.crop(rb)
    R23.save_atomic(row, os.path.join(ref, 'row-24.png'))
    ww = crops['icons'][SHEET[0][0]]['sheetBox'][2] - crops['icons'][SHEET[0][0]]['sheetBox'][0]
    for name, target in (('1x', 44), ('4x', 176)):
        k = target / ww
        R23.save_atomic(row.resize((round(row.size[0] * k), round(row.size[1] * k)), Image.LANCZOS), os.path.join(ref, 'row-24@%s.png' % name))
    crops['grid']['24']['row'] = list(rb)
    crops['grid']['24']['rowScale'] = {'1x': 44 / ww, '4x': 176 / ww}
    R23.write_atomic(json.dumps(crops, indent=1) + '\n', os.path.join(ref, 'crops.json'))
    R23.write_atomic(json.dumps(pal, indent=1) + '\n', os.path.join(ref, 'palette.json'))
    print('wrote %d icons and their slots to %s' % (len(SHEET), ref))
    for jid, c in crops['icons'].items():
        g = c['slotGrid']
        print('  %s: pitch %.3f x %.3f, phase %.2f %.2f, edge ratio %.2f %.2f, block spread %.2f, window %s %dx%d, corner tips %s' % (
            jid, g['pitch'][0], g['pitch'][1], g['phase'][0], g['phase'][1], g['edgeRatio'][0], g['edgeRatio'][1], g['blockSpread'], c['box'], c['size'][0], c['size'][1], c['cornerTips']))


if __name__ == '__main__':
    main()
