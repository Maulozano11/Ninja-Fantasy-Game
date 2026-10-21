import re, json, zlib, base64, sys
import numpy as np
from PIL import Image
src = open('/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3-refdata.ts').read()
m = re.search(r'export const PV3_LIGHT[^=]*= (\{.*?\n\});', src, re.S)
L = json.loads(m.group(1))['blast']
a = np.frombuffer(zlib.decompress(base64.b64decode(L['a'])), np.uint8).reshape(L['h'], L['w'])
print(L['x'], L['y'], L['w'], L['h'], L['rgb'])
W, H = 266, 173
A = np.zeros((H, W)); A[L['y']:L['y']+L['h'], L['x']:L['x']+L['w']] = a
np.save(sys.argv[1], A)
for y in range(80, 172, 6):
    print(y, ' '.join('%3d' % A[y, x] for x in range(150, 266, 5)))
