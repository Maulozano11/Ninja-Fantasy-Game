# Before/after verification sheets for every frame of read / lean / sit.
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet import grid

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref'
B, A = f'{D}/raw-before', f'{D}/raw-after'
OUT = f'{D}/verify'
os.makedirs(OUT, exist_ok=True)
FR = {'lean': 4, 'sit': 4, 'read': 12}
CROP = {'lean': (70, 120, 150, 222), 'sit': (76, 124, 150, 224), 'read': (76, 124, 152, 224)}
for pose, n in FR.items():
    for i in range(3):
        rows = []
        for body in ['male', 'female', 'bulky', 'slender']:
            for w in ['held', 'none']:
                for tag, R in [('antes', B), ('ahora', A)]:
                    rows.append((f'{body} {w} {tag}', [f'{R}/p{i}-{body}-{w}-{pose}-{f}.rgba' for f in range(n)]))
        grid(rows, f'{OUT}/{pose}-p{i}.png', scale=2, crop=CROP[pose], label_w=120)
    print(pose)
