"""Cuts the owner's two battle sprite sheets of the fire avatar into the game's four avatar images.

    python3 -I tools/refs/fire-avatar-sprites-from-ref.py [outDir]

    in:  docs/reference/fire-avatar-sprite-owner-reference.png           (level 9, both stances)
         docs/reference/fire-avatar-colossal-sprite-owner-reference.png  (level 12, both stances)
    out: <outDir>/{shield,spear,shield_plus,spear_plus}.png + manifest.json
         (default outDir: src/assets/battle_avatar)

His pictures are copied as they are: each sheet holds the two stances side by side on magenta, the
shield stance on the left (the spear upright, the shield forward) and the spear stance on the right
(the spear raised to throw). Every connected piece of the picture goes to the stance its middle lies
in. The magenta is taken out by un-mixing it: a pixel half magenta keeps its fire colour with half
alpha, so the flame's soft edge stays soft with no pink rim. Nothing is redrawn.

Sizes: the level 9 avatar stands 3.3 times the ninja and the improved one 5 times (the owner,
2026-10-29). The game draws a character about 100 px tall at 1x and zooms to 2x, so the level 9
images are kept at 660 px tall (2x of 330) and the improved ones at their own height (about 800 px,
drawn 500 px at 1x). The manifest gives each image's size and where the root of its fire column is
(the middle of its lowest rows): the game stands that point on the ninja's feet, so the avatar rises
from them. Deterministic: the same sheets give the same bytes.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'src/assets/battle_avatar')
SHEETS = [
    ('docs/reference/fire-avatar-sprite-owner-reference.png', '', 660, 3.3),
    ('docs/reference/fire-avatar-colossal-sprite-owner-reference.png', '_plus', None, 5.0),
]


def unmix(rgb):
    """Alpha and colour with the magenta taken out (the backdrop is about (250, 3, 248))."""
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # how much magenta is in the pixel: fire (red, orange, yellow, white-hot) never has more blue
    # than green, magenta has all blue and no green; the blue standing over the green is the magenta
    m = np.clip((b - g) / 245.0, 0, 1)
    alpha = 1 - m
    bg = np.array([250, 3, 248], np.float32)
    col = (a - bg * m[..., None]) / np.maximum(alpha, 1e-3)[..., None]
    col = np.clip(col, 0, 255)
    alpha = np.where(alpha < 0.06, 0, alpha)
    return col, alpha


def stances(path):
    rgb = np.array(Image.open(os.path.join(ROOT, path)).convert('RGB'))
    col, alpha = unmix(rgb)
    lab, n = ndimage.label(alpha > 0.35)
    mid = rgb.shape[1] / 2
    centres = ndimage.center_of_mass(alpha > 0.35, lab, range(1, n + 1))
    side = np.zeros(n + 1, np.int8)
    for j, (_, cx) in enumerate(centres, 1):
        side[j] = 0 if cx < mid else 1
    # the faint edge pixels (alpha under the threshold) go with the nearest piece
    near = ndimage.distance_transform_edt(lab == 0, return_distances=False, return_indices=True)
    owner = side[lab[near[0], near[1]]]
    out = []
    for s in (0, 1):
        a = np.where(owner == s, alpha, 0)
        q = np.dstack([col, a * 255]).round().astype(np.uint8)
        im = Image.fromarray(q, 'RGBA')
        out.append(im.crop(im.getbbox()))
    return out


def root_x(im):
    """The middle of the fire column's root: the solid pixels of the lowest 7% of rows."""
    a = np.array(im)[..., 3] > 128
    h = a.shape[0]
    ys, xs = np.nonzero(a[int(h * 0.93):])
    return int(np.median(xs))


def shrink(im, height):
    if height is None or im.height <= height:
        return im
    w = round(im.width * height / im.height)
    # premultiplied, so the soft edges don't darken
    q = np.array(im).astype(np.float32)
    q[..., :3] *= q[..., 3:4] / 255
    pm = Image.fromarray(q.round().astype(np.uint8), 'RGBA').resize((w, height), Image.BOX)
    r = np.array(pm).astype(np.float32)
    r[..., :3] = np.where(r[..., 3:4] > 0, r[..., :3] * 255 / np.maximum(r[..., 3:4], 1), 0)
    return Image.fromarray(np.clip(r, 0, 255).round().astype(np.uint8), 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for path, suffix, height, times in SHEETS:
        for name, im in zip(('shield', 'spear'), stances(path)):
            im = shrink(im, height)
            key = name + suffix
            im.save(os.path.join(OUT, key + '.png'), optimize=True)
            manifest[key] = {'w': im.width, 'h': im.height, 'rootX': root_x(im), 'times': times}
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
        f.write('\n')
    print(json.dumps(manifest))


main()
