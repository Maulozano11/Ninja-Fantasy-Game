import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
import os
import numpy as np
from PIL import Image
from fxlib import *


def grass(x0, y0, w, h, colors):
    """A crop of the real battle ground, reduced to `colors` exact colours (no dithering)
    so the GIF stays small; returns RGBA."""
    g = ground_crop(x0, y0, w, h).convert('RGB')
    q = g.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return q.convert('RGBA')


def durations_12fps(n, hold_last_ms=0):
    """GIF delays are stored in 1/100 s: 80, 80, 90 ms repeating averages exactly 1000/12 ms."""
    pat = [80, 80, 90]
    ds = [pat[i % 3] for i in range(n)]
    if hold_last_ms:
        ds[-1] += hold_last_ms
    return ds


def _key(a):
    return (a[..., 0].astype(np.uint32) << 16) | (a[..., 1].astype(np.uint32) << 8) | a[..., 2].astype(np.uint32)


def save_gif(frames, durations, path, protect_imgs=()):
    """frames: list of RGBA/RGB images (opaque). Builds one shared palette: exact colours when
    there are <= 256, else every colour of `protect_imgs` kept exact and the rest median-cut."""
    rgb = [f.convert('RGB') for f in frames]
    arrs = [np.asarray(f) for f in rgb]
    keys = np.concatenate([_key(a).ravel() for a in arrs])
    uniq, counts = np.unique(keys, return_counts=True)
    if len(uniq) <= 256:
        pal = uniq
        mode = 'exact'
    else:
        prot = set()
        for p in protect_imgs:
            a = np.asarray(p.convert('RGBA'))
            prot.update(np.unique(_key(a[a[..., 3] == 255][:, None, :3])).tolist())
        prot = [k for k in prot if k in set(uniq.tolist())]
        if len(prot) > 230:
            # keep the most frequent protected colours
            cmap = dict(zip(uniq.tolist(), counts.tolist()))
            prot = sorted(prot, key=lambda k: -cmap[k])[:230]
        rest_mask = ~np.isin(uniq, np.array(prot, dtype=np.uint32))
        rest = uniq[rest_mask]
        rest_counts = counts[rest_mask]
        nfree = 256 - len(prot)
        # median-cut the remaining colours, weighted by how often they occur
        reps = np.repeat(rest, np.minimum(rest_counts, 50))
        side = int(np.ceil(np.sqrt(len(reps))))
        buf = np.zeros(side * side, np.uint32)
        buf[:len(reps)] = reps
        buf[len(reps):] = reps[0]
        img = np.stack([(buf >> 16) & 255, (buf >> 8) & 255, buf & 255], -1).astype(np.uint8).reshape(side, side, 3)
        q = Image.fromarray(img).quantize(colors=nfree, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        qp = np.array(q.getpalette()[:nfree * 3]).reshape(-1, 3)
        extra = (qp[:, 0] << 16) | (qp[:, 1] << 8) | qp[:, 2]
        pal = np.unique(np.concatenate([np.array(prot, dtype=np.uint32), extra.astype(np.uint32)]))[:256]
        mode = f'protected {len(prot)} + mediancut {nfree} (from {len(uniq)})'
    flat = []
    for k in pal.tolist():
        flat += [(k >> 16) & 255, (k >> 8) & 255, k & 255]
    first = flat[:3]
    while len(flat) < 768:
        flat += first
    palimg = Image.new('P', (1, 1))
    palimg.putpalette(flat)
    ps = [f.quantize(palette=palimg, dither=Image.Dither.NONE) for f in rgb]
    ps[0].save(path, save_all=True, append_images=ps[1:], duration=durations, loop=0, disposal=2, optimize=False)
    return os.path.getsize(path), mode


def contact(frames, path, cols, k_down=1, label=True):
    """Contact strip of GIF frames (frames given at display scale; k_down samples every k-th px)."""
    fs = [f.convert('RGB') for f in frames]
    if k_down > 1:
        fs = [f.resize((f.width // k_down, f.height // k_down), Image.NEAREST) for f in fs]
    w, h = fs[0].size
    rows = (len(fs) + cols - 1) // cols
    pad = 4
    out = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad + (16 if label else 0)) + pad), (60, 0, 60))
    from PIL import ImageDraw
    d = ImageDraw.Draw(out)
    for i, f in enumerate(fs):
        x = pad + (i % cols) * (w + pad)
        y = pad + (i // cols) * (h + pad + (16 if label else 0))
        out.paste(f, (x, y))
        if label:
            d.text((x + 2, y + h + 1), str(i), fill=(255, 255, 255), font=font(12))
    out.save(path)
    return out.size
