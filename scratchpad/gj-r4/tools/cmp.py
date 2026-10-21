# cmp.py stageGroupDir out.png name anim frame x0 y0 x1 y1 [zoom]
# his crop (box-resampled to game scale) | ours on his panel | ours on green, for a region of the sprite frame
import sys, json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
stage, out, name, anim = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
fi = int(sys.argv[5]); x0,y0,x1,y1 = map(int, sys.argv[6:10]); z = int(sys.argv[10]) if len(sys.argv) > 10 else 4
man = json.load(open(stage + '/manifest.json'))['sprites'][name]
rm = json.load(open(S + '/art2/vfx-genjutsu-v3-refmap.json'))[name]
fw, fh = man['frameW'], man['frameH']
sheet = Image.open(stage + '/' + man['file']).convert('RGBA')
row = man['anims'][anim]['row']
fr = np.asarray(sheet.crop((fi * fw, row * fh, fi * fw + fw, row * fh + fh))).astype(float)
room = (man['anchor'][0] - rm['anchor'][0], man['anchor'][1] - rm['anchor'][1])
ref = Image.open(S + '/art2/REF-genjutsu-set-owner.jpg').convert('RGB')
k = rm['k']; ox, oy = rm['origin']
box = (ox + (x0 - room[0]) / k, oy + (y0 - room[1]) / k, ox + (x1 - room[0]) / k, oy + (y1 - room[1]) / k)
w, h = x1 - x0, y1 - y0
his = np.asarray(ref.resize((w, h), Image.BOX, box=box)).astype(float)
reg = fr[y0:y1, x0:x1]
def comp(bg):
    a = reg[..., 3:] / 255
    return (reg[..., :3] * a + np.array(bg, float) * (1 - a)).astype(np.uint8)
imgs = [his.astype(np.uint8), comp([32, 32, 42]), comp([84, 110, 70])]
O = Image.new('RGB', (3 * w * z + 20, h * z + 14), (0, 0, 0))
for i, a in enumerate(imgs):
    O.paste(Image.fromarray(a).resize((w * z, h * z), Image.NEAREST), (i * (w * z + 10), 14))
ImageDraw.Draw(O).text((2, 1), f'{name} {anim}[{fi}] x{x0}-{x1} y{y0}-{y1}  his | ours on his panel | ours on green', fill=(255, 255, 0))
O.save(out)
