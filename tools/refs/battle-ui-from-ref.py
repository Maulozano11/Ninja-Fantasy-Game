"""Cut the owner's battle UI sheet (docs/reference/battle-ui-sheet-owner-reference.png, card 9 of
tools/refs/template/TARJETA_DE_PROMPT.md) into named pieces with alpha, his pixels as they are.

  python3 -I tools/refs/battle-ui-from-ref.py <out_dir>

Magenta is keyed out (with the pink spill on soft edges pulled back to the piece's own colour);
each piece is found as a connected blob and named by its place on the sheet (row by row, as the
card asked for them). Nothing is redrawn or rescaled: the game or the mocks scale them down.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'docs/reference/battle-ui-sheet-owner-reference.png'

NAMES = [
    'frame_big', 'frame_narrow', 'spark_a', 'spark_b',
    'gem_red', 'gem_red_hover', 'gem_red_pressed', 'gem_off',
    'gem_blue', 'gem_blue_hover', 'gem_blue_pressed', 'gem_off_2',
    'gem_gold',
    'slot', 'slot_hover', 'slot_pressed', 'slot_off', 'slot_empty',
    'icon_sacrifice', 'icon_retreat', 'icon_death', 'icon_interpose', 'icon_deflect', 'icon_eye',
    'icon_kawarimi', 'icon_reaction', 'icon_turn', 'icon_hook',
    'card_blue', 'card_red', 'card_dark', 'plate_result', None, 'portrait_frame',
    'plate_party', 'plate_enemy', 'badge_turn', 'diamond_init', 'diamond_done',
    'bar_empty', 'save_off_1', 'save_off_2', 'save_off_3', 'save_off_g1', 'save_off_g2', 'save_off_g3',
    'bar_chakra', 'bar_hp', 'save_red_1', 'save_red_2', 'save_red_3', 'save_green_1', 'save_green_2', 'save_green_3',
]


def main(out):
    os.makedirs(out, exist_ok=True)
    im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    # how magenta a pixel is: red and blue high together, green low
    m = np.clip((np.minimum(r, b) - g - 60) / 120.0, 0, 1)
    hard = (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 90)
    alpha = np.where(hard, 0.0, 1.0 - m)
    fg = alpha > 0.05
    lab, _ = ndimage.label(ndimage.binary_closing(fg, iterations=3))
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if (y1 - y0) * (x1 - x0) >= 150:
            boxes.append((y0, x0, y1, x1, i + 1))
    boxes.sort(key=lambda q: (q[0] // 40, q[1]))
    assert len(boxes) == len(NAMES), (len(boxes), len(NAMES))
    # spill: where a pixel is part magenta, take the magenta back out of its colour
    a = alpha[..., None]
    mag = np.array([255, 0, 255])
    rgb = np.where(a > 0.05, (im - (1 - a) * mag) / np.maximum(a, 0.05), 0)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    manifest = {}
    for name, (y0, x0, y1, x1, k) in zip(NAMES, boxes):
        if not name:
            continue
        # only this piece's own blob: a neighbour's edge inside the box stays out
        piece = rgba[y0:y1, x0:x1].copy()
        piece[..., 3] = np.where(lab[y0:y1, x0:x1] == k, piece[..., 3], 0)
        Image.fromarray(piece).save(f'{out}/{name}.png')
        manifest[name] = {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}
    json.dump(manifest, open(f'{out}/manifest.json', 'w'), indent=1)
    print(len(manifest), 'pieces in', out)


if __name__ == '__main__':
    main(sys.argv[1])
