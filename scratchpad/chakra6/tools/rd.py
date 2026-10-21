import json, base64, re, numpy as np
TS = '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-chakra-v3-refdata.ts'
def load(ts=TS):
    s = open(ts).read()
    pal = json.loads(re.search(r'CK_PAL: CkPal\[\] = (.*?);\n', s).group(1))
    ref = json.loads(re.search(r'CK_REF: Record<string, CkSprite> = (.*);\n', s, re.S).group(1))
    return pal, ref
def piece(ref, name, pn):
    sp = ref[name]; pc = sp['pieces'][pn]
    b = base64.b64decode(pc['rle']); flat = []
    for k in range(0, len(b) - 1, 2): flat += [b[k+1]] * b[k]
    out = np.zeros((sp['h'], sp['w']), np.int32)
    out[pc['y']:pc['y']+pc['h'], pc['x']:pc['x']+pc['w']] = np.array(flat).reshape(pc['h'], pc['w'])
    return out
def palrgba(pal):
    return np.array([[int(p['rgba'][i:i+2], 16) for i in (1, 3, 5, 7)] for p in pal], float)
