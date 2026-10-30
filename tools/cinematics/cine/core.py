"""The cinematic tool's shared pieces: layers, keys, noise, easing, reveals, embers, the camera
and the output (frames, video, manifest).

The method ("one shot, the code moves it"): the owner's generator paints good single pictures but
never the same thing twice, so a cinematic is built from pictures that line up (a keyframe and
edits of it: plates, steps) and every in-between frame is made by code from his pixels. See
`tools/cinematics/README.md`.

Everything here is deterministic: the same spec and the same pictures give the same bytes.
"""
import json
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

MAGENTA = np.array([255, 0, 255], np.float32)


# ---------------------------------------------------------------- pictures and keys

def load_rgb(path, size):
    """His picture at the cinematic's size. Lanczos for paintings (backgrounds), as Steve 1's hydra."""
    return Image.open(path).convert('RGB').resize(size, Image.LANCZOS)


def key_hard(img):
    """Hard magenta key for a crisp subject (the avatar): magenta and the pink fringe toward it go."""
    a = np.array(img.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (b > 110) & (b > g + 60) & (r > 110)
    return np.dstack([a.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])


def key_unmix(img):
    """Soft key for glow and smoke (Steve 1's rule): alpha = 1 - (min(r, b) - g) / 235, then the
    magenta is taken out of the colour, so a glow never turns pink and smoke never turns green."""
    a = np.array(img.convert('RGB')).astype(np.float32)
    m = np.clip((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) / 235.0, 0, 1)
    alpha = 1 - m
    col = (a - m[..., None] * MAGENTA) / np.maximum(alpha[..., None], 1e-3)
    col = np.clip(col, 0, 255)
    return np.dstack([col, alpha * 255]).astype(np.uint8)


def keyed(path, size, mode='hard', resample=Image.NEAREST):
    img = Image.open(path).convert('RGB').resize(size, resample)
    return key_hard(img) if mode == 'hard' else key_unmix(img)


def rgba(arr):
    return Image.fromarray(arr, 'RGBA')


def fade(img, a):
    """An RGBA picture with its alpha times a (0..1)."""
    if a >= 1:
        return img
    q = np.array(img)
    q[..., 3] = (q[..., 3].astype(np.float32) * max(0.0, a)).astype(np.uint8)
    return rgba(q)


# ---------------------------------------------------------------- timing and noise

def ease_out(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def back_out(x, s=1.4):
    x = min(1.0, max(0.0, x)) - 1
    return x * x * ((s + 1) * x + s) + 1


def phase(t, t0, length):
    """Progress 0..1 of a segment that starts at t0 and lasts `length` seconds (unclamped above 1)."""
    return (t - t0) / length if length > 0 else (1.0 if t >= t0 else 0.0)


def noise(size, cell, seed):
    """Smooth value noise in 0..1, `cell` px per lattice step."""
    w, h = size
    r = np.random.default_rng(seed).random((h // cell + 2, w // cell + 2))
    img = Image.fromarray((r * 255).astype(np.uint8)).resize(((w // cell + 2) * cell, (h // cell + 2) * cell), Image.BICUBIC)
    return np.array(img)[:h, :w].astype(np.float32) / 255.0


def reveal_mask(size, origin, k, nz, stretch=(0.62, 1.0), edge=0.22, reach=1.25):
    """What a growth from `origin` has covered at progress k: an ellipse widening through a noisy
    edge (fire bursting from the ninja's feet, cracks spreading from the circle)."""
    w, h = size
    yy = np.arange(h)[:, None]
    xx = np.arange(w)[None, :]
    d = np.sqrt(((xx - origin[0]) / (w * stretch[0])) ** 2 + ((origin[1] - yy) / (h * stretch[1])) ** 2)
    return (d + edge * (nz - 0.5)) < ease_out(k) * reach


def step_difference(a, b, thr=28, blur=5):
    """For pictures painted as edits of one another (the hydra's steps): where b differs from a,
    as a soft 0..1 mask."""
    d = np.abs(np.asarray(b, np.float32) - np.asarray(a, np.float32)).mean(-1) > thr
    return ndimage.gaussian_filter(d.astype(np.float32), blur)


# ---------------------------------------------------------------- drawing helpers

def ground_glow(fr, centre, k, rings=((330, 45), (230, 65), (140, 85)), colour=(255, 130, 30), flat=0.22):
    g = Image.new('RGBA', fr.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    for r, al in rings:
        d.ellipse([centre[0] - r, centre[1] - r * flat, centre[0] + r, centre[1] + r * flat], fill=colour + (int(al * k),))
    fr.alpha_composite(g)


def ground_rings(fr, centre, k, rings=((70, 210), (130, 160), (200, 110)), flat=0.17):
    d = ImageDraw.Draw(fr, 'RGBA')
    for j, (r, al) in enumerate(rings):
        rr = r * ease_out(min(1, k * 1.3))
        d.ellipse([centre[0] - rr, centre[1] - rr * flat, centre[0] + rr, centre[1] + rr * flat],
                  outline=(255, 175 - 40 * j, 40, int(al * (1 - k * 0.5))), width=3)


def flash(fr, a, colour=(255, 240, 190)):
    if a > 0:
        fr.alpha_composite(Image.new('RGBA', fr.size, colour + (int(255 * min(1, a)),)))


class Embers:
    """Rising embers drawn in front of everything (the hydra's and the avatar's)."""

    def __init__(self, size, n, seed, top=0.3):
        w, h = size
        r = np.random.default_rng(seed)
        cols = [(255, 240, 180), (255, 190, 60), (245, 120, 24)]
        self.h = h
        self.e = [dict(x=r.uniform(60, w - 60), y=r.uniform(h * top, h + 40), v=r.uniform(50, 140), s=int(r.integers(2, 5)),
                       ph=r.uniform(0, 6), c=cols[int(r.integers(0, 3))]) for _ in range(n)]

    def draw(self, fr, t):
        d = ImageDraw.Draw(fr)
        for e in self.e:
            y = (e['y'] - e['v'] * t) % (self.h + 60) - 30
            x = e['x'] + 6 * math.sin(e['ph'] + t * 3)
            d.rectangle([x, y, x + e['s'], y + e['s']], fill=e['c'])


# ---------------------------------------------------------------- camera

class Camera:
    """Shake and push-in applied to a finished frame. The same numbers go into the manifest, so the
    game's player puts the real units under exactly the same camera."""

    def __init__(self, size):
        self.size = size

    def params(self, f, shake, zoom, focus_y=0.25):
        w, h = self.size
        cw, ch = int(w / zoom), int(h / zoom)
        x0, y0 = (w - cw) // 2, int((h - ch) * focus_y)
        sx, sy = shake * math.sin(f * 2.3), shake * math.cos(f * 1.9)
        return dict(zoom=zoom, x0=x0, y0=y0, cw=cw, ch=ch, sx=sx, sy=sy)

    def apply(self, fr, p):
        w, h = self.size
        if p['zoom'] > 1:
            fr = fr.crop((p['x0'], p['y0'], p['x0'] + p['cw'], p['y0'] + p['ch'])).resize((w, h), Image.NEAREST)
        return fr.transform((w, h), Image.AFFINE, (1, 0, -p['sx'], 0, 1, -p['sy']), resample=Image.NEAREST, fillcolor=(0, 0, 0, 255))

    @staticmethod
    def to_screen(p, x, y, size):
        """Where a point of the unzoomed scene lands on the finished frame."""
        k = size[0] / p['cw'] if p['zoom'] > 1 else 1.0
        if p['zoom'] > 1:
            x, y = (x - p['x0']) * k, (y - p['y0']) * k
        return x + p['sx'], y + p['sy'], k


# ---------------------------------------------------------------- output

def write(out_dir, name, frames, cams, fps, units, preview=None, video_size=(1280, 720), gif_size=(640, 360)):
    """Frames (PNG), a manifest for the game's player, an MP4 under 15 MB and a small GIF.
    `units`: where the game draws its real units ({'role', 'x', 'y', 'scale'} in scene pixels).
    `preview`: optional {'role': RGBA picture} drawn over a copy of the frames for the owner's
    preview video (the shipped frames never have the party baked in)."""
    os.makedirs(f'{out_dir}/{name}', exist_ok=True)
    size = frames[0].size
    for i, fr in enumerate(frames):
        fr.convert('RGB').save(f'{out_dir}/{name}/{i:04d}.png', optimize=False)
    man = dict(name=name, fps=fps, size=list(size), frames=len(frames), units=units,
               camera=[{k: round(float(v), 3) for k, v in c.items()} for c in cams])
    with open(f'{out_dir}/{name}/manifest.json', 'w') as fh:
        json.dump(man, fh, indent=1, sort_keys=True)
    shown = frames
    if preview:
        shown = []
        for fr, c in zip(frames, cams):
            f2 = fr.copy().convert('RGBA')
            for u in units:
                pic = preview.get(u['role'])
                if pic is None:
                    continue
                x, y, k = Camera.to_screen(c, u['x'], u['y'], size)
                s = u.get('scale', 1.0) * k
                p = pic.resize((max(1, int(pic.width * s)), max(1, int(pic.height * s))), Image.NEAREST)
                f2.alpha_composite(p, (int(x - p.width / 2), int(y - p.height)))
            shown.append(f2)
        os.makedirs(f'{out_dir}/{name}_preview', exist_ok=True)
        for i, fr in enumerate(shown):
            fr.convert('RGB').save(f'{out_dir}/{name}_preview/{i:04d}.png')
    src = f'{out_dir}/{name}_preview' if preview else f'{out_dir}/{name}'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(fps), '-i', f'{src}/%04d.png',
                    '-vf', f'scale={video_size[0]}:{video_size[1]}:flags=neighbor', '-c:v', 'libx264', '-preset', 'veryfast',
                    '-pix_fmt', 'yuv420p', '-crf', '22', f'{out_dir}/{name}.mp4'], check=True)
    g = [s.convert('RGB').resize(gif_size, Image.BOX) for s in shown[::2]]
    pal = g[len(g) // 2].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [x.quantize(palette=pal, dither=Image.Dither.NONE) for x in g]
    q[0].save(f'{out_dir}/{name}.gif', save_all=True, append_images=q[1:], duration=int(2000 / fps), loop=0, optimize=True)
    mb = os.path.getsize(f'{out_dir}/{name}.mp4') / 1e6
    if mb > 15:
        raise SystemExit(f'{name}.mp4 is {mb:.1f} MB: over the 15 MB publish limit; lower video_size or crf')
    return man
