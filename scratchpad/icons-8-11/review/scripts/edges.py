import sys, json
import numpy as np
from PIL import Image
R = sys.argv[1]
for s in ['8','9','10','11']:
    nat = np.asarray(Image.open(f'{R}/stage/s{s}/ref/native-{s}.png').convert('RGB')).astype(float)
    L = nat.mean(2)
    crops = json.load(open(f'{R}/stage/s{s}/ref/crops.json'))
    for jid, ic in crops['icons'].items():
        win = ic.get('window', ic['box'])
        x0,y0,x1,y1 = win
        # scan outward/inward: dark fraction for columns x0-3..x0+3, x1-4..x1+2, rows likewise
        def colfrac(x): return np.mean(L[y0:y1, x] < 30)
        def rowfrac(y): return np.mean(L[y, x0:x1] < 30)
        def collum(x): return L[y0:y1, x].mean()
        def rowlum(y): return L[y, x0:x1].mean()
        print(s, jid, 'window', win, 'box', ic['box'])
        print('  left  ', [(x, round(colfrac(x),2), round(collum(x))) for x in range(x0-3, x0+3)])
        print('  right ', [(x, round(colfrac(x),2), round(collum(x))) for x in range(x1-3, x1+3)])
        print('  top   ', [(y, round(rowfrac(y),2), round(rowlum(y))) for y in range(y0-3, y0+3)])
        print('  bottom', [(y, round(rowfrac(y),2), round(rowlum(y))) for y in range(y1-3, y1+3)])
