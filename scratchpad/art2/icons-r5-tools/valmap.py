# valmap.py work_dir icon_id out.png : lightness maps of his box 44, his lanczos 44, ours 44 (x8), + percentiles
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from kx import oklab
from PIL import Image
w, iid, out = sys.argv[1:4]
h = Image.open(f'{w}/out/ref/{iid}.png').convert('RGB'); h = h.crop((1, 1, h.size[0]-1, h.size[1]-1))
ims = [np.array(h.resize((44, 44), Image.BOX)).astype(float), np.clip(np.array(h.resize((44, 44), Image.LANCZOS)).astype(float), 0, 255), np.array(Image.open(f'{w}/out/{iid}.png').convert('RGB')).astype(float)]
sheet = Image.new('L', (3*352 + 20, 352), 20)
for i, a in enumerate(ims):
    L = oklab(a)[..., 0]
    print(['hisbox', 'hislan', 'ours'][i], np.percentile(L, [10, 25, 50, 75, 90]).round(3), 'edge', round(float(np.abs(np.diff(L, axis=1)).mean() + np.abs(np.diff(L, axis=0)).mean()) / 2, 4))
    sheet.paste(Image.fromarray((np.clip(L, 0, 1)*255).astype(np.uint8)).resize((352, 352), Image.NEAREST), (i*362, 0))
sheet.save(out)
