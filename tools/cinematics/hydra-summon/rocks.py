import numpy as np
from scipy import ndimage


def find_rocks(S, ref, region, lum_max=115, contrast=45, dmin=30):
    """Dark, compact blobs standing out from brighter surroundings (his flying stones)."""
    lum = S.mean(-1)
    d = np.abs(S - ref).mean(-1)
    m = (lum < lum_max) & (d > dmin) & region
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=2))
    lab, n = ndimage.label(m)
    out = []
    for k, (sy, sx) in enumerate(ndimage.find_objects(lab)):
        sub = lab[sy, sx] == k + 1
        a = sub.sum()
        if not (90 < a < 9000):
            continue
        if a / sub.size < 0.42:
            continue
        y0, y1, x0, x1 = max(0, sy.start - 8), sy.stop + 8, max(0, sx.start - 8), sx.stop + 8
        win = lab[y0:y1, x0:x1] == k + 1
        ring = ndimage.binary_dilation(win, iterations=6) & ~win
        L = lum[y0:y1, x0:x1]
        if L[ring].mean() - L[win].mean() < contrast:
            continue
        out.append((y0, y1, x0, x1, win))
    return out


def rock_layer(S, rocks, shape):
    """The rocks' mask and a plate with them painted out (filled from around)."""
    M = np.zeros(shape, bool)
    for y0, y1, x0, x1, win in rocks:
        M[y0:y1, x0:x1] |= ndimage.binary_dilation(win, iterations=2)
    w = (~M).astype(np.float32)
    plate = S.copy()
    for s in (6, 14, 30):
        num = np.stack([ndimage.gaussian_filter(S[..., c] * w, s) for c in range(3)], -1)
        den = ndimage.gaussian_filter(w, s)[..., None]
        fill = num / np.maximum(den, 1e-3)
        plate[M] = fill[M]
        if den[M].min() > 0.05:
            break
    return M, plate
