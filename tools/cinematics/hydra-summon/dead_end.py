"""The hydra's end (the owner's option A, 2026-10-30): from the battle with every stump sealed, the
body shudders, dust rises, the screen fades to black, then cut to his dead-hydra picture as a
final shot in cinema bands, the party standing on the left, a slow push-in. 30 fps, MP4 + GIF."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
S, OUT = sys.argv[1], sys.argv[2]
FD = OUT + '_frames'
os.makedirs(FD, exist_ok=True)
for f in os.listdir(FD):
    os.remove(os.path.join(FD, f))
W, H = 1920, 1080
_argv = sys.argv
sys.argv = [sys.argv[0], S, OUT]
exec(open(f'{S}/hydra/mount9.py').read())  # definitions only: the battle camera P()
sys.argv = _argv
W, H = 1920, 1080
last = Image.open(f'{S}/hydra/out_burn/burn_frames/f014.png').convert('RGBA')
for name, x, z in sorted([('leg_solen', 3.2, 2.0), ('leg_romano', 2.6, 6.0), ('leg_aiden', 1.8, 4.5), ('leg_lyra', 3.6, 7.5), ('leg_aurelia', 1.6, 9.5)], key=lambda q: q[2]):
    sp = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
    sp = sp.crop(sp.getbbox())
    sp = sp.resize((int(sp.width * 100 / sp.height), 100), Image.NEAREST)
    X, Y = P(x, z)
    last.alpha_composite(sp, (int(X - sp.width / 2), int(Y - sp.height)))
last = last.convert('RGB')
dead = Image.open(f'{S}/hydra/col19/dead.png').convert('RGB')
PARTY = [('leg_solen', 300, 700), ('leg_romano', 420, 745), ('leg_aiden', 230, 790), ('leg_lyra', 370, 820), ('leg_aurelia', 170, 850)]
rng = np.random.default_rng(3)
N = [0]


def save(im):
    im.save(f'{FD}/f{N[0]:04d}.png')
    N[0] += 1


DUST = [[rng.uniform(900, 1900), rng.uniform(820, 1000), rng.uniform(20, 50), rng.uniform(0.6, 1.0)] for _ in range(40)]
# 1. the body shudders, dust rises, the light goes
for i in range(42):
    t = i / 41
    amp = int(10 * (1 - t) ** 1.5) if i > 3 else 0
    im = last.transform(last.size, Image.AFFINE, (1, 0, ((i % 2) * 2 - 1) * amp, 0, 1, ((i // 2) % 3 - 1) * amp * 0.5), fillcolor=(0, 0, 0))
    lay = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(lay)
    for p in DUST:
        r = p[2] * (1 + 2.5 * t)
        a = int(140 * p[3] * min(1, t * 3) * (1 - t * 0.6))
        d.ellipse([p[0] - r * 1.5, p[1] - r - 60 * t, p[0] + r * 1.5, p[1] + r - 60 * t], fill=(150, 130, 110, a))
    im = Image.alpha_composite(im.convert('RGBA'), lay.filter(ImageFilter.GaussianBlur(10))).convert('RGB')
    if t > 0.55:
        im = Image.blend(im, Image.new('RGB', im.size), min(1, (t - 0.55) / 0.45))
    save(im)
for i in range(12):
    save(Image.new('RGB', (W, H)))
# 2. cut to the final shot in cinema bands, a slow push-in, the party victorious
T = 120
for i in range(T):
    t = i / (T - 1)
    z = 1 + 0.05 * t
    sh = dead.resize((int(1920 * z), int(640 * z)), Image.LANCZOS)
    ox, oy = int((sh.width - 1920) * 0.35), int((sh.height - 640) * 0.6)
    band = sh.crop((ox, oy, ox + 1920, oy + 640)).convert('RGBA')
    for name, x, y in PARTY:
        sp = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
        sp = sp.crop(sp.getbbox())
        h = int(78 * z)
        sp = sp.resize((int(sp.width * h / sp.height), h), Image.NEAREST)
        X, Y = (x * z - ox), ((y - 220) * z - oy)
        band.alpha_composite(sp, (int(X - sp.width / 2), int(Y - sp.height)))
    im = Image.new('RGB', (W, H))
    im.paste(band.convert('RGB'), (0, 220))
    if t < 0.15:
        im = Image.blend(Image.new('RGB', im.size), im, t / 0.15)
    save(im)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', OUT + '.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'fps=15,scale=800:450:flags=lanczos,split[a][b];[a]palettegen=max_colors=200[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', OUT + '.gif'], check=True)
print('ok', N[0])
