"""Crops every ornament of the owner's battle UI picture for the UI kit.

His picture (docs/reference/ui-battle-owner-reference.jpg) is 1024x576; the game window is
1600x900, so his pieces scale by 1600/1024 = 1.5625. For each box below this writes:

  <out>/ref/<name>.png          his pixels, as cropped
  <out>/ref/<name>@ours.png     the crop scaled to our screen size (Lanczos), for comparisons
  <out>/ref/study/<name>-x6.png the crop at 6x (nearest), to study the ornaments
  <out>/ref/crops.json          every box, its size here and at our scale
  <out>/ref/palette.json        the main colors of each crop (k-means), to pick the palette

Every file is written under a temporary name and then renamed. Run with python3 -I:

  python3 -I tools/refs/ui-from-ref.py docs/reference/ui-battle-owner-reference.jpg <stagingDir>

The generator (tools/ui/ui-battle-kit.ts) reads <stagingDir>/ref/*@ours.png for its comparison
sheet; its pieces do not depend on these files.
"""

import json
import os
import sys

import numpy as np
from PIL import Image

SCALE = 1600 / 1024

# name: (x0, y0, x1, y1) in his picture (x1, y1 exclusive), and what the piece is.
BOXES = {
    'top_centre': ((290, 0, 720, 100), 'top centre: chains, target plaque, round medallion, turn row'),
    'target_bar': ((386, 18, 652, 46), 'chained target plaque with the red bar'),
    'target_end': ((386, 18, 420, 46), 'left end of the target plaque'),
    'target_end_right': ((618, 18, 656, 46), 'right end of the target plaque (pointed channel end, spear tip)'),
    'target_name': ((430, 6, 606, 25), 'target name over the plaque'),
    'chain_left': ((302, 0, 364, 72), 'chain from the top edge to the round medallion'),
    'chain_right': ((612, 0, 686, 74), 'chain from the top edge to the end of the turn row'),
    'chain_sag': ((462, 74, 560, 100), 'chain hanging under the turn row'),
    'round_medallion': ((354, 38, 407, 95), 'RONDA medallion with four gems'),
    'init_active': ((406, 49, 441, 83), 'turn row: the acting unit (gold square)'),
    'init_ally': ((438, 49, 463, 81), 'turn row: an ally (blue base)'),
    'init_enemy': ((540, 49, 565, 81), 'turn row: an enemy (red base)'),
    'init_end': ((588, 53, 624, 80), 'turn row: link and the empty end circle'),
    'minimap': ((897, 0, 1024, 132), 'round minimap frame'),
    'bar_left': ((215, 485, 263, 558), 'action bar: left end with gem studs'),
    'bar_right': ((768, 485, 808, 558), 'action bar: right end'),
    'bar': ((215, 428, 808, 576), 'action bar, whole'),
    'crest': ((372, 428, 692, 495), 'raised crest: medallion, HP strip, chakra strip, scrolls'),
    'medallion_active': ((478, 428, 556, 495), 'acting character medallion'),
    'medallion_crown_left': ((440, 436, 500, 476), 'left side of the medallion crown: big dark boss with its twin highlight, third boss on the rail, tail'),
    'hp_strip': ((398, 466, 506, 492), 'HP strip (red bar) left of the medallion'),
    'chakra_strip': ((536, 466, 642, 492), 'chakra strip (gems) right of the medallion'),
    'scroll_left': ((370, 452, 414, 494), 'scrollwork at the left end of the crest'),
    'scroll_right': ((620, 452, 692, 494), 'scrollwork at the right end of the crest'),
    'chakra_gems': ((554, 472, 613, 491), 'chakra gems red, orange, blue'),
    'skill_slot': ((354, 497, 397, 548), 'skill slot with its number tag'),
    'skill_tag': ((364, 498, 380, 512), 'number tag'),
    'item_slot': ((592, 503, 636, 548), 'greyed item slot with label and count'),
    'item_badge': ((621, 532, 637, 548), 'blue count badge'),
    'pips': ((236, 505, 322, 531), 'action / bonus / reaction pips'),
    'move_bar': ((230, 529, 364, 545), 'movement bar and its numbers'),
    'lower_plaque': ((325, 549, 707, 576), 'plaque under the bar with corner brackets'),
    'lower_end': ((325, 549, 380, 576), 'left bracket of the lower plaque'),
    'lower_end_right': ((652, 549, 707, 576), 'right bracket of the lower plaque'),
    'party_frame': ((5, 518, 48, 574), 'party portrait frame with HP and second bar'),
    'party_frames': ((3, 494, 172, 576), 'all four party frames and the small button'),
    'small_button': ((8, 497, 28, 517), 'small square button above the party'),
    'gem_corner_red': ((217, 484, 234, 501), 'red gem stud on the bar corner'),
    'gem_corner_green': ((217, 542, 234, 559), 'green gem stud on the bar corner'),
    'bar_corner_bottom': ((215, 536, 275, 562), 'bottom-left bar corner: green gem, lace and the scroll arm along the rail'),
    'bar_end_gem': ((784, 484, 808, 510), 'red gems at the bar top right'),
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


def kmeans(px, k, iters=25):
    px = px.reshape(-1, 3).astype(float)
    lum = px @ np.array([0.3, 0.59, 0.11])
    order = np.argsort(lum)
    c = np.array([px[order[int((i + 0.5) / k * len(order))]] for i in range(k)])
    for _ in range(iters):
        a = ((px[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            if (a == j).any():
                c[j] = px[a == j].mean(0)
    a = ((px[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
    out = []
    for j in np.argsort(c @ np.array([0.3, 0.59, 0.11])):
        out.append({'hex': '#%02x%02x%02x' % tuple(int(round(v)) for v in c[j]), 'share': round(float((a == j).mean()), 3)})
    return out


def main():
    if len(sys.argv) != 3:
        sys.exit('usage: python3 -I tools/refs/ui-from-ref.py <ui-battle-owner-reference.jpg> <stagingDir>')
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert('RGB')
    if im.size != (1024, 576):
        sys.exit('expected his 1024x576 picture, got %dx%d' % im.size)
    ref = os.path.join(out, 'ref')
    study = os.path.join(ref, 'study')
    os.makedirs(study, exist_ok=True)
    crops, pal = {}, {}
    for name, (box, what) in BOXES.items():
        c = im.crop(box)
        w, h = c.size
        ow, oh = round(w * SCALE), round(h * SCALE)
        save_atomic(c, os.path.join(ref, name + '.png'))
        save_atomic(c.resize((ow, oh), Image.LANCZOS), os.path.join(ref, name + '@ours.png'))
        save_atomic(c.resize((w * 6, h * 6), Image.NEAREST), os.path.join(study, name + '-x6.png'))
        crops[name] = {'box': list(box), 'size': [w, h], 'ours': [ow, oh], 'oursAt': [round(box[0] * SCALE), round(box[1] * SCALE)], 'what': what}
        pal[name] = kmeans(np.asarray(c), 6)
    write_atomic(json.dumps({'source': os.path.basename(src), 'scale': SCALE, 'crops': crops}, indent=1) + '\n', os.path.join(ref, 'crops.json'))
    write_atomic(json.dumps(pal, indent=1) + '\n', os.path.join(ref, 'palette.json'))
    print('wrote %d crops to %s' % (len(BOXES), ref))


if __name__ == '__main__':
    main()
