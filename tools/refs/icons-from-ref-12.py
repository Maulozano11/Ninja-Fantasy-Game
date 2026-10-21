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
while the hotbar's window is square (44x44, 88x88 at @2x). So that his drawing keeps its
proportions (his moon stays round, his wolf keeps its build), each icon is a square of his full
height (115x115 of his pixels), and the columns it leaves out are chosen by count: of the squares
that hold his whole subject (`subject` below: the columns that must stay), the one that leaves out
the fewest of his bright pixels (`bright`: his white and gold, OKLab L >= 0.86, and every line or
speck lighter than its ground by 0.08 or more (L minus the opening of radius 1 of L) that is not
dark itself, L >= 0.5), ties going to the one that leaves out the least of their light (the sum of
that contrast). The count for every possible placement, the one chosen and each bright pixel still
left out are in crops.json ('placement'). On his picture that gives:

  lightning_hound_raidon  columns 25..139: the wolf's snout and front paws end at column 139, so 25
                          is as far left as the square can go; it leaves out columns 0..24 (the
                          far end of the lightning trailing off the wolf, 776 bright pixels) and
                          140..143 (sky with the ends of two sparks, 16): 792 of his 3871 bright
                          pixels (20.5%), against 900 (23.2%) for the first square (29..143). A
                          source wider than tall squeezed into the square slot would keep more of
                          his lightning (crops.json 'widerSources': columns 20..139 leave out 16.5%
                          but make his drawing 4.3% narrower, 15..139 12.2% and 8.7% narrower,
                          0..139 0.4% and 21.7% narrower), but it changes every one of his shapes,
                          the wolf's build and the slant of every bolt, and samples his pixels
                          unevenly (up to 1.59 of his columns per pixel against 1.31 of his rows,
                          so his upright strands thin out more than his level ones), where the
                          square shows everything it keeps exactly as he drew it and loses only
                          more of the same trailing bolts; so the square.
  crescent_moon_dance     columns 4..118 (left out: 0..3, dark sky with nothing bright, and
                          119..127: 8 golden dots at the right edge, beside the moon and the top
                          crescent, 11 of his 2371 bright pixels; kept: the moon, the three
                          crescents, the three ninjas, the sparkles at the left edge). Placement 8
                          also leaves out 11, but more of their light; the first square (6..120)
                          left out 14.
  temple_of_nirvana       columns 11..125 (left out: 0..10 and 126..134, 59 of his 2381 bright
                          pixels: at the left edge 41, his four-point sparkle at 9,30, a small
                          light at rows 70..81, the first barbs of the lower left feather and a
                          few dots; at the right edge 18, the right arm of the lilac sparkle at
                          124,33, the lilac dot at 130,20, a barb tip at 127,50 and dots); the
                          first square (9..123) left out 82, the feather tips and sparkles of
                          columns 124 and 125 among them

His black inner line is rounded at the window's corners: its tip covers 3 of his pixels in each
top corner and 1 in each bottom corner. Those pixels (checked dark) take his art next to them,
as on sheet 2; none of the three squares reaches a corner of his window now.

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
  crops.json        the grid (pitch, phase, checks), every box, in his pixels and sheet pixels,
                    and how each square was placed (the count for every placement)
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
# line), his subject (the first and last column of his window that the square must keep), his whole
# slot (frame and its dark outer edge), what it shows. Measured on his pixels: the inner line is the
# column / row just outside.
ICONS = [
    ('lightning_hound_raidon', (14, 64, 158, 179), (40, 139), (7, 57, 166, 186), 'Sabueso rayo: a lightning wolf leaping right, jaws open, on a violet storm sky'),
    ('crescent_moon_dance', (179, 64, 307, 179), (14, 115), (171, 57, 314, 186), 'Luna creciente: three golden crescent slashes, a full moon and dark ninjas on a purple night'),
    ('temple_of_nirvana', (331, 64, 466, 179), (20, 114), (323, 57, 473, 186), 'Nirvana: white glowing feathers swirling on a violet haze with sparkles'),
]
SUBJECT = {
    'lightning_hound_raidon': 'the wolf, from its haunch (about column 40) to its snout and front paws (column 139)',
    'crescent_moon_dance': 'the three crescents (from column 14), the ninjas and the moon with the tip of the top crescent (to column 115)',
    'temple_of_nirvana': 'the swirl of feathers in the middle (columns 20..114); the feathers at both edges are cut by any square',
}

# His bright pixels: his white and gold (OKLab L >= WHITE), and every line or speck lighter than its
# ground (L minus the opening of radius 1 of L) by SPECK or more that is not dark itself (L >= 0.5).
WHITE, SPECK = 0.86, 0.08


def oklab_l(a):
    """OKLab lightness of an RGB array (0..255)."""
    v = a / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    R, G, B = lin[..., 0], lin[..., 1], lin[..., 2]
    l_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    m_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    s_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_


def morph(v, r, mx):
    """Square max (or min) filter of radius r, edges clamped."""
    h, w = v.shape
    p = np.pad(v, r, mode='edge')
    st = [p[r + dy:r + dy + h, r + dx:r + dx + w] for dy in range(-r, r + 1) for dx in range(-r, r + 1)]
    return np.max(st, 0) if mx else np.min(st, 0)


def bright(win):
    """His bright pixels (mask) and how far each stands out from its ground."""
    L = oklab_l(win)
    t = L - morph(morph(L, 1, False), 1, True)
    return (L >= WHITE) | ((t >= SPECK) & (L >= 0.5)), np.clip(t, 0, None)


def place(win, subject):
    """The square's first column: of the placements that keep his subject, the one leaving out the
    fewest of his bright pixels, then the least of their light. Returns it and the whole count."""
    w = win.shape[1]
    m, t = bright(win)
    col_n, col_t = m.sum(0), (t * m).sum(0)
    rows = []
    for o in range(0, w - SIDE + 1):
        out = [c for c in range(w) if not o <= c < o + SIDE]
        rows.append({'first': o, 'columns': [o, o + SIDE - 1], 'keepsSubject': bool(o <= subject[0] and subject[1] < o + SIDE),
                     'brightLost': int(col_n[out].sum()), 'lightLost': round(float(col_t[out].sum()), 2)})
    ok = [r for r in rows if r['keepsSubject']]
    if not ok:
        sys.exit('no square of %d keeps the subject, columns %d..%d' % (SIDE, subject[0], subject[1]))
    best = min(ok, key=lambda r: (r['brightLost'], r['lightLost'], r['first']))
    return best['first'], rows, m


def wider(m, subject):
    """For the record: his bright pixels left out by sources wider than tall (full height, the
    subject kept, placed to leave out the fewest), which the square slot would have to squeeze:
    his drawing would come out `narrower` (width / 115 - 1) than he drew it."""
    w = m.shape[1]
    tot = int(m.sum())
    out = []
    for width in sorted({SIDE, 120, 125, 130, 140, w}):
        if width > w:
            continue
        best = None
        for x0 in range(0, w - width + 1):
            if not (x0 <= subject[0] and subject[1] < x0 + width):
                continue
            lost = tot - int(m[:, x0:x0 + width].sum())
            if best is None or lost < best[1]:
                best = (x0, lost)
        if best:
            out.append({'columns': [best[0], best[0] + width - 1], 'width': width, 'narrower': round(width / SIDE - 1, 3), 'brightLost': best[1], 'brightLostShare': round(best[1] / max(1, tot), 3)})
    return out


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
    for jid, box, subject, slot, what in ICONS:
        x0, y0, x1, y1 = box
        w, h = x1 - x0, y1 - y0
        if h != SIDE:
            sys.exit('%s: his window is %dx%d, not %d tall' % (jid, w, h, SIDE))
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
        filled = []
        for (px, py), (sx, sy) in corner_tips(w, h):
            v = float(win[py, px].mean())
            if v > 45:
                sys.exit('%s: the corner pixel %d,%d of his window is not dark (%.0f)' % (jid, px, py, v))
            win[py, px] = win[sy, sx]
            filled.append((px, py))
        sq0, placements, bmask = place(win, subject)
        tips = [[px - sq0, py] for px, py in filled if sq0 <= px < sq0 + SIDE]
        lost = [[int(x), int(y)] for y, x in zip(*np.nonzero(bmask)) if not sq0 <= x < sq0 + SIDE]
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
            'placement': {
                'rule': 'of the squares that keep his subject, the one leaving out the fewest of his bright pixels (OKLab L >= %.2f, or lighter than the opening of radius 1 of L by %.2f or more and L >= 0.5), then the least of their light (lightLost: the sum of that contrast)' % (WHITE, SPECK),
                'subject': list(subject),
                'subjectIs': SUBJECT[jid],
                'brightTotal': int(bmask.sum()),
                'brightLost': len(lost),
                'brightLostPixels': sorted(lost),
                'every': placements,
                'widerSources': wider(bmask, subject),
            },
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
        p = c['placement']
        print('  %s: window %dx%d, square columns %d..%d, corner tips filled in the square: %s' % (jid, c['windowSize'][0], c['windowSize'][1], c['squareInWindow'][0], c['squareInWindow'][2] - 1, c['cornerTipsFilled']))
        print('    bright pixels left out: %d of %d (%.1f%%); per placement (first column: lost/light%s):' % (p['brightLost'], p['brightTotal'], 100 * p['brightLost'] / p['brightTotal'], ', x = loses his subject'))
        print('     ', ' '.join('%d:%d/%.1f%s' % (r['first'], r['brightLost'], r['lightLost'], '' if r['keepsSubject'] else 'x') for r in p['every']))
        print('    wider sources squeezed:', '; '.join('%d..%d %d%% narrower lose %d (%.1f%%)' % (s['columns'][0], s['columns'][1], round(100 * s['narrower']), s['brightLost'], 100 * s['brightLostShare']) for s in p['widerSources']))


if __name__ == '__main__':
    main()
