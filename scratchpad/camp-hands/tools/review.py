# Review sheets: python3 review.py <rawdir> <outprefix> <pose> [bodies] [weapons] [frames] [scale]
import sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet import grid

raw, prefix, pose = sys.argv[1], sys.argv[2], sys.argv[3]
bodies = (sys.argv[4] if len(sys.argv) > 4 else 'male,female,bulky,slender').split(',')
weapons = (sys.argv[5] if len(sys.argv) > 5 else 'held,none').split(',')
frames = [int(f) for f in (sys.argv[6] if len(sys.argv) > 6 else '0').split(',')]
scale = int(sys.argv[7]) if len(sys.argv) > 7 else 3
rows = []
for b in bodies:
    for w in weapons:
        rows.append((f'{b} {w}', [f'{raw}/p{i}-{b}-{w}-{pose}-{f}.rgba' for i in range(3) for f in frames]))
grid(rows, f'{prefix}-{pose}.png', scale=scale, label_w=90)
print(f'{prefix}-{pose}.png')
