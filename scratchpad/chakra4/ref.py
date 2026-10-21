"""Scratch: load vfx-chakra-v3-refdata.ts into numpy (pieces as full-frame index arrays, 0 = clear)."""
import base64, json, re
import numpy as np

import os
SRC = os.environ.get('REFDATA', '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-chakra-v3-refdata.ts')
txt = open(SRC).read()
PAL = json.loads(re.search(r'CK_PAL: CkPal\[\] = (\[.*?\]);', txt, re.S).group(1))
REF = json.loads(re.search(r'CK_REF: Record<string, CkSprite> = (\{.*\});', txt, re.S).group(1))
RGBA = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in PAL], np.float64)
KIND = [p['kind'] for p in PAL]


def decode(pc):
    b = base64.b64decode(pc['rle'])
    out = np.zeros(pc['w'] * pc['h'], np.int32)
    i = 0
    for k in range(0, len(b) - 1, 2):
        out[i:i + b[k]] = b[k + 1]
        i += b[k]
    return out.reshape(pc['h'], pc['w'])


def pieces(name):
    s = REF[name]
    out = {}
    for pn, pc in s['pieces'].items():
        f = np.zeros((s['h'], s['w']), np.int32)
        f[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']] = decode(pc)
        out[pn] = f
    return s, out


def kinds(ix):
    """Kind letter per pixel: . clear, o outline, g goldline, B blue, G gold, l glow, w warm, b barrier, s shade."""
    m = {'outline': 'o', 'goldline': 'g', 'blue': 'B', 'gold': 'G', 'glow': 'l', 'warm': 'w', 'barrier': 'b', 'shade': 's'}
    return np.array([['.' if v == 0 else m[KIND[v - 1]] for v in row] for row in ix])


def rgba(ix):
    out = np.zeros(ix.shape + (4,))
    nz = ix > 0
    out[nz] = RGBA[ix[nz] - 1]
    return out
