"""Print part of a debug icon text (palette letters) with coordinates. usage: txt.py file x0 y0 x1 y1"""
import sys

lines = open(sys.argv[1]).read().split('\n')
blank = lines.index('')
pal = lines[:blank]
rows = [r for r in lines[blank + 1:] if r]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
print('    ' + ''.join(str(x % 10) for x in range(x0, x1 + 1)))
for y in range(y0, y1 + 1):
    print('%3d ' % y + rows[y][x0:x1 + 1])
print(' '.join(pal))
