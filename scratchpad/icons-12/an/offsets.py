"""For each icon: his bright pixels lost by each placement of the 115 square in his window."""
import sys, numpy as np
from PIL import Image


def morph(v, r, mx):
    h, w = v.shape
    p = np.pad(v, r, mode='edge')
    st = [p[r + dy:r + dy + h, r + dx:r + dx + w] for dy in range(-r, r + 1) for dx in range(-r, r + 1)]
    return np.max(st, 0) if mx else np.min(st, 0)


def label(m):
    h, w = m.shape
    lab = np.zeros((h, w), int)
    n = 0
    for y in range(h):
        for x in range(w):
            if m[y, x] and not lab[y, x]:
                n += 1
                st = [(y, x)]
                lab[y, x] = n
                while st:
                    cy, cx = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = cy + dy, cx + dx
                            if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                                lab[yy, xx] = n
                                st.append((yy, xx))
    return lab, n

D = sys.argv[1]


def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    M_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    S_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return np.stack([0.2104542553 * L_ + 0.793617785 * M_ - 0.0040720468 * S_, 1.9779984951 * L_ - 2.428592205 * M_ + 0.4505937099 * S_, 0.0259040371 * L_ + 0.7827717662 * M_ - 0.808675766 * S_], -1)


S = 115
for j in sys.argv[2:]:
    a = np.asarray(Image.open(f'{D}/{j}@window.png').convert('RGB')).astype(float)
    lab = oklab(a)
    L = lab[..., 0]
    h, w = L.shape
    op = morph(morph(L, 1, False), 1, True)
    th = L - op
    defs = {
        'L>=0.6': L >= 0.6,
        'L>=0.75': L >= 0.75,
        'L>=0.86': L >= 0.86,
        'tophat>=0.08&L>=0.5': (th >= 0.08) & (L >= 0.5),
        'union L>=0.86 | tophat': (L >= 0.86) | ((th >= 0.08) & (L >= 0.5)),
    }
    print(j, w, h)
    for name, m in defs.items():
        lab_, n = label(m)
        tot = m.sum()
        rows = []
        for o in range(0, w - S + 1):
            keep = np.zeros_like(m)
            keep[:, o:o + S] = True
            lost = (m & ~keep).sum()
            # objects (8-connected) with any pixel lost; wholly lost
            ids_lost = set(np.unique(lab_[m & ~keep])) - {0}
            ids_kept = set(np.unique(lab_[m & keep])) - {0}
            whole = len(ids_lost - ids_kept)
            part = len(ids_lost & ids_kept)
            rows.append((o, lost, whole, part))
        best = min(rows, key=lambda r: (r[1], r[2]))
        print('  %-22s total %5d | ' % (name, tot) + ' '.join('%d:%d/%d+%d' % r for r in rows))
        print('     best offset %d: lost %d px (%.1f%%), objects wholly lost %d, cut %d' % (best[0], best[1], 100 * best[1] / max(1, tot), best[2], best[3]))

    m = (L >= 0.86) | ((th >= 0.08) & (L >= 0.5))
    for o in [int(v) for v in __import__('os').environ.get('SHOW', '').split(',') if v]:
        if o + S > w: continue
        ys, xs = np.nonzero(m)
        lost = [(x, y) for x, y in zip(xs, ys) if not o <= x < o + S]
        print('   offset', o, 'lost (x,y,L):', ' '.join('%d,%d,%.2f' % (x, y, L[y, x]) for x, y in sorted(lost)))
