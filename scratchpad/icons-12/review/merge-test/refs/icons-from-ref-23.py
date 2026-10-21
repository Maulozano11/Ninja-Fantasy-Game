"""Crops the owner's hotbar icon sheets 2 to 11 for the icon generator (tools/ui/ui-icons-23.ts).

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

or any of his later sheets by number (one staging folder per sheet gives one manifest per sheet):

  python3 -I tools/refs/icons-from-ref-23.py 8=docs/reference/icons-owner-reference-8.jpg <stagingDir>

Sheets 8 to 11 (2026-10-21, the clan abilities and the clan secrets) are the same 480x268 pixel art
at 4.1667x. Sheets 9 and 10 have four slots like sheets 4 and 7 (windows 98x96 of his pixels, at the
same places). Sheets 8 and 11 have three bigger slots: his windows are 127 to 144 of his pixels and
not square (sheet 8: 144x127, 128x127, 135x127; sheet 11: 134x130). The hotbar's window is square,
so for these the icon is the square part of his window (CROP below, in his pixels): his picture
keeps its proportions and only the strip of his ground at the sides is left out, the subject whole
(Swap alone keeps 139x127 and is squeezed 9% across: its ninjas fill his window). Sheet 8's Swap
has no black line on its right (his cyan art runs into the frame):
that side's check is skipped (OPEN). <id>.png, <id>@sheet.png and the @88/@44 files are of the
square part; crops.json keeps his whole window too.
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
    # Sheet 5 and 6 came smaller (1024x572: his pixels are 2.13 sheet pixels), sheet 7 as sheet 4.
    '5': [
        ('dash', (20, 86, 114, 181), (14, 80, 120, 187), 'Dash: a ninja sprinting with speed lines and an afterimage, on teal'),
        ('hide', (135, 86, 229, 181), (129, 80, 235, 187), 'Hide: a ninja with red eyes melting into violet smoke'),
        ('more', (251, 86, 344, 181), (245, 80, 350, 187), 'More actions: a glowing scroll with a gold cross and runes, on green'),
        ('end_turn', (367, 86, 460, 181), (361, 80, 466, 187), 'End turn: an hourglass of red sand among embers'),
    ],
    '6': [
        ('disengage', (14, 82, 112, 179), (8, 76, 118, 185), 'Disengage: a ninja leaping back from a sword slash, a white crescent, on teal'),
        ('crouch', (132, 82, 230, 179), (126, 76, 236, 185), 'Crouch: a ninja crouched low, a hand on the ground, in brown dust'),
        ('jump', (250, 82, 348, 179), (244, 76, 354, 185), 'Jump: a ninja leaping high against a bright blue sky'),
        ('focus', (368, 82, 466, 179), (362, 76, 472, 185), 'Focus: a ninja meditating cross-legged in a violet aura with stars'),
    ],
    '7': [
        ('shove', (14, 83, 112, 179), (8, 77, 118, 185), 'Shove: a ninja shoving a foe, a burst of impact, on orange'),
        ('trip', (132, 83, 230, 179), (126, 77, 236, 185), 'Trip: a ninja sweeping a kick that throws a foe off his feet, in dust'),
        ('stabilize', (250, 83, 348, 179), (244, 77, 354, 185), 'Heal: a ninja healing a fallen ally with green chakra'),
        ('flee', (368, 83, 466, 179), (362, 77, 472, 185), 'Escape: a ninja running into a bright doorway of light, on blue'),
    ],
    # Sheets 8 to 11 (2026-10-21): the clan abilities (Ryusei, Northstar, Mirai, Koton) and the clan
    # secrets. Sheets 8 and 11 have three bigger slots, sheets 9 and 10 four as sheet 7.
    '8': [
        ('ryusei_swap', (14, 64, 158, 191), (8, 58, 165, 198), 'Swap (Intercambio): two ninjas trading places through a violet and cyan vortex, on cyan'),
        ('northstar_command', (179, 64, 307, 191), (172, 58, 313, 198), 'Command (Comando): a glowing red eye in a red ring with a four-pointed flare, embers, on deep red'),
        ('northstar_submission', (331, 64, 466, 191), (324, 58, 472, 198), 'Submission (Sumision): a red four-pointed star over a kneeling figure bound by chains, on crimson'),
    ],
    '9': [
        ('mirai_evasion', (14, 83, 112, 179), (8, 77, 118, 185), 'Premonition (Premonicion): a red eye over a ninja dodging, his ghost after-image with a sword behind'),
        ('koton_block', (132, 83, 230, 179), (126, 77, 236, 185), 'Koton Block (Bloque Koton): a steel cube with glowing cyan circuits smashing into the ground'),
        ('koton_wall', (250, 83, 348, 179), (244, 77, 354, 185), 'Koton Wall (Muro Koton): a riveted steel wall rising, sparks where a block slots in'),
        ('ryusei_warp', (368, 83, 466, 179), (362, 77, 472, 185), 'Warp Strike (Golpe Warp): a ninja bursting out of a blue portal behind his thrown kunai, on violet'),
    ],
    '10': [
        ('dragon_fire_bomb', (14, 83, 112, 179), (8, 77, 118, 185), 'Dragon Flame (Llama Dragon): three fire dragon heads roaring in flames'),
        ('wood_dragon_jutsu', (132, 83, 230, 179), (126, 77, 236, 185), 'Wood Dragon (Dragon Madera): a dragon of twisted wood and leaves, on green'),
        ('adamantine_sealing_chains', (250, 83, 348, 179), (244, 77, 354, 185), 'Chains (Cadenas): two crossed gold chains with spear tips and gold runes, on magenta'),
        ('taki_sixtyfour_palms', (368, 83, 466, 179), (362, 77, 472, 185), '64 Palms (64 Palmas): a ninja in stance on a glowing trigram circle, open palms whirling round him'),
    ],
    '11': [
        ('shadow_clone', (16, 61, 150, 191), (9, 54, 157, 198), 'Shadow Clone (Clon Sombra): a ninja making the hand sign, his clone stepping out of smoke, on violet'),
        ('dragon_fire_stream', (173, 61, 307, 191), (166, 54, 314, 198), 'Dragon Fire (Fuego Dragon): a roaring dragon head of fire, flames and dark smoke'),
        ('water_dragon_suiryuudan', (330, 61, 464, 191), (323, 54, 471, 198), 'Water Dragon (Dragon Agua): a dragon of water rising in an S out of the waves, on navy'),
    ],
}

# Sheets 8 and 11: the square part of his window that becomes the icon (his pixels, x1/y1 exclusive).
# Chosen on his pixels so the subject stays whole: what is left out is his ground at the sides (the
# chains of Submission run on past the edge as in his picture). Swap is the one exception: his two
# ninjas span 138 of his 144 columns (their elbows 4 and 140), so only his plain cyan at the sides
# goes (139x127) and the rest is squeezed 9% across, rather than cut through their elbows.
CROP = {
    'ryusei_swap': (17, 64, 156, 191),
    'northstar_command': (180, 64, 307, 191),
    'northstar_submission': (335, 64, 462, 191),
    'shadow_clone': (18, 61, 148, 191),
    'dragon_fire_stream': (175, 61, 305, 191),
    'water_dragon_suiryuudan': (332, 61, 462, 191),
}

# Sides of a window with no black line (his art runs up to the frame there).
OPEN = {'ryusei_swap': ('right',)}


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
    """The strongest period (in sheet pixels, between 1.8 and 12) of an edge-energy profile."""
    g = g - g.mean()
    n = 1 << 14
    f = np.abs(np.fft.rfft(g, n=n))
    fr = np.fft.rfftfreq(n)
    m = (fr > 1 / 12) & (fr < 1 / 1.8)
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
        # His 480x268 pixel art scaled up evenly: 2000x1116 (sheets 2 to 4), 1024x572 (sheet 5).
        if abs(im.size[0] / NATIVE[0] - im.size[1] / NATIVE[1]) > 0.02:
            sys.exit('expected his 480x268 picture scaled up evenly, got %dx%d (%s)' % (im.size + (path,)))
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
            # each side is dark (except a side listed in OPEN).
            sides = {'left': L[y0:y1, x0 - 1], 'right': L[y0:y1, x1], 'top': L[y0 - 1, x0:x1], 'bottom': L[y1, x0:x1]}
            dark = 45 if sheet in ('5', '6') else 30
            for side, s in sides.items():
                if side in OPEN.get(jid, ()):
                    continue
                if np.mean(s < dark) < (0.85 if sheet in ('5', '6') else 0.9):
                    sys.exit('%s: the window %s is not inside his black inner line (%s)' % (jid, box, side))
            window = box
            if jid in CROP:
                # The square part of his window (sheets 8 and 11).
                c = CROP[jid]
                if not (x0 <= c[0] < c[2] <= x1 and y0 <= c[1] < c[3] <= y1) or abs((c[2] - c[0]) / (c[3] - c[1]) - 1) > 0.1:
                    sys.exit('%s: the crop %s is not (within 10%%) a square inside his window %s' % (jid, c, box))
                box = c
                x0, y0, x1, y1 = box
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
            if window != box:
                crops['icons'][jid]['window'] = list(window)
            if jid in OPEN:
                crops['icons'][jid]['open'] = list(OPEN[jid])
            pal[jid] = kmeans(win, 16)
        s0, s1 = SHEETS[sheet][0][2], SHEETS[sheet][-1][2]
        rb = (xs[s0[0] - 2], ys[s0[1] - 2], xs[s1[2] + 2], ys[s1[3] + 2])
        row = im.crop(rb)
        save_atomic(row, os.path.join(ref, 'row-%s.png' % sheet))
        crops['grid'][sheet]['row'] = list(rb)
        # His row scaled so his art window is as big as ours (44 at 1x, 176 at 4x), for the sheet.
        fb = CROP.get(SHEETS[sheet][0][0], SHEETS[sheet][0][1])
        ww = xs[fb[2]] - xs[fb[0]]
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
