"""Our idle render against the study's pieces: every pixel of the pieces at rest, is it on screen as it is?"""
import sys, os, importlib.util
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import numpy as np
from PIL import Image
import scarlet_ref as R
spec = importlib.util.spec_from_file_location('gb', os.path.join(os.getcwd(), 'tools/refs/scarlet-gloves-boots-from-ref.py'))
gb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gb)
P = gb.pieces()
img = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(int)
rgb = R.rgb()
for name in sys.argv[2:]:
    idx = P[name]
    ys, xs = np.nonzero(idx != 255)
    bad = [(x, y, '#%02x%02x%02x' % tuple(img[y, x, :3]), R.PALETTE[idx[y, x]]) for x, y in zip(xs, ys) if (img[y, x, :3] != rgb[idx[y, x]]).any()]
    print(name, len(xs), 'pixels,', len(bad), 'differ', bad[:12])
