import sys, numpy as np
from PIL import Image
d = np.load(sys.argv[1])
out = sys.argv[2]
K = int(sys.argv[3]) if len(sys.argv) > 3 else 4
tint = len(sys.argv) > 4 and sys.argv[4] == 'tint'
crop = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else None
fr = d['frames']; top = d['top']
N, H, W = fr.shape[:3]
tiles = []
for k in range(N):
    f = fr[k].astype(np.float32)
    if len(sys.argv) > 6:
        mk = d[sys.argv[6]][k]
        f[mk, :3] = (255, 0, 0)
    if tint:
        m = top[k] == 1  # far
        f[m, :3] = f[m, :3] * 0.5 + np.array([255, 0, 200]) * 0.5
    bg = np.zeros((H, W, 4), np.float32); bg[...] = (0x5d, 0x6b, 0x57, 255)
    a = f[..., 3:4] / 255
    c = f[..., :3] * a + bg[..., :3] * (1 - a)
    img = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8))
    if crop: img = img.crop(crop)
    tiles.append(img.resize((img.width * K, img.height * K), Image.NEAREST))
cols = 4
tw, th = tiles[0].size
sheet = Image.new('RGB', (cols * (tw + 4), ((N + cols - 1) // cols) * (th + 4)), (255, 0, 255))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
sheet.save(out)
