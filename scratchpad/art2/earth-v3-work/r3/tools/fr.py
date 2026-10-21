"""fr.py <sprite> <anim> <frames,...> <out.png> [x0 y0 w h] [k] [bgs]: frames of the built group over grounds."""
import json, os, sys
import numpy as np
from PIL import Image
G = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_earth_v3'
M = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def frames(name, anim):
    m = M[name]
    sh = np.asarray(Image.open(os.path.join(G, m['file'])).convert('RGBA')).astype(float)
    a = m['anims'][anim]
    return [sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']] for i in range(a['frames'])]
if __name__ == '__main__':
    name, anim, idxs, out = sys.argv[1:5]
    fr = frames(name, anim)
    idxs = [int(v) for v in idxs.split(',')] if idxs != 'all' else list(range(len(fr)))
    H, W = fr[0].shape[:2]
    x0, y0, w, h = (int(v) for v in sys.argv[5:9]) if len(sys.argv) > 8 else (0, 0, W, H)
    k = int(sys.argv[9]) if len(sys.argv) > 9 else 3
    bgs = [(34, 34, 45), (222, 214, 190), (90, 120, 60)][:int(sys.argv[10]) if len(sys.argv) > 10 else 2]
    rows = []
    for bg in bgs:
        cells = []
        for i in idxs:
            f = fr[i][y0:y0 + h, x0:x0 + w]
            A = f[..., 3:] / 255
            c = f[..., :3] * A + np.array(bg, float) * (1 - A)
            cells.append(np.pad(c, ((0, 2), (0, 2), (0, 0)), constant_values=255))
        rows.append(np.concatenate(cells, 1))
    img = np.concatenate(rows, 0)
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((img.shape[1] * k, img.shape[0] * k), Image.NEAREST).save(out)
    print(name, anim, W, H, 'frames', len(fr))
