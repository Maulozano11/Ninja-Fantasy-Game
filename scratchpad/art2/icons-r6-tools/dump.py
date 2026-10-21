# dump.py txt x0 x1 y0 y1 : the debug letter dump of an icon, rows y0..y1-1, columns x0..x1-1, with coordinates
import sys
lines = open(sys.argv[1]).read().split('\n')
i = lines.index('')
pal = lines[:i]; rows = lines[i + 1:]
x0, x1, y0, y1 = [int(v) for v in sys.argv[2:6]]
print('   ' + ''.join(str(x % 10) for x in range(x0, x1)), '  ', ' '.join(pal))
for y in range(y0, y1): print(f'{y:2d} ' + rows[y][x0:x1])
