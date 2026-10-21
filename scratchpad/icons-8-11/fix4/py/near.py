"""near.py <id> <cw> <hex> [hex ...]: the nearest palette entries (as the generator's dist: lightness x1.4, a/b x cw) of each colour,
palette read from fix4/debug/<id>-44.txt."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m

jid, cw = sys.argv[1], float(sys.argv[2])
pal = []
for line in open(f'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4/debug/{jid}-44.txt'):
    line = line.strip()
    if not line:
        break
    pal.append(line.split()[1].lstrip('#'))
P = m.oklab(np.array([m.hx(p) for p in pal]))
for h in sys.argv[3:]:
    c = m.oklab(m.hx(h))
    d = ((P[:, 0] - c[0]) * 1.4) ** 2 + ((P[:, 1] - c[1]) * cw) ** 2 + ((P[:, 2] - c[2]) * cw) ** 2
    o = np.argsort(d)[:3]
    L, C, H = m.lch(m.hx(h))
    print(f'{h} (L {L:.2f} C {C:.3f} h {H:.0f}) -> ' + ', '.join(f'{pal[i]} {np.sqrt(d[i]):.3f}' for i in o))
