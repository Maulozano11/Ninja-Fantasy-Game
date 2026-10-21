import sys, json, re, base64
import numpy as np
sys.path.insert(0, '.')
def load(path):
    txt = open(path).read()
    PAL = json.loads(re.search(r'CK_PAL: CkPal\[\] = (\[.*?\]);', txt, re.S).group(1))
    REF = json.loads(re.search(r'CK_REF: Record<string, CkSprite> = (\{.*\});', txt, re.S).group(1))
    return PAL, REF
def dec(pc, w, h):
    b = base64.b64decode(pc['rle']); out = np.zeros(pc['w'] * pc['h'], np.int32); i = 0
    for k in range(0, len(b) - 1, 2):
        out[i:i + b[k]] = b[k + 1]; i += b[k]
    f = np.zeros((h, w), np.int32); f[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']] = out.reshape(pc['h'], pc['w']); return f
if __name__ == "__main__":
  P0, R0 = load(sys.argv[1]); P1, R1 = load(sys.argv[2])
  print('palette same prefix:', P0 == P1[:len(P0)], len(P0), len(P1))
  for n in R0:
      a, b = R0[n], R1[n]
      if (a['w'], a['h'], a['anchor']) != (b['w'], b['h'], b['anchor']): print(n, 'SIZE/ANCHOR CHANGED')
      for pn in sorted(set(a['pieces']) | set(b['pieces'])):
          fa = dec(a['pieces'][pn], a['w'], a['h']) if pn in a['pieces'] else np.zeros((a['h'], a['w']), int)
          fb = dec(b['pieces'][pn], b['w'], b['h']) if pn in b['pieces'] else np.zeros((b['h'], b['w']), int)
          d = (fa != fb).sum()
          if d: print(n, pn, 'differs at', d, 'px; nonzero', (fa > 0).sum(), '->', (fb > 0).sum(), 'kinds new at diff:', {P1[v-1]['kind'] for v in fb[fa != fb] if v})
