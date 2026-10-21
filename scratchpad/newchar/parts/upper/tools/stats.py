"""stats.py: colour counts per part layer (and per visible part)."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
import scarlet_ref as R
from collections import Counter

fig = R.reduced_index()
P = R.reduced_parts()
L = R.reduced_layers()
for name in ['torso', 'lining', 'armN', 'armF']:
    c = Counter(L[name][L[name] < 255].tolist())
    print(name, ' '.join(f'{R.CHARS[i]}{R.PALETTE[i]}:{n}' for i, n in sorted(c.items(), key=lambda t: -t[1])))
# the chest region of the torso layer only
sub = L['torso'][145:172, 118:136]
c = Counter(sub[sub < 255].tolist())
print('chest', ' '.join(f'{R.CHARS[i]}:{n}' for i, n in sorted(c.items(), key=lambda t: -t[1])))
