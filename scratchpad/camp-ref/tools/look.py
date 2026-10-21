# python3 look.py <rawdir> <pose> <frame> <weapon> <out> [scale] [crop]
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet import grid

R, pose, f, w, out = sys.argv[1:6]
scale = int(sys.argv[6]) if len(sys.argv) > 6 else 3
crop = tuple(int(v) for v in sys.argv[7].split(',')) if len(sys.argv) > 7 else (80, 116, 168, 220)
rows = [(b, [f'{R}/p{i}-{b}-{w}-{pose}-{f}.rgba' for i in range(3)]) for b in ['male', 'female', 'bulky', 'slender']]
grid(rows, out, scale=scale, crop=crop, label_w=60)
