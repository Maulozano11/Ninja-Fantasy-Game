"""Block lightness bias of each 88 stage in a debug sheet (box, with marks, on palette, final) against the box."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12/an')


def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    M_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    S_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return np.stack([0.2104542553 * L_ + 0.793617785 * M_ - 0.0040720468 * S_, 1.9779984951 * L_ - 2.428592205 * M_ + 0.4505937099 * S_, 0.0259040371 * L_ + 0.7827717662 * M_ - 0.808675766 * S_], -1)


sh = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
Z = 8
for N, y0, step, k in ((88, 44 * Z + 10, 4, 8), (44, 0, 8, 4)):
    st = []
    for i in range(4):
        x0 = i * (44 * Z + 10)
        st.append(sh[y0:y0 + 352:step, x0:x0 + 352:step])
    B = oklab(st[0]).reshape(11, k, 11, k, 3).mean((1, 3))
    for name, s in zip(['box', 'marks', 'palette', 'final'], st):
        A = oklab(s).reshape(11, k, 11, k, 3).mean((1, 3))
        print('%d %-8s blockDiff %.2f lightBias %+.2f' % (N, name, np.linalg.norm(A - B, axis=-1).mean() * 100, (A[..., 0] - B[..., 0]).mean() * 100))
