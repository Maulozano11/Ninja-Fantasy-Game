import importlib.util, sys, os
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('ifr', sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
for arg in sys.argv[3:]:
    n, path = arg.split('=', 1)
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    g = m.grid(a)
    nat, xs, ys, spread = m.native(a, g)
    print(n, g, 'spread', round(spread, 3))
    img = m.to_img(nat)
    img.save(os.path.join(out, 'native-%s.png' % n))
    img.resize((img.size[0] * 4, img.size[1] * 4), Image.NEAREST).save(os.path.join(out, 'native-%s-x4.png' % n))
    L = nat.mean(2)
    # rows/cols where it's "black line" (dark) runs: print dark profile for window finding
    np.save(os.path.join(out, 'native-%s.npy' % n), nat)
