import re, json, zlib, base64, sys
import numpy as np
from PIL import Image
s = open(sys.argv[1] if len(sys.argv) > 1 else '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3-refdata.ts').read()
m = re.search(r'PV3_LIGHT: Record<string, PoisonLight> = (\{.*?\n\});', s, re.S)
L = json.loads(m.group(1))['blast']
a = np.frombuffer(zlib.decompress(base64.b64decode(L['a'])), np.uint8).reshape(L['h'], L['w'])
W = 291; H = 173
A = np.zeros((H, W)); A[L['y']:L['y'] + L['h'], L['x']:L['x'] + L['w']] = a
print('light box', L['x'], L['y'], L['w'], L['h'], 'rgb', L['rgb'])
np.save('blastA.npy', A)
for y in range(0, H, 6):
    print(f'{y:3d} ' + ''.join(' .:-=+*#%@'[min(9, int(A[y, x] / 255 * 10 * 1.6))] for x in range(100, W, 3)))
