exec(open('exp1.py').read().split("f0 = key_frame('L')")[0])
from PIL import Image
rows = []
names = os.environ.get('NAMES', 'L2').split(',')
tiles = []
for n in names:
    for mode in ('up', 'mid', 'down'):
        m, rgba, eyes, see = pose(n, mode)
        ex, ey = BY[n]['eye']
        x0, y0 = int(ex) - 60, int(ey) - 50
        t = Image.new('RGBA', (100, 80), (0x5d, 0x6b, 0x57, 255))
        crop = np.zeros((80, 100, 4), np.uint8)
        H_, W_ = rgba.shape[:2]
        ys, xs = slice(max(0, y0), min(H_, y0 + 80)), slice(max(0, x0), min(W_, x0 + 100))
        crop[ys.start - y0:ys.stop - y0, xs.start - x0:xs.stop - x0] = rgba[ys, xs]
        t.alpha_composite(Image.fromarray(crop, 'RGBA'))
        tiles.append(t)
sheet = Image.new('RGBA', (103 * 3, 83 * len(names)), (0, 0, 0, 255))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % 3) * 103, (i // 3) * 83))
sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save('poses.png')
