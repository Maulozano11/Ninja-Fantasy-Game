# python3 qsheet.py <dir> <out.png> <cols> <scale> [x0,y0,x1,y1]
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet import grid

d, out, cols, scale = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 else None
names = open(f'{d}/list.txt').read().split()
rows = []
for k in range(0, len(names), cols):
    chunk = names[k:k + cols]
    rows.append((chunk[0].rsplit('-', 2)[0][:14], [f'{d}/{n}.rgba' for n in chunk]))
print(grid(rows, out, scale=scale, crop=crop, label_w=70))
