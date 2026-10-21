import json, os, sys
import numpy as np
from PIL import Image

def label4(m):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32)
    n = 0
    for y0 in range(H):
        for x0 in range(W):
            if m[y0, x0] and not lab[y0, x0]:
                n += 1
                st = [(y0, x0)]
                lab[y0, x0] = n
                while st:
                    y, x = st.pop()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        u, v = y + dy, x + dx
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n
                            st.append((u, v))
    return lab, n

def holes(f, thr):
    op = f[..., 3] < thr
    lab, n = label4(op)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    out = []
    for k in range(1, n + 1):
        if k in border: continue
        ys, xs = np.nonzero(lab == k)
        out.append((len(ys), int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))
    out.sort(reverse=True)
    return out

if __name__ == '__main__':
    G = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else 'blast'
    thr = int(sys.argv[3]) if len(sys.argv) > 3 else 128
    man = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
    sheet = np.asarray(Image.open(os.path.join(G, man['file'])).convert('RGBA'))
    for anim, a in man['anims'].items():
        for i in range(a['frames']):
            f = sheet[a['row'] * man['frameH']:(a['row'] + 1) * man['frameH'], i * man['frameW']:(i + 1) * man['frameW']]
            s = holes(f, thr)
            print(f'{anim}[{i}] enclosed(a<{thr}) total {sum(x[0] for x in s)} in {len(s)}; largest {s[:4]}')
