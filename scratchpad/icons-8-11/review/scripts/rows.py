import sys
import numpy as np
from PIL import Image
R = sys.argv[1]
s, rows, cols = sys.argv[2], sys.argv[3], sys.argv[4]
nat = np.asarray(Image.open(f'{R}/stage/s{s}/ref/native-{s}.png').convert('RGB')).astype(int)
r0, r1 = map(int, rows.split(':')); c0, c1 = map(int, cols.split(':'))
for y in range(r0, r1):
    print(y, ' '.join('%02x%02x%02x' % tuple(nat[y, x]) for x in range(c0, c1)))
