import sys, numpy as np
F = np.load(sys.argv[1]).astype(np.float32)
LUMA = np.array([0.3, 0.55, 0.15], np.float32)
n = len(F)
def purple(f):
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    return (r > g + 4) & (b > g + 4)
light = [float(((f[..., 3] / 255) * (f[..., :3] @ LUMA / 255)).mean() * 1000) for f in F]
opq = [int((f[..., 3] == 255).sum()) for f in F]
body = [(f[..., 3] == 255) & ~purple(f) for f in F]
print('light', [round(v, 2) for v in light])
print('light step %', [round(100 * (light[(i + 1) % n] - light[i]) / max(light), 1) for i in range(n)])
print('opaque', opq, 'step %', [round(100 * (opq[(i + 1) % n] - opq[i]) / max(opq), 1) for i in range(n)])
print('body silhouette change % (xor/union)', [round(100 * (body[i] ^ body[(i + 1) % n]).sum() / (body[i] | body[(i + 1) % n]).sum(), 1) for i in range(n)])
# hump-top mist box (canvas coords)
x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(',')] if len(sys.argv) > 2 else (75, 38, 132, 68)
def mistmass(f, box):
    x0, y0, x1, y1 = box
    sub = f[y0:y1, x0:x1]
    m = (sub[..., 3] < 255) & (sub[..., 3] > 0) | ((sub[..., 3] == 255) & purple(sub))
    return float((sub[..., 3][m] / 255).sum())
print('hump-top mist mass', [round(mistmass(f, (x0, y0, x1, y1)), 1) for f in F])
print('all mist mass', [round(mistmass(f, (0, 0, F.shape[2], F.shape[1])), 1) for f in F])
