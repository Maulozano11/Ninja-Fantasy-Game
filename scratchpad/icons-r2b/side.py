# usage: side.py <refdir> <outdir> <id> <size> <zoom> <dest> [crop x0 y0 x1 y1 in icon px]
import sys
from PIL import Image
ref, out, iid, N, Z, dest = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
his = Image.open(f'{ref}/{iid}.png').convert('RGB')
his = his.crop((1, 1, his.width - 1, his.height - 1)).resize((N, N), Image.BOX)
ours = Image.open(f'{out}/{iid}{"" if N == 44 else "@2x"}.png').convert('RGB')
box = (0, 0, N, N)
if len(sys.argv) > 7:
    box = tuple(int(v) for v in sys.argv[7:11])
a, b = his.crop(box), ours.crop(box)
w, h = a.size
s = Image.new('RGB', (w * Z * 2 + 8, h * Z), (20, 20, 24))
s.paste(a.resize((w * Z, h * Z), Image.NEAREST), (0, 0))
s.paste(b.resize((w * Z, h * Z), Image.NEAREST), (w * Z + 8, 0))
s.save(dest)
