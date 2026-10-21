# Before/after verification sheets for every camp frame.
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet import grid

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-hands'
B, A = f'{D}/raw-before', f'{D}/raw-after'
OUT = f'{D}/verify'
os.makedirs(OUT, exist_ok=True)
FR = {'lean': 4, 'sit': 4, 'read': 12, 'train': 8}
CROP = {'lean': (74, 112, 170, 222), 'sit': (74, 112, 170, 222), 'read': (74, 112, 170, 222), 'train': (40, 70, 216, 230)}
for pose, n in FR.items():
    for i in range(3):
        rows = []
        for body in ['male', 'female', 'bulky', 'slender']:
            for w in ['held', 'none']:
                for tag, R in [('antes', B), ('ahora', A)]:
                    rows.append((f'{body} {w} {tag}', [f'{R}/p{i}-{body}-{w}-{pose}-{f}.rgba' for f in range(n)]))
        grid(rows, f'{OUT}/{pose}-p{i}.png', scale=2, crop=CROP[pose], label_w=120)
    print(pose)
rows = []
for i in range(3):
    for tag, R in [('antes', B), ('ahora', A)]:
        rows.append((f'p{i} naginata {tag}', [f'{R}/p{i}-male-pole-train-{f}.rgba' for f in range(8)]))
grid(rows, f'{OUT}/pole.png', scale=2, crop=CROP['train'], label_w=120)
