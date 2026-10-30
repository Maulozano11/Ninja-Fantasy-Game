"""Cutting a keyframe into pieces with its plate.

The plate is his keyframe with the pieces taken away (an edit of the same picture, so it lines up).
A piece is exactly the pixels where the keyframe differs from the plate, inside the rough zone
named in the spec; it is never a straight cut through what is behind it, so no cut line can show.
Its edge fades over a few pixels into what is under it.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def zone_mask(size, z):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    if z['kind'] == 'poly':
        d.polygon([tuple(p) for p in z['points']], fill=255)
    else:
        d.line([tuple(p) for p in z['points']], fill=255, width=z['width'])
    return np.array(m) > 0


def cut(key, plate, zones, diff=110, feather=3.0, min_px=25):
    """Pieces of `key` (RGBA) against `plate` (RGBA), one per zone, in zone order (a pixel goes to the
    first zone that claims it). Each piece: name, arr (RGBA), m (mask), c (centre), r (radius),
    dist (0..1 from its centre), halo (its shape grown and blurred)."""
    h, w = key.shape[:2]
    alpha = key[..., 3] > 0
    differs = (np.abs(key[..., :3].astype(int) - plate[..., :3].astype(int)).sum(-1) > diff) | (plate[..., 3] == 0)
    armour = ndimage.binary_opening(differs & alpha, iterations=1)
    armour = ndimage.binary_fill_holes(ndimage.binary_closing(armour, iterations=3)) & alpha
    out, taken = [], np.zeros((h, w), bool)
    for z in zones:
        m = ndimage.binary_dilation(zone_mask((w, h), z), iterations=6) & armour & ~taken
        lab, n = ndimage.label(m)
        if n:
            sz = ndimage.sum(m, lab, range(1, n + 1))
            m = np.isin(lab, 1 + np.nonzero(sz >= min_px)[0])
        m = ndimage.binary_dilation(m, iterations=1) & alpha & ~taken
        taken |= m
        fe = np.clip(ndimage.distance_transform_edt(m) / feather, 0, 1)
        q = np.zeros_like(key)
        q[m] = key[m]
        q[..., 3] = (q[..., 3] * fe).astype(np.uint8)
        ys, xs = np.nonzero(m)
        cx, cy = xs.mean(), ys.mean()
        r = float(np.sqrt(((xs - cx) ** 2 + (ys - cy) ** 2).max())) + 1
        dist = np.zeros((h, w), np.float32)
        dist[m] = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / r
        halo = ndimage.gaussian_filter(ndimage.binary_dilation(m, iterations=10).astype(np.float32), 9)
        halo = halo / max(1e-6, halo.max())
        out.append(dict(name=z['name'], arr=q, m=m, c=(cx, cy), r=r, dist=dist, halo=halo))
    return out, taken


def behind(key, plate, taken, filler):
    """What is behind the pieces: the keyframe outside them, his plate inside them, and `filler`
    (his own fire tiled) only where the plate itself is empty."""
    alpha = key[..., 3] > 0
    base = key.copy()
    base[taken] = 0
    out = np.where(taken[..., None], filler, base)
    has_plate = taken & (plate[..., 3] > 0)
    out = np.where(has_plate[..., None], plate, out)
    out[..., 3] = np.where(alpha, out[..., 3], 0)
    return out


def mirrored_tile(sample, size, half=True):
    """A seamless fill from a patch of his fire: tiled mirrored both ways so the tiles meet without
    a seam."""
    w, h = size
    if half:
        s = Image.fromarray(sample, 'RGBA')
        sample = np.array(s.resize((max(1, s.width // 2), max(1, s.height // 2)), Image.NEAREST))
    t = np.concatenate([sample, sample[:, ::-1]], 1)
    t = np.concatenate([t, t[::-1]], 0)
    return np.tile(t, (h // t.shape[0] + 2, w // t.shape[1] + 2, 1))[:h, :w]
