"""His seated Solen (docs/reference/poses/solen-chair-sit-owner-reference.png) read at his density:
5.6 picture px per pixel of his (his head the size of our sprites' head), 145 x 156, box-averaged
(his generator's picture has no exact pixel grid). Writes solen_small.npy for layers.py.

  python3 -I tools/refs/chair_sit/prepare.py <workDir>
  python3 -I tools/refs/chair_sit/layers.py <workDir>     # the layer map: layers_map.png, labels.npy
  python3 -I tools/refs/chair_sit/recolor.py <workDir>    # three of his versions by recolouring
"""
import sys
import numpy as np
from PIL import Image

REF = 'docs/reference/poses/solen-chair-sit-owner-reference.png'
BOX = (420, 40, 1230, 915)
PITCH = 5.6
out = sys.argv[1]
c = Image.open(REF).convert('RGB').crop(BOX)
w, h = c.size
np.save(out + '/solen_small.npy', np.asarray(c.resize((round(w / PITCH), round(h / PITCH)), Image.BOX)).astype(int))
print('ok', round(w / PITCH), round(h / PITCH))
