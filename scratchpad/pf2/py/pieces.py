"""pieces.py <refdata.ts> <sprite> <out.png> [scale] : each piece in false colour + the palette render"""
import json, re, sys, base64
import numpy as np
from PIL import Image
src = open(sys.argv[1]).read()
def grab(name):
    i = src.index('export const ' + name)
    j = src.index('=', i) + 1
    k = src.index(';\n', j)
    return json.loads(src[j:k])
PAL = grab('PV3_PAL'); REF = grab('PV3_REF')
def hexc(s): return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5, 7))
PC = [hexc(p['rgba']) for p in PAL]
def decode(name):
    r = REF[name]; W, H = r['w'], r['h']; out = {}
    for pn, pc in r['pieces'].items():
        L = np.zeros((H, W), np.int32)
        b = base64.b64decode(pc['rle']); i = 0
        for k in range(0, len(b) - 1, 2):
            n, v = b[k], b[k + 1]
            if v:
                for j in range(n):
                    L[pc['y'] + (i + j) // pc['w'], pc['x'] + (i + j) % pc['w']] = v
            i += n
        out[pn] = L
    return r, out
if __name__ == '__main__':
    name, outp = sys.argv[2], sys.argv[3]; k = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    r, P = decode(name)
    W, H = r['w'], r['h']
    cols = [(0, 200, 0), (255, 255, 0), (0, 90, 200), (255, 0, 0), (255, 140, 0), (255, 0, 255), (0, 255, 255), (150, 80, 255)]
    fc = np.zeros((H, W, 3), np.uint8) + 30
    real = np.zeros((H, W, 4), np.uint8)
    for c, (pn, L) in zip(cols, P.items()):
        fc[L > 0] = c
        m = L > 0
        real[m] = np.array([PC[v - 1] for v in L[m]], np.uint8)
    print(list(P.keys()))
    bg = np.zeros((H, W, 3), np.uint8) + np.array([84, 110, 70], np.uint8)
    a = real[..., 3:] / 255
    comp = (real[..., :3] * a + bg * (1 - a)).astype(np.uint8)
    can = np.concatenate([fc, comp], 1)
    Image.fromarray(can).resize((can.shape[1] * k, can.shape[0] * k), Image.NEAREST).save(outp)
