# Crops round a screen point (css px) from capture frames, side by side: tiles.py mode out X,Y:frame ...
import sys, json
from PIL import Image
mode, out = sys.argv[1], sys.argv[2]
m = json.load(open(f'cap/{mode}/meta.json')); cx, cy = m['clip']['x'], m['clip']['y']
tiles = []
for spec in sys.argv[3:]:
    xy, f = spec.split(':'); X, Y = [float(v) for v in xy.split(',')]
    im = Image.open(f'cap/{mode}/f{int(f):03d}.png').convert('RGB')
    x = int((X - cx) * 2); y = int((Y - cy) * 2)
    tiles.append(im.crop((x - 140, y - 300, x + 140, y + 40)))
W, H = tiles[0].size
cols = min(4, len(tiles)); rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + 4), rows * (H + 4)), (0, 0, 0))
for k, t in enumerate(tiles): sheet.paste(t, ((k % cols) * (W + 4), (k // cols) * (H + 4)))
sheet.save(out); print(sheet.size)
