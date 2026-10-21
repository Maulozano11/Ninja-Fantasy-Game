import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/r4/tools'); import dec, rv
import numpy as np
from PIL import Image
T = sys.argv[1]; name = sys.argv[2]; box = tuple(map(int, sys.argv[3].split(','))); k = int(sys.argv[4]) if len(sys.argv) > 4 else 8
key = int(sys.argv[5]) if len(sys.argv) > 5 else 5
a, s, A = dec.load(f'earth-{T}.ts'); fr = a['fly']
torso = (1448, 1755) if key == 5 else (792, 1755)
his = rv.his_game(torso, s, A).clip(0, 255).astype(np.uint8)
ours = rv.over(fr[key], rv.DARK)
x0, y0, x1, y1 = box
t = [Image.fromarray(im[y0:y1, x0:x1]).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST) for im in (his, ours)]
r = Image.new('RGB', (t[0].width * 2 + 6, t[0].height), (255, 0, 255))
r.paste(t[0], (0, 0)); r.paste(t[1], (t[0].width + 6, 0))
r.save(f'{T}-{name}.png')
