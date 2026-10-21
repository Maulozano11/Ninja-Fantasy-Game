# bar44.py lib work id out: his box44 | ours | r5 at x1, x3, x6 on the dark bar, plus his crop small
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import Image
W, iid, out = sys.argv[2], sys.argv[3], sys.argv[4]
src = load_his(W + f'/out/ref/{iid}.png')
hb = Image.fromarray(np.clip(box(src, 44, 44), 0, 255).astype(np.uint8))
o = Image.open(W + f'/out/{iid}.png').convert('RGB'); r5 = Image.open(W + f'/staging-r5-backup/{iid}.png').convert('RGB')
rows = []
for z in (1, 3, 6):
    rows.append(row([i.resize((44 * z, 44 * z), Image.NEAREST) for i in (hb, o, r5)], gap=12))
col(rows).save(out)
