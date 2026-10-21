import sys, json, base64
import numpy as np
def load(ts, name):
    t = open(ts).read()
    pal = json.loads(t[t.index('PV3_PAL: PoisonPal[] = ') + len('PV3_PAL: PoisonPal[] = '):].split(';\n')[0])
    ref = json.loads(t[t.index('PV3_REF: Record<string, PoisonRef> = ') + len('PV3_REF: Record<string, PoisonRef> = '):].rstrip().rstrip(';'))
    r = ref[name]
    idx = np.zeros((r['h'], r['w']), np.int32)
    own = np.full((r['h'], r['w']), '', object)
    for pn, pc in r['pieces'].items():
        b = base64.b64decode(pc['rle'])
        flat = []
        for i in range(0, len(b), 2):
            flat += [b[i + 1]] * b[i]
        a = np.array(flat).reshape(pc['h'], pc['w'])
        sub = idx[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']]
        sub[a > 0] = a[a > 0]
        o = own[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']]
        o[a > 0] = pn
    return pal, r, idx, own
if __name__ == '__main__':
    ts, name = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = map(int, sys.argv[3].split(','))
    pal, r, idx, own = load(ts, name)
    for y in range(y0, y1):
        print('%3d ' % y + ' '.join(('.' if not idx[y, x] else pal[idx[y, x] - 1]['kind'][0] + own[y, x][0]) for x in range(x0, x1)))
