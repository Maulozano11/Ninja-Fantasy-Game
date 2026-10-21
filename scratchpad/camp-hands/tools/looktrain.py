# python3 looktrain.py <rawdir> <preset> <weapon> <frames a,b,..> <out> [scale]
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet import grid

R, i, w, frames, out = sys.argv[1:6]
scale = int(sys.argv[6]) if len(sys.argv) > 6 else 2
bodies = ['male', 'female', 'bulky', 'slender']
body = lambda b: 'male' if w == 'pole' else b
rows = [(f'f{f}', [f'{R}/p{i}-{body(b)}-{w}-train-{f}.rgba' for b in (bodies if w != 'pole' else ['male'])]) for f in frames.split(',')]
grid(rows, out, scale=scale, crop=(40, 70, 216, 230), label_w=30)
