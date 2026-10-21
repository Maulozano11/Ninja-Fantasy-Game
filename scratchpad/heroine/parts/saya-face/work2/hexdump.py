"""hexdump.py which x0 y0 x1 y1: her native pixels (quantized to her palette) as hex, one row per line."""
import sys
sys.path.insert(0, 'tools/refs')
import heroine_ref as H
which = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
N = H.native(which)
q = H.quantize(N[y0:y1, x0:x1], which)
P = H.PALETTES[which]
print('     ' + ' '.join('%-6d' % x for x in range(x0, x1)))
for j in range(q.shape[0]):
    print('%3d  ' % (y0 + j) + ' '.join(P[int(v)].lstrip('#') for v in q[j]))
