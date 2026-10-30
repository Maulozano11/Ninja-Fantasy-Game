"""The fire avatar's summon: its fire bursts from the ninja's feet, then each armour piece is forged
in its own place out of that fire with the owner's effects, and the eyes light last.

Plug-in for `tools/cinematics/render.py`: `render(spec, root)` gives (frames, cameras, units).
The ninja is never drawn here: the game's player draws the real unit at `units` (manifest).
"""
import math

import numpy as np
from PIL import Image

from cine import core, fx, pieces


def render(spec, root):
    W, H = spec['size']
    FPS, DUR = spec['fps'], spec['duration']
    T = spec['timing']
    size = (W, H)
    bg = core.load_rgb(f"{root}/{spec['background']}", size).convert('RGBA')
    key = core.keyed(f"{root}/{spec['keyframe']}", size, 'hard')
    plate = core.keyed(f"{root}/{spec['plate']}", size, 'hard')
    parts, taken = pieces.cut(key, plate, spec['pieces'])
    order = spec['forge_order']
    parts.sort(key=lambda p: order.index(p['name']))

    # where his plate is empty, his own column of fire (first cell of his appearance sheet) as filler
    sheet = Image.open(f"{root}/{spec['appear']}")
    w3 = sheet.width // 3
    col = core.key_hard(sheet.crop((0, 0, w3, sheet.height)))
    hh = col.shape[0]
    core_ = col[hh // 3:, w3 // 3: 2 * w3 // 3]
    core_ = np.where((core_[..., 3] > 0)[..., None], core_, np.array([250, 170, 50, 255], np.uint8))
    filler = pieces.mirrored_tile(core_, size)
    fire = pieces.behind(key, plate, taken, filler)

    effects = fx.Effects(f"{root}/{spec['effects']}", root)
    nz = core.noise(size, 6, spec['seed'])
    embers = core.Embers(size, 90, spec['seed'] + 1)
    cam = core.Camera(size)
    feet = tuple(spec['ninja']['feet'])
    vshift = spec['variant_shift']
    F0, STEP, FORGE = T['forge_start'], T['forge_step'], T['forge_length']
    te = F0 + (len(parts) - 1) * STEP + FORGE * 0.6   # the helmet sets: the eyes light
    frames, cams = [], []
    for f in range(int(DUR * FPS)):
        t = f / FPS
        fr = bg.copy()
        core.ground_glow(fr, (W // 2, H - 50), min(1, t / 1.0))
        if t < 0.6:
            core.ground_rings(fr, (feet[0], feet[1] - 2), t / 0.6)
        if t > 0.1:
            # the avatar's fire bursts from the ninja's feet and spreads up and out; it flickers by
            # brightness, never by moving (a moving layer under still pieces would show their edges)
            vis = core.reveal_mask(size, (W / 2, H), (t - 0.1) / 1.1, nz)
            q = fire.copy()
            q[..., 3] = np.where(vis, q[..., 3], 0)
            fl = 1 + 0.06 * math.sin(f * 1.9) + 0.04 * math.sin(f * 3.7)
            q[..., :3] = np.clip(q[..., :3].astype(np.float32) * np.where(taken, 1, fl)[..., None], 0, 255).astype(np.uint8)
            fr.alpha_composite(core.rgba(q))
        for i, p in enumerate(parts):
            k = core.phase(t, F0 + i * STEP, FORGE)
            if k <= 0:
                continue
            v = 'ab'[(i + vshift) % 2]
            cx, cy = p['c']
            r = p['r']
            size_name = 'swirl_s' if r < 70 else 'swirl_m' if r < 130 else 'swirl_l'
            if k < 1:   # the fire brightens in the piece's own shape
                gl = min(1, k / 0.3) * (1 - max(0, (k - 0.7) / 0.3))
                lay = np.zeros((H, W, 4), np.uint8)
                lay[..., 0], lay[..., 1], lay[..., 2] = 255, 228, 140
                lay[..., 3] = (p['halo'] * 120 * gl).astype(np.uint8)
                fr.alpha_composite(core.rgba(lay))
            if k < 0.38:   # his swirl closes on it, his sparks are drawn in
                kk = k / 0.38
                fx.put(fr, fx.step(effects.seq(v, size_name), kk), (cx, cy), min(r * 1.9, 300) * (1 - 0.35 * kk))
                fx.put(fr, fx.step(effects.seq(v, 'gather'), kk), (cx, cy), min(r * 2.4, 360) * (1 - 0.3 * kk), 0.9)
            appear = min(1, max(0, (k - 0.22) / 0.33))
            heat = 1 - min(1, max(0, (k - 0.5) / 0.5))
            if appear > 0:   # white-hot from its middle outward, under his molten metal, cooling
                q = p['arr'].copy()
                shown = p['m'] & ((p['dist'] + 0.25 * (nz - 0.5)) < appear * 1.25)
                rgb = q[..., :3].astype(np.float32) * (1 - 0.6 * heat) + np.array([255, 238, 180]) * 0.6 * heat
                q[..., :3] = rgb.astype(np.uint8)
                q[..., 3] = np.where(shown, q[..., 3], 0)
                fr.alpha_composite(core.rgba(q))
                if heat > 0:
                    fr.alpha_composite(fx.stretch_into(shown, effects.seq(v, 'molten')[i % 3], 0.55 * heat))
            if 0.5 <= k < 0.85:   # it sets: his burst, and his glint where the light hits it
                kk = (k - 0.5) / 0.35
                fx.put(fr, fx.step(effects.seq(v, 'burst'), kk), (cx, cy), min(r * 1.3, 170), 0.9 if kk < 0.5 else 0.9 * (1 - (kk - 0.5) / 0.5) + 0.2)
                ys, xs = np.nonzero(p['m'])
                j = np.argmin(xs + ys)
                fx.put(fr, fx.step(effects.seq(v, 'glint'), kk), (xs[j] + 6, ys[j] + 6), max(40, r * 0.8))
            if 0.75 <= k < 1.6:   # his lava veins run over it as it cools, then go out
                kk = (k - 0.75) / 0.85
                fr.alpha_composite(fx.stretch_into(p['m'], effects.seq(v, 'veins')[(i + vshift) % 4], 0.75 * math.sin(math.pi * kk)))
        if t >= te:   # his eyes' burst laid on the two eyes, then a flash
            k = (t - te) / 0.45
            v = 'ab'[vshift]
            if k < 1:
                n = min(2, int(k * 3))
                fx.put_on_pair(fr, effects.seq(v, 'eyes')[n], effects.dots[(v, 'eyes')][n], spec['eyes'][0], spec['eyes'][1])
            if t < te + 0.15:
                core.flash(fr, 0.35 * (1 - (t - te) / 0.15))
        if t >= 0.25:
            embers.draw(fr, t)
        shake = max(0, 1 - t / 1.4) * 3 + (2.5 if te <= t < te + 0.2 else 0)
        zoom = 1 + T['push_in'] * max(0, (t - te) / (DUR - te))
        c = cam.params(f, shake, zoom)
        frames.append(cam.apply(fr, c).convert('RGB'))
        cams.append(c)
    units = [dict(role='caster', x=feet[0], y=feet[1], scale=spec['ninja']['scale'])]
    return frames, cams, units
