"""Crops the owner's first hotbar skill icons and his slot frame for the icon generator.

His picture (docs/reference/icons-owner-reference-1.jpg, 1024x765) shows four skill slots in a
row. Left to right: Fireball, Kirin, Great Fire Annihilation, Water Wall. Each slot is his dark
steel frame (gold inner line, gold corner brackets with steel rivets); his painting fills the
window inside the gold line (201x206 of his pixels, measured between his black inner lines).

For each icon (named by jutsu id) this writes:

  <out>/ref/<id>.png          his art window, as cropped (no resampling)
  <out>/ref/<id>@88.png       the crop scaled to 88x88 (Lanczos), for the comparison sheet
  <out>/ref/<id>@44.png       the crop scaled to 44x44 (Lanczos), for the comparison sheet
  <out>/ref/slot_<id>.png     his whole slot, frame included
  <out>/ref/row.png           his row of four slots, for the comparison sheet
  <out>/ref/study/*-x4.png    crops at 4x (nearest), to study the details
  <out>/ref/crops.json        every box
  <out>/ref/palette.json      the main colours of each icon (k-means) and his frame colours
                              (steel bar, gold line, bracket, rivet), measured on all four slots

Every file is written under a temporary name and then renamed. Run with python3 -I:

  python3 -I tools/refs/icons-from-ref.py docs/reference/icons-owner-reference-1.jpg <stagingDir>

The generator (tools/ui/ui-icons.ts) reads <stagingDir>/ref/<id>.png to build the icons.
"""

import json
import os
import sys

import numpy as np
from PIL import Image

# Jutsu id, his art window (x0, y0, x1, y1; x1/y1 exclusive), his whole slot box, what it shows.
ICONS = [
    ('fireball_goukakyu', (33, 276, 234, 482), (14, 256, 254, 501), 'Fireball: a fire spiral with a white-hot core and sparks'),
    ('kirin_thunder', (285, 276, 486, 482), (266, 256, 506, 501), 'Kirin: a roaring lightning dragon head, bolts all around'),
    ('great_fire_annihilation', (537, 276, 738, 482), (518, 256, 758, 501), 'Great Fire Annihilation: a curling wave of fire with embers'),
    ('water_shield_suijinheki', (789, 276, 990, 482), (770, 256, 1010, 501), 'Water Wall: a cresting wave with foam'),
]

# His row of four slots (x0, y0, x1, y1), with a few pixels of his background around it.
ROW = (12, 254, 1012, 503)


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


def frame_colours(im):
    """His frame colours, averaged over the four slots (each slot measured at the same offsets)."""
    a = np.asarray(im).astype(float)
    out = {}
    lefts = [ic[2][0] for ic in ICONS]
    # Straight runs of the frame, away from the corner brackets: (name, axis, offsets, span).
    # Offsets are from the slot's left x (for columns) or absolute y (for rows).
    runs = [
        ('steel_top_light', 'row', [261, 262]),
        ('steel_top_mid', 'row', [264, 265, 266, 267]),
        ('gold_top', 'row', [272, 273]),
        ('gold_bottom', 'row', [484, 485]),
        ('steel_bottom_mid', 'row', [490, 491, 492, 493]),
        ('steel_bottom_light', 'row', [495, 496]),
        ('steel_left_light', 'col', [4, 5]),
        ('steel_left_mid', 'col', [7, 8, 9, 10]),
        ('gold_left', 'col', [15, 16]),
        ('gold_right', 'col', [222, 223]),
        ('steel_right_mid', 'col', [227, 228, 229, 230]),
        ('steel_right_light', 'col', [232, 233]),
    ]
    for name, axis, offs in runs:
        vals = []
        for x0 in lefts:
            for o in offs:
                if axis == 'row':
                    vals.append(a[o, x0 + 70:x0 + 170].reshape(-1, 3))
                else:
                    vals.append(a[330:430, x0 + o].reshape(-1, 3))
        v = np.concatenate(vals)
        out[name] = hexc(np.median(v, axis=0))
    # Bracket gold and rivet steel: the top-left corner of each slot (k-means of the gold pixels
    # and of the grey pixels inside the corner block).
    gold, grey = [], []
    for x0 in lefts:
        c = a[259:285, x0 + 2:x0 + 30].reshape(-1, 3)
        r, g, b = c[:, 0], c[:, 1], c[:, 2]
        isgold = (r > 110) & (r > b + 30) & (g > b + 15)
        isgrey = (np.abs(r - b) < 30) & (np.abs(r - g) < 25) & (r > 70)
        gold.append(c[isgold])
        grey.append(c[isgrey])
    out['bracket'] = kmeans(np.concatenate(gold), 4)
    out['rivet'] = kmeans(np.concatenate(grey), 3)
    return out


def main():
    if len(sys.argv) != 3:
        sys.exit('usage: python3 -I tools/refs/icons-from-ref.py <icons-owner-reference-1.jpg> <stagingDir>')
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert('RGB')
    if im.size != (1024, 765):
        sys.exit('expected his 1024x765 picture, got %dx%d' % im.size)
    ref = os.path.join(out, 'ref')
    study = os.path.join(ref, 'study')
    os.makedirs(study, exist_ok=True)
    crops, pal = {}, {}
    for jid, box, slot, what in ICONS:
        c = im.crop(box)
        w, h = c.size
        save_atomic(c, os.path.join(ref, jid + '.png'))
        save_atomic(c.resize((88, 88), Image.LANCZOS), os.path.join(ref, jid + '@88.png'))
        save_atomic(c.resize((44, 44), Image.LANCZOS), os.path.join(ref, jid + '@44.png'))
        s = im.crop(slot)
        save_atomic(s, os.path.join(ref, 'slot_' + jid + '.png'))
        save_atomic(c.resize((w * 4, h * 4), Image.NEAREST), os.path.join(study, jid + '-x4.png'))
        crops[jid] = {'box': list(box), 'size': [w, h], 'slot': list(slot), 'what': what}
        pal[jid] = kmeans(np.asarray(c), 12)
    # His whole row of four slots, for the comparison sheet.
    save_atomic(im.crop(ROW), os.path.join(ref, 'row.png'))
    first = im.crop(ICONS[0][2])
    save_atomic(first.crop((0, 0, 60, 60)).resize((360, 360), Image.NEAREST), os.path.join(study, 'frame-corner-tl-x6.png'))
    save_atomic(first.crop((first.size[0] - 60, first.size[1] - 60, first.size[0], first.size[1])).resize((360, 360), Image.NEAREST), os.path.join(study, 'frame-corner-br-x6.png'))
    pal['frame'] = frame_colours(im)
    write_atomic(json.dumps({'source': os.path.basename(src), 'icons': crops}, indent=1) + '\n', os.path.join(ref, 'crops.json'))
    write_atomic(json.dumps(pal, indent=1) + '\n', os.path.join(ref, 'palette.json'))
    print('wrote %d icons and their slots to %s' % (len(ICONS), ref))


if __name__ == '__main__':
    main()
