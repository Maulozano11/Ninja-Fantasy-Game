"""Turns the dice mockup frame folders (written by tools/ui/dice-d20-mock.ts) into GIFs.

    python3 -I tools/ui/dice-d20-gif.py <outDir>

Each <outDir>/<name>/ holding NNN.png frames and frames.json ({"ms": [...]}) becomes <outDir>/<name>.gif.
Frames that repeat are merged (their times add up). One palette serves the whole GIF, most of it
taken from the pixels that move (the dice and effects), so the file stays small and the art keeps
its colours.
"""

import json
import os
import sys

import numpy as np
from PIL import Image


def build(folder: str, out: str) -> None:
    ms = json.load(open(os.path.join(folder, 'frames.json')))['ms']
    names = sorted(f for f in os.listdir(folder) if f.endswith('.png'))
    rgb, times, last = [], [], None
    for name, t in zip(names, ms):
        im = Image.open(os.path.join(folder, name)).convert('RGB')
        data = im.tobytes()
        if data == last:
            times[-1] += t
            continue
        last = data
        rgb.append(im)
        times.append(t)
    # One palette for the whole GIF (so unchanged pixels stay identical and each frame stores only
    # the part that moved): half of it from the scene, half from the pixels that change between
    # frames (the dice, the effects, the numbers), so the new art keeps its colours.
    step = max(1, len(rgb) // 24)
    scene = np.concatenate([np.asarray(im).reshape(-1, 3)[::7] for im in rgb[::step]])
    moving = []
    for a, b in zip(rgb[:-1], rgb[1:]):
        A, B = np.asarray(a).reshape(-1, 3), np.asarray(b).reshape(-1, 3)
        m = (A != B).any(axis=1)
        # Skip the camera shake and flashes (the whole frame moves): they would drown the dice.
        if m.mean() < 0.2:
            moving.append(B[m])
    moving = np.concatenate(moving) if moving else scene
    # The moving pixels' most common exact colours (the dice art is drawn from small palettes, so
    # its colours repeat exactly), then the scene's colours by median cut.
    keys = (moving[:, 0].astype(np.int64) << 16) | (moving[:, 1].astype(np.int64) << 8) | moving[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    top = vals[np.argsort(-counts)[:176]]
    pal = []
    for k in top:
        pal += [int(k >> 16) & 255, int(k >> 8) & 255, int(k) & 255]
    n = 256 - len(top)
    side = int(np.ceil(np.sqrt(len(scene))))
    buf = np.zeros((side * side, 3), np.uint8)
    buf[: len(scene)] = scene
    buf[len(scene):] = scene[0]
    q = Image.fromarray(buf.reshape(side, side, 3)).quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal += q.getpalette()[: n * 3]
    pimg = Image.new('P', (1, 1))
    pimg.putpalette(pal + [0] * (768 - len(pal)))
    frames = [im.quantize(palette=pimg, dither=Image.Dither.NONE) for im in rgb]
    # GIF delays are in 10 ms steps; carry the rounding over so the total time stays right.
    delays, carry = [], 0.0
    for t in times:
        d = max(20, int(round((t + carry) / 10.0)) * 10)
        carry += t - d
        delays.append(d)
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=delays, loop=0, disposal=1, optimize=True)
    print(f'{out}: {len(frames)} frames, {sum(delays) / 1000:.1f} s')


def main() -> None:
    root = sys.argv[1]
    for name in sorted(os.listdir(root)):
        folder = os.path.join(root, name)
        if os.path.isdir(folder) and os.path.exists(os.path.join(folder, 'frames.json')):
            build(folder, os.path.join(root, name + '.gif'))


if __name__ == '__main__':
    main()
