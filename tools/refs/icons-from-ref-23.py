"""Crops the owner's hotbar icon sheets 2 and 3 for the icon generator (tools/ui/ui-icons-23.ts).

His pictures (docs/reference/icons-owner-reference-2.jpg and -3.jpg, 2000x1116 each) each show four
skill slots in a row:

  sheet 2: Chidori, Rasengan, Venom Surge, Earth Wall (Muro de tierra)
  sheet 3: Earth Bullets (Balas de tierra), Great Fireball (Gran bola de fuego),
           Water Stream (Chorro de agua), Weapon Attack (Ataque con arma)

Unlike sheet 1 (a painting), these two are pixel art: each is a 480x268 picture scaled up by
2000/480 = 4.1667 with nearest neighbour (so his pixels are blocks of 4 or 5 sheet pixels) and saved
as JPEG. This script finds his pixel grid (the pitch from the sheet size, checked against the
spectrum of the sheet's edges; the phase where the edges between blocks are strongest) and takes
each of his pixels back as the median of its block's interior (the block without its outer ring,
where the JPEG and the scaling smear neighbours together). His art windows are then cropped in his
own pixels: 90x90 on sheet 2, 93x91 on sheet 3 (inside his black inner line).

For each icon (named by jutsu id) this writes, in <out>/ref/:

  <id>.png          his art window in his own pixels (the generator builds the icon from it)
  <id>@sheet.png    his art window as cropped from the sheet (no resampling; his "picture" for the
                    box reduction to 44 the review compares with)
  <id>@88.png       the sheet crop scaled to 88x88 (Lanczos), for the comparison sheet
  <id>@44.png       the sheet crop scaled to 44x44 (Lanczos), for the comparison sheet
  slot_<id>.png     his whole slot, frame included, from the sheet
  row-2.png, row-3.png   his row of four slots (sheet pixels), for the comparison sheet
  row-<s>@1x.png, row-<s>@4x.png   his row scaled (Lanczos) so his art window is 44 (1x) or 176
                    (4x) pixels wide, as big as ours, for the comparison sheet
  native-2.png, native-3.png   his whole sheets in his own pixels (480x268)
  study/<id>-x6.png his window in his pixels at 6x (nearest), to study the details
  crops.json        the grid (pitch, phase, checks) and every box, in his pixels and in sheet pixels
  palette.json      the main colours of each icon (k-means on his pixels)

Every file is written under a temporary name and then renamed; the same pictures always give the
same bytes. Run with python3 -I:

  python3 -I tools/refs/icons-from-ref-23.py docs/reference/icons-owner-reference-2.jpg \
      docs/reference/icons-owner-reference-3.jpg <stagingDir>
"""

import json
import os
import sys

import numpy as np
from PIL import Image

NATIVE = (480, 268)

# Jutsu id, his art window in his pixels (x0, y0, x1, y1; x1/y1 exclusive), his whole slot in his
# pixels (frame and its drop shadow), what it shows. Measured on his pixels: the window is everything
# inside his black inner line (one of his pixels wide on sheet 2; two at the top and left on sheet 3).
SHEETS = {
    '2': [
        ('chidori_lightning_blade', (24, 84, 114, 174), (16, 76, 122, 183), 'Chidori: a white-blue lightning burst, jagged bolts from a white-hot centre'),
        ('rasengan', (138, 84, 228, 174), (130, 76, 236, 183), 'Rasengan: a blue spiral sphere of chakra with a white core'),
        ('venom_surge', (252, 84, 342, 174), (244, 76, 350, 183), 'Venom Surge: a green slime stream with drops, in purple smoke'),
        ('earth_wall_doryuheki', (366, 84, 456, 174), (358, 76, 464, 183), 'Earth Wall: a cracked stone wall with roots, grass and dust'),
    ],
    '3': [
        ('earth_spear_doryuudan', (18, 83, 111, 174), (9, 74, 120, 182), 'Earth Bullets: boulders flying with dust trails'),
        ('great_fireball', (135, 83, 228, 174), (126, 74, 237, 182), 'Great Fireball: a huge fireball of flame tongues, smoke and embers'),
        ('water_stream', (252, 83, 345, 174), (243, 74, 354, 182), 'Water Stream: a jet of water ending in spray'),
        ('weapon_attack', (369, 83, 462, 174), (360, 74, 471, 182), 'Weapon Attack: a sword with a gold slash crescent and sparkles'),
    ],
    # Sheet 4 (2026-10-20): bigger windows, 98x96 of his pixels, inside a one-pixel black line.
    '4': [
        ('weapon_throw', (14, 83, 112, 179), (8, 77, 118, 185), 'Throw: two kunai, a shuriken and a lit explosive tag over flames'),
        ('dodge', (132, 83, 230, 179), (126, 77, 236, 185), 'Dodge: a ninja leaping aside, a blue crescent trail, violet smoke'),
        ('weapon_stow', (250, 83, 348, 179), (244, 77, 354, 185), 'Stow weapon: a masked ninja sheathing his katana, a spark at the scabbard mouth'),
        ('weapon_draw', (368, 83, 466, 179), (362, 77, 472, 185), 'Draw weapon: two hands drawing a katana in a burst of light'),
    ],
}


def save_atomic(img, path):
    tmp = path + '.tmp-%d' % os.getpid()
    img.save(tmp, format='PNG')
    os.replace(tmp, path)


def write_atomic(text, path):
    tmp = path + '.tmp-%d' % os.getpid()
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


def kmeans(px, k, iters=25):
    px = px.reshape(-1, 3).astype(float)
    lum = px @ np.array([0.3, 0.59, 0.11])
    order = np.argsort(lum, kind='stable')
    c = np.array([px[order[int((i + 0.5) / k * len(order))]] for i in range(k)])
    for _ in range(iters):
        a = ((px[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            if (a == j).any():
                c[j] = px[a == j].mean(0)
    a = ((px[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
    out = []
    for j in np.argsort(c @ np.array([0.3, 0.59, 0.11]), kind='stable'):
        out.append({'hex': hexc(c[j]), 'share': round(float((a == j).mean()), 3)})
    return out


def spectrum_pitch(g):
    """The strongest period (in sheet pixels, between 2.2 and 12) of an edge-energy profile."""
    g = g - g.mean()
    n = 1 << 14
    f = np.abs(np.fft.rfft(g, n=n))
    fr = np.fft.rfftfreq(n)
    m = (fr > 1 / 12) & (fr < 1 / 2.2)
    return float(1 / fr[np.argmax(np.where(m, f, 0))])


def grid(a):
    """His pixel grid on one sheet: pitch (x, y), phase (x, y) and the checks behind them."""
    L = a.mean(2)
    H, W = L.shape
    px, py = W / NATIVE[0], H / NATIVE[1]
    gx = np.abs(np.diff(L, axis=1)).mean(0)  # edge energy between sheet column x and x + 1
    gy = np.abs(np.diff(L, axis=0)).mean(1)
    sx, sy = spectrum_pitch(gx), spectrum_pitch(gy)
    if abs(sx / px - 1) > 0.01 or abs(sy / py - 1) > 0.01:
        sys.exit('his pixel grid is not %dx%d: the edges repeat every %.3f x %.3f sheet pixels' % (NATIVE + (sx, sy)))

    def phase(g, p, n):
        best = None
        for t in range(int(p * 20)):
            ph = t / 20
            idx = [int(np.floor(ph + k * p)) - 1 for k in range(1, n)]
            idx = [i for i in idx if 0 <= i < len(g)]
            e = float(g[idx].mean())
            if best is None or e > best[0] + 1e-9:
                best = (e, ph)
        return best

    ex, phx = phase(gx, px, NATIVE[0])
    ey, phy = phase(gy, py, NATIVE[1])
    return {
        'pitch': [px, py],
        'spectrumPitch': [round(sx, 4), round(sy, 4)],
        'phase': [phx, phy],
        'edgeRatio': [round(ex / float(gx.mean()), 3), round(ey / float(gy.mean()), 3)],
    }


def cell_edges(p, ph, n):
    return [int(np.floor(ph + k * p)) for k in range(n + 1)]


def native(a, g):
    """His pixels: each the median of its block's interior (the block without its outer ring)."""
    H, W, _ = a.shape
    xs = cell_edges(g['pitch'][0], g['phase'][0], NATIVE[0])
    ys = cell_edges(g['pitch'][1], g['phase'][1], NATIVE[1])
    out = np.zeros((NATIVE[1], NATIVE[0], 3))
    spread = []
    for j in range(NATIVE[1]):
        y0, y1 = max(0, ys[j]), min(H, ys[j + 1])
        for i in range(NATIVE[0]):
            x0, x1 = max(0, xs[i]), min(W, xs[i + 1])
            c = a[y0 + 1:y1 - 1, x0 + 1:x1 - 1] if (y1 - y0 > 2 and x1 - x0 > 2) else a[y0:y1, x0:x1]
            if c.size == 0:
                c = a[max(0, y0 - 1):min(H, y1 + 1), max(0, x0 - 1):min(W, x1 + 1)]
            c = c.reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
            spread.append(float(c.std(0).mean()))
    return out, xs, ys, float(np.mean(spread))


def to_img(arr):
    return Image.fromarray(np.clip(np.round(arr), 0, 255).astype(np.uint8))


def main():
    # Either his sheets 2 and 3 in order, or any of his sheets as N=<picture> (4=...jpg), then the folder.
    args = sys.argv[1:]
    if len(args) >= 2 and all('=' in a for a in args[:-1]):
        srcs = dict(a.split('=', 1) for a in args[:-1])
        if any(k not in SHEETS for k in srcs):
            sys.exit('unknown sheet in %s (known: %s)' % (', '.join(srcs), ', '.join(SHEETS)))
    elif len(args) == 3:
        srcs = {'2': args[0], '3': args[1]}
    else:
        sys.exit('usage: python3 -I tools/refs/icons-from-ref-23.py <icons-owner-reference-2.jpg> <icons-owner-reference-3.jpg> <stagingDir>\n'
                 '       python3 -I tools/refs/icons-from-ref-23.py 4=<icons-owner-reference-4.jpg> [...] <stagingDir>')
    out = args[-1]
    ref = os.path.join(out, 'ref')
    study = os.path.join(ref, 'study')
    os.makedirs(study, exist_ok=True)
    crops = {'grid': {}, 'icons': {}}
    pal = {}
    for sheet, path in srcs.items():
        im = Image.open(path).convert('RGB')
        if im.size != (2000, 1116):
            sys.exit('expected his 2000x1116 picture, got %dx%d (%s)' % (im.size + (path,)))
        a = np.asarray(im).astype(float)
        g = grid(a)
        nat, xs, ys, spread = native(a, g)
        g['blockSpread'] = round(spread, 3)
        g['source'] = os.path.basename(path)
        crops['grid'][sheet] = g
        save_atomic(to_img(nat), os.path.join(ref, 'native-%s.png' % sheet))
        L = nat.mean(2)
        for jid, box, slot, what in SHEETS[sheet]:
            x0, y0, x1, y1 = box
            # The window must sit inside his black inner line: the line of his pixels just outside
            # each side is dark.
            sides = [L[y0:y1, x0 - 1], L[y0:y1, x1], L[y0 - 1, x0:x1], L[y1, x0:x1]]
            for s in sides:
                if np.mean(s < 30) < 0.9:
                    sys.exit('%s: the window %s is not inside his black inner line' % (jid, box))
            win = nat[y0:y1, x0:x1]
            save_atomic(to_img(win), os.path.join(ref, jid + '.png'))
            sb = (xs[x0], ys[y0], xs[x1], ys[y1])
            sc = im.crop(sb)
            save_atomic(sc, os.path.join(ref, jid + '@sheet.png'))
            save_atomic(sc.resize((88, 88), Image.LANCZOS), os.path.join(ref, jid + '@88.png'))
            save_atomic(sc.resize((44, 44), Image.LANCZOS), os.path.join(ref, jid + '@44.png'))
            ss = (xs[slot[0]], ys[slot[1]], xs[slot[2]], ys[slot[3]])
            save_atomic(im.crop(ss), os.path.join(ref, 'slot_' + jid + '.png'))
            w, h = x1 - x0, y1 - y0
            save_atomic(to_img(win).resize((w * 6, h * 6), Image.NEAREST), os.path.join(study, jid + '-x6.png'))
            crops['icons'][jid] = {'sheet': sheet, 'box': list(box), 'size': [w, h], 'slot': list(slot), 'sheetBox': list(sb), 'sheetSlot': list(ss), 'what': what}
            pal[jid] = kmeans(win, 16)
        s0, s1 = SHEETS[sheet][0][2], SHEETS[sheet][-1][2]
        rb = (xs[s0[0] - 2], ys[s0[1] - 2], xs[s1[2] + 2], ys[s1[3] + 2])
        row = im.crop(rb)
        save_atomic(row, os.path.join(ref, 'row-%s.png' % sheet))
        crops['grid'][sheet]['row'] = list(rb)
        # His row scaled so his art window is as big as ours (44 at 1x, 176 at 4x), for the sheet.
        ww = xs[SHEETS[sheet][0][1][2]] - xs[SHEETS[sheet][0][1][0]]
        for name, target in (('1x', 44), ('4x', 176)):
            k = target / ww
            save_atomic(row.resize((round(row.size[0] * k), round(row.size[1] * k)), Image.LANCZOS), os.path.join(ref, 'row-%s@%s.png' % (sheet, name)))
        crops['grid'][sheet]['rowScale'] = {'1x': 44 / ww, '4x': 176 / ww}
    write_atomic(json.dumps(crops, indent=1) + '\n', os.path.join(ref, 'crops.json'))
    write_atomic(json.dumps(pal, indent=1) + '\n', os.path.join(ref, 'palette.json'))
    print('wrote %d icons and their slots to %s' % (sum(len(SHEETS[k]) for k in srcs), ref))
    for s, g in crops['grid'].items():
        print('sheet %s: pitch %.4f x %.4f (spectrum %.4f x %.4f), phase %.2f %.2f, edge ratio %.2f %.2f, block spread %.2f' % (
            s, g['pitch'][0], g['pitch'][1], g['spectrumPitch'][0], g['spectrumPitch'][1], g['phase'][0], g['phase'][1], g['edgeRatio'][0], g['edgeRatio'][1], g['blockSpread']))


if __name__ == '__main__':
    main()
