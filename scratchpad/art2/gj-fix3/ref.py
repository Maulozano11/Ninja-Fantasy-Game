# Loads the refdata (palette + pieces) for debugging.
import json, base64, re
import numpy as np
from PIL import Image, ImageDraw
SRC = '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3-refdata.ts'
def load(path=SRC):
    t = open(path).read()
    pal = json.loads(re.search(r'GJ_PAL: GjPal\[\] = (.*?);\n', t, re.S).group(1))
    ref = json.loads(re.search(r'GJ_REF: Record<string, GjSprite> = (.*?);\n', t, re.S).group(1))
    return pal, ref
PAL, REF = load()
PALC = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in PAL], np.float64)
KIND = [p['kind'] for p in PAL]
def piece(name, pn):
    s = REF[name]; pc = s['pieces'][pn]
    b = base64.b64decode(pc['rle']); flat = []
    for i in range(0, len(b), 2): flat += [b[i + 1]] * b[i]
    out = np.zeros((s['h'], s['w']), np.int32)
    out[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']] = np.array(flat).reshape(pc['h'], pc['w'])
    return out
def rgba(idx):
    o = np.zeros(idx.shape + (4,)); m = idx > 0; o[m] = PALC[idx[m] - 1]; return o
def comp(idx_list, bg=(32, 32, 42)):
    H, W = idx_list[0].shape
    o = np.zeros((H, W, 3)) + np.array(bg, np.float64)
    for idx in idx_list:
        c = rgba(idx); a = c[..., 3:] / 255
        o = c[..., :3] * a + o * (1 - a)
    return o.astype(np.uint8)
def save(arr, path, z=4):
    im = Image.fromarray(arr); im.resize((im.width * z, im.height * z), Image.NEAREST).save(path)
