# Preview hand templates at 16x with the real skin ramp, next to the reference fists.
import sys, json
from PIL import Image, ImageDraw
ramp = ['#2a1012', '#9f4c48', '#d5846a', '#f3c39c', '#f4d4b3', '#f3e1cb']  # outline mixed later
ink = (7, 6, 11)
def hx(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
pal = {'o': ink, 'x': hx('#2a1012'), 'D': hx(ramp[1]), 's': hx(ramp[2]), 'b': hx(ramp[3]), 'l': hx(ramp[4])}
far = {'o': ink, 'x': hx('#2a1012'), 'D': hx('#6e3433'), 's': hx(ramp[1]), 'b': hx(ramp[2]), 'l': hx(ramp[3])}
tpls = json.load(open(sys.argv[1]))
K = 16
ref = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png').convert('RGBA')
crops = [ref.crop((14, 52, 30, 66)), ref.crop((50, 54, 64, 66))]
W = sum(max(len(r) for r in t['rows']) * K + 24 for t in tpls) + sum(c.width * K + 24 for c in crops)
H = max(16 * K, max(len(t['rows']) for t in tpls) * K) + 30
img = Image.new('RGB', (W, H), (236, 236, 240)); d = ImageDraw.Draw(img)
x = 8
for c in crops:
    big = c.resize((c.width * K, c.height * K), Image.NEAREST)
    bg = Image.new('RGBA', big.size, (236, 236, 240, 255)); bg.alpha_composite(big); img.paste(bg.convert('RGB'), (x, 24)); d.text((x, 6), 'ref', fill=(0, 0, 0)); x += big.width + 24
for t in tpls:
    p = far if t.get('far') else pal
    for r, row in enumerate(t['rows']):
        for c, ch in enumerate(row):
            if ch in p: d.rectangle([x + c * K, 24 + r * K, x + c * K + K - 1, 24 + r * K + K - 1], fill=p[ch])
    d.text((x, 6), t['name'], fill=(0, 0, 0)); x += max(len(r) for r in t['rows']) * K + 24
img.save(sys.argv[2]); print(img.size)
