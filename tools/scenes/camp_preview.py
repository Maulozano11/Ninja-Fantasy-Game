"""Composition preview of the night camp: the painted layers, the props placed as scene.json lists them
and the party around the fire, every day-lit sprite graded to the night (moon, firelight, rims).

    python3 tools/scenes/camp_preview.py --scene <layers dir> --sprites <world root> --party <dir> --out <png>

<world root> holds the campsite group (campsite/manifest.json); landmarks come from
src/assets/world/landmarks (read only). <party dir> is what party_sprites.ts wrote (party.json).
Writes <png> at 1x and <png minus .png>-2x.png (nearest neighbour), whole (temp file, then rename).

The grade is the one the game should copy for sprites in this scene:
  1. multiply by the moon (cool blue) and add a little blue ambient;
  2. firelight by distance from the flames, in 4 quantised levels (scene_kit.warm_color);
  3. a warm rim on silhouette edges that face the fire (within its reach), a faint cool rim on
     edges that face the moon (upper right).
Flames, embers and lit lantern windows are left as they are (emissive).
"""
import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import WARM_LEVELS, noise, warm_color  # noqa: E402

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MOON_MUL = np.array([0.33, 0.41, 0.6])
MOON_ADD = np.array([4.0, 8.0, 20.0])
RIM_WARM = np.array([255.0, 178.0, 104.0])
RIM_COOL = np.array([128.0, 156.0, 192.0])


def load_sheet_frame(root, group, name, anim=None, frame=0):
    d = os.path.join(root, group)
    man = json.load(open(os.path.join(d, 'manifest.json')))['sprites'][name]
    sheet = np.array(Image.open(os.path.join(d, man['file'])).convert('RGBA'))
    anims = man['anims']
    a = anims[anim] if anim and anim in anims else list(anims.values())[0]
    fw, fh = man['frameW'], man['frameH']
    fr = frame % a['frames']
    img = sheet[a['row'] * fh:(a['row'] + 1) * fh, fr * fw:(fr + 1) * fw]
    return img, man['anchor']


def emissive_mask(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 140) & (r > 2.0 * b) & (r > 1.15 * g)


def grade(img, x0, y0, ground_y, fire, flame, emissive=False, seed=0):
    """Night grade for a sprite whose top-left lands at (x0, y0) and that stands at ground_y."""
    rgba = img.astype(float)
    a = rgba[..., 3]
    op = a > 0
    rgb = rgba[..., :3]
    h, w = op.shape
    ys, xs = np.mgrid[0:h, 0:w]
    X = xs + x0
    Y = ys + y0
    keep = emissive_mask(rgb) & op if emissive else np.zeros_like(op)
    c = rgb * MOON_MUL + MOON_ADD
    # Firelight: distance across the ground (57 px/m across, 38 px/m deep) and up from it.
    height_m = np.maximum(0, (ground_y - Y)) / 57
    flame_h = (fire[1] - flame[1]) / 57
    d = np.sqrt(((X - fire[0]) / 57) ** 2 + ((ground_y - fire[1]) / 38) ** 2 + ((height_m - flame_h) * 0.7) ** 2)
    wv = np.clip(1.4 / (1 + (d / 1.8) ** 2) - 0.1, 0, 1)
    # Clean bands (no dither on sprites): the rim below carries the direction of the light.
    lv = np.clip(np.floor(wv * 2.7 + 0.3), 0, 3).astype(int)
    out = c.copy()
    for k in range(1, 4):
        sel = lv == k
        if sel.any():
            out[sel] = warm_color(c[sel], WARM_LEVELS[k])
    # Rims: a silhouette pixel whose neighbour toward the fire (or the moon) is empty.
    def empty_at(dx, dy):
        e = np.ones_like(op)
        ys0, ys1 = max(0, -dy), h - max(0, dy)
        xs0, xs1 = max(0, -dx), w - max(0, dx)
        e[ys0:ys1, xs0:xs1] = ~op[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
        return e
    fdx = np.sign(fire[0] - X).astype(int)
    rim_w = np.zeros_like(op)
    for sx in (-1, 1):
        e = empty_at(sx, 0) | empty_at(sx, -1)
        rim_w |= e & (fdx == sx)
    rim_w &= op & (wv > 0.12)
    out[rim_w] = out[rim_w] * 0.45 + RIM_WARM * (0.35 + 0.4 * wv[rim_w, None])
    rim_c = op & empty_at(1, -1) & ~rim_w
    out[rim_c] = out[rim_c] * 0.75 + RIM_COOL * 0.25
    out[keep] = rgb[keep]
    res = np.zeros_like(rgba)
    res[..., :3] = np.clip(out, 0, 255)
    res[..., 3] = a
    return res.astype(np.uint8)


def paste(base, img, x0, y0, flip=False):
    if flip:
        img = img[:, ::-1]
    H, W = base.shape[:2]
    h, w = img.shape[:2]
    bx0, by0 = max(0, x0), max(0, y0)
    bx1, by1 = min(W, x0 + w), min(H, y0 + h)
    if bx1 <= bx0 or by1 <= by0:
        return
    src = img[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0].astype(float)
    dst = base[by0:by1, bx0:bx1].astype(float)
    sa = src[..., 3:4] / 255
    da = dst[..., 3:4] / 255
    oa = sa + da * (1 - sa)
    rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    base[by0:by1, bx0:bx1, :3] = np.round(rgb).astype(np.uint8)
    base[by0:by1, bx0:bx1, 3] = np.round(oa[..., 0] * 255).astype(np.uint8)


def layer(path):
    return np.array(Image.open(path).convert('RGBA'))


def air_glow(base, flame, seed=5):
    """Warm light in the air round the flames, in three quantised steps (added, not painted)."""
    H, W = base.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    d = np.hypot((xs - flame[0]) / 57, (ys - flame[1]) / 50)
    g = np.clip(1.15 / (1 + (d / 0.9) ** 2) - 0.12, 0, 1) + (noise(xs, ys, 3.2, seed) - 0.5) * 0.12
    lv = np.clip(np.floor(g * 3), 0, 3)
    add = np.array([46.0, 22.0, 4.0])
    rgb = base[..., :3].astype(float) + lv[..., None] / 3 * add
    base[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)


def save_whole(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    img.save(tmp, format='PNG')
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scene', required=True)
    ap.add_argument('--sprites', required=True)
    ap.add_argument('--party', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--fire-frame', type=int, default=3)
    ap.add_argument('--no-grade', action='store_true')
    a = ap.parse_args()
    sj = json.load(open(os.path.join(a.scene, 'scene.json')))
    W, H = sj['size']
    fire = (sj['fire']['x'], sj['fire']['y'])
    flame = (sj['fire']['x'], sj['fire']['flameY'])
    base = np.zeros((H, W, 4), np.uint8)
    for name in sj['layers']['back']:
        paste(base, layer(os.path.join(a.scene, name)), 0, 0)
    roots = {'landmarks': os.path.join(REPO, 'src', 'assets', 'world')}
    items = []
    for k, p in enumerate(sj['props']):
        root = roots.get(p['group'], a.sprites)
        frame = a.fire_frame if p['name'] in ('campfire_large', 'smoke_tall') else 1 if p['name'] == 'stone_lantern' else 0
        img, anc = load_sheet_frame(root, p['group'], p['name'], p.get('anim'), frame)
        flip = p.get('flip', False)
        ax = img.shape[1] - 1 - anc[0] if flip else anc[0]
        x0, y0 = p['x'] - ax, p['y'] - anc[1]
        items.append((p['y'] + p.get('z', 0), k, img, x0, y0, p['y'], flip, p['name'] in ('campfire_large', 'stone_lantern')))
    party = json.load(open(os.path.join(a.party, 'party.json')))
    for k, (m, spot) in enumerate(zip(party, sj['partySpots'])):
        img = np.array(Image.open(os.path.join(a.party, m['file'])).convert('RGBA'))
        flip = spot['facing'] == 'left'
        fx = img.shape[1] - 1 - m['feet'][0] if flip else m['feet'][0]
        x0, y0 = spot['x'] - fx, spot['y'] - m['feet'][1]
        items.append((spot['y'] + 0.5, 100 + k, img, x0, y0, spot['y'], flip, False))
    items.sort(key=lambda t: (t[0], t[1]))
    for _, k, img, x0, y0, gy, flip, emis in items:
        im = img[:, ::-1] if flip else img
        if not a.no_grade:
            im = grade(im, x0, y0, gy, fire, flame, emissive=emis, seed=k)
        paste(base, im, x0, y0)
    if not a.no_grade:
        air_glow(base, flame)
    for name in sj['layers']['front']:
        paste(base, layer(os.path.join(a.scene, name)), 0, 0)
    out = Image.fromarray(base, 'RGBA').convert('RGB')
    save_whole(out, a.out)
    save_whole(out.resize((W * 2, H * 2), Image.NEAREST), a.out.replace('.png', '-2x.png'))
    print('wrote', a.out)


if __name__ == '__main__':
    main()
