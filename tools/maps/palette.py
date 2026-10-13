"""Pixel palettes for the painted battle maps (dark -> light) and ordered-dither quantising."""
import numpy as np

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def pal(*hexes):
    return np.array([hexrgb(h) for h in hexes])


# palettes, dark -> light
GRASS = pal('#1f3a24', '#2a5230', '#386b37', '#4a853e', '#62a046', '#82bb52', '#a6d16a')
GRASS_FAR = pal('#2c4a3a', '#36594a', '#436b52', '#53805a', '#689563', '#80aa6e')
ROCK = pal('#262330', '#3a3442', '#504655', '#685c66', '#827578', '#a19189', '#c2b29f')
DIRT = pal('#3a2a22', '#523a2a', '#6b4d34', '#86633f', '#a07c50', '#bd9a66')
WATER = pal('#123048', '#173f5c', '#1d5070', '#256487', '#2f7b9e', '#4596b4', '#6fb8cc', '#a8dde2')
WOOD = pal('#2a1a14', '#43291c', '#5e3b25', '#7a4f30', '#97663d', '#b5834f')
LEAF = pal('#14281d', '#1c3a26', '#26502f', '#336a37', '#448442', '#5b9e4c', '#7cb85c', '#a2d071')
LEAF_FAR = pal('#1f3330', '#264238', '#2f5240', '#3b6449', '#4a7653', '#5d8a5d')
BARK = pal('#21160f', '#3a2618', '#553722', '#6e4a2d', '#8a6038')
SKY = pal('#5f8fcf', '#73a2d8', '#8ab5e0', '#a3c7e6', '#bdd7ea', '#d6e6ec', '#ecefe3')
MOUNT_FAR = pal('#7d97bf', '#8ea7c9', '#a1b7d2')
MOUNT_NEAR = pal('#566f97', '#647ea4', '#7590b2', '#88a1bf')


def quant(v, palette, x0=0, y0=0):
    """v in [0,1] (HxW) -> colors with ordered dithering between palette steps."""
    n = len(palette)
    hh, ww = v.shape
    th = BAYER[(np.arange(hh)[:, None] + y0) % 4, (np.arange(ww)[None, :] + x0) % 4]
    idx = np.clip(np.floor(v * (n - 1) + th * 0.999), 0, n - 1).astype(int)
    return palette[idx]
