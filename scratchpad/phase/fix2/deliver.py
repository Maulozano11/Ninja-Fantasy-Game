# Frame strip (PNG) and animated GIF of a capture, labels in Spanish.
#   python3 deliver.py warp golpe-warp "Golpe Warp"
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

W = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase'
mode, name, title = sys.argv[1], sys.argv[2], sys.argv[3]
cap = f'{W}/fix2/cap/{mode}'
meta = json.load(open(f'{cap}/meta.json'))
step = meta['step']
n = meta['frames']
BOLD = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
REG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)

frames = [Image.open(f'{cap}/f{i:03d}.png').convert('RGB') for i in range(n + 1)]
fw, fh = frames[0].size
# Crop to the action: the clip had 170 css px (340 px) each side of the two ends.
cx0, cx1 = 170, fw - 60
cy0, cy1 = 40, fh
frames = [f.crop((cx0, cy0, cx1, cy1)) for f in frames]
fw, fh = frames[0].size

# Key moments (ms after the click): before, turning to light, the flare, the leap, the trail, landing, solid.
if mode == 'warp':
    keys = [(0, 'antes'), (4, 'se vuelve luz'), (6, 'destello'), (9, 'salta como luz'), (12, 'rastro de fantasmas'), (14, 'llega'), (16, 'se solidifica'), (20, 'sólido otra vez')]
else:
    keys = [(0, 'antes'), (4, 'los dos se vuelven luz'), (6, 'destello'), (9, 'se cruzan'), (12, 'rastros'), (14, 'llegan'), (16, 'se solidifican'), (20, 'cambiados de lugar')]
cols, rows = 4, 2
lab = 44
head = 64
strip = Image.new('RGB', (cols * fw + (cols + 1) * 8, head + rows * (fh + lab) + (rows + 1) * 8), (14, 16, 24))
d = ImageDraw.Draw(strip)
d.text((12, 16), f'{title}: la fase de los Ryusei en la batalla (a 2x; momentos clave, en milisegundos desde el clic)', font=BOLD, fill=(226, 236, 255))
for k, (i, text) in enumerate(keys):
    x = 8 + (k % cols) * (fw + 8)
    y = head + 8 + (k // cols) * (fh + lab + 8)
    d.text((x + 4, y + 8), f'{i * step} ms · {text}', font=REG, fill=(180, 200, 255))
    strip.paste(frames[i], (x, y + lab))
strip.save(f'{W}/{name}.png', optimize=True)

# The GIF: every frame at its own time (real speed), a pause at each end, a title bar.
bar = 46
out = []
for i, f in enumerate(frames):
    im = Image.new('RGB', (fw, fh + bar), (14, 16, 24))
    im.paste(f, (0, bar))
    dd = ImageDraw.Draw(im)
    dd.text((10, 10), f'{title} · velocidad real', font=BOLD, fill=(226, 236, 255))
    t = f'{i * step} ms'
    dd.text((fw - 10 - dd.textlength(t, font=REG), 13), t, font=REG, fill=(180, 200, 255))
    out.append(im.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
durs = [500] + [step] * (len(out) - 2) + [900]
out[0].save(f'{W}/{name}.gif', save_all=True, append_images=out[1:], duration=durs, loop=0, optimize=True, disposal=1)
print(name, strip.size, (fw, fh + bar), len(out), os.path.getsize(f'{W}/{name}.gif') // 1024, 'KB')
