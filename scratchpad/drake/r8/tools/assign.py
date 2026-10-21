# exec'd in drake(): colour each tail pixel of key k by its centre-line vertex (sigma), plus the bent result
from PIL import Image as _I
for k in (0, 5):
    m = split[k][0]['tail']
    P, Pn, phi, phin = tail_axis(k, 0.7)
    ys, xs = np.nonzero(m)
    idx = nearest_vertex(k, P, phi, xs.astype(float), ys.astype(float))
    n = len(P) - AXIS_EXT - TIP_EXT
    sig = (idx - AXIS_EXT) / (n - 1)
    vis = (keys[k][0] * 0.4).astype(np.uint8)
    hue = np.clip(sig, -0.2, 1.2)
    col = np.stack([np.clip(255 * hue, 0, 255), np.clip(255 * (1 - abs(hue - 0.5) * 2), 0, 255), np.clip(255 * (1 - hue), 0, 255)], 1)
    col[sig < 0] = [255, 255, 255]
    col[sig > 1] = [255, 0, 255]
    vis[ys, xs] = col.astype(np.uint8)
    for p in P.astype(int):
        if 0 <= p[1] < vis.shape[0] and 0 <= p[0] < vis.shape[1]:
            vis[p[1], p[0]] = [0, 0, 0]
    pr, cv = curl_layer(k, 0.7, crop6[k], m)
    b = (pr[..., :3] / np.maximum(cv, 1e-3)[..., None] * (cv[..., None] > 0.3)).clip(0, 255).astype(np.uint8)
    im = np.concatenate([vis, b], 1)
    _I.fromarray(im).save(os.environ['OUTP'] + f'-assign{k}.png')
print('ok')
