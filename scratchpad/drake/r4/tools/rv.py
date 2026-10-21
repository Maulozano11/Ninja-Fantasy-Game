"""Review helpers: zooms over green, holes, stats."""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import dec
from collections import deque
GREEN = (93, 107, 87)
DARK = (34, 34, 44)
REF = '/home/user/Ninja-Fantasy-Game/docs/reference/earth-set-owner-reference.jpg'
S = 96 / 228

def over(f, bg=GREEN):
    a = f[..., 3:4] / 255.0
    return (f[..., :3] * a + np.array(bg) * (1 - a)).astype(np.uint8)

def zoom(frames, idxs, box, k=6, bg=GREEN, path=None):
    x0, y0, x1, y1 = box
    tiles = [Image.fromarray(over(frames[i], bg)[y0:y1, x0:x1]).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST) for i in idxs]
    W = sum(t.width for t in tiles) + 6 * (len(tiles) - 1)
    out = Image.new('RGB', (W, tiles[0].height), (255, 0, 255))
    x = 0
    for t in tiles:
        out.paste(t, (x, 0)); x += t.width + 6
    if path: out.save(path)
    return out

def comps4(mask):
    H, W = mask.shape
    seen = np.zeros_like(mask)
    out = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for ny, nx in ((cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        out.append(pts)
    return out

def holes(f):
    """Transparent regions not connected to the frame border (4-conn), by size."""
    clear = f[..., 3] == 0
    H, W = clear.shape
    res = []
    for p in comps4(clear):
        p = np.array(p)
        if p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == H - 1 or p[:, 1].max() == W - 1:
            continue
        res.append((len(p), int(p[:, 1].mean()), int(p[:, 0].mean())))
    return sorted(res, reverse=True)

def his_game(key_torso, size, anchor):
    """His panel area-averaged to game scale with key_torso on anchor (RGB float)."""
    ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)
    ow, oh = size
    x0 = key_torso[0] - anchor[0] / S
    y0 = key_torso[1] - anchor[1] / S
    chans = [np.asarray(Image.fromarray(ref[..., c], 'F').resize((ow, oh), Image.BOX, box=(x0, y0, x0 + ow / S, y0 + oh / S))) for c in range(3)]
    return np.stack(chans, -1)
