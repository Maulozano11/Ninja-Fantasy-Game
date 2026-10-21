# fase-cuerpo.png: the owner's reference next to the phase bodies of three presets (3x), labels in Spanish.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from comp import composite
from PIL import Image, ImageDraw, ImageFont

W = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase'
RAW = f'{W}/fix2/rawd'
REF = f'{W}/../phase-ref/owner-phase-ref.jpg'
GROUND = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/assets/maps/river_forest/ground.webp'
S = 3
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)

presets = [(0, 'Solen (clan Ryusei)'), (1, 'Akira'), (2, 'Aiden')]
cols = [('s', 'idle_0', 'Sprite normal', 'black'), ('p', 'idle_0', 'Fase en reposo', 'black'), ('p', 'run_2', 'Fase en el salto', 'black'), ('p', 'run_2', 'Sobre el mapa (transparente)', 'ground')]

def load(name):
    return np.frombuffer(open(os.path.join(RAW, name + '.raw'), 'rb').read(), dtype=np.uint8).reshape(256, 256, 4)

# One crop box for every cell (the union of all figures).
all_ims = [load(f'{k}{i}_{p}') for i, _ in presets for k, p, _, _ in cols]
ys, xs = np.where(np.any(np.stack([im[:, :, 3] for im in all_ims]) > 0, axis=0))
x0, x1, y0, y1 = xs.min() - 3, xs.max() + 4, ys.min() - 3, ys.max() + 4
cw, ch = (x1 - x0) * S, (y1 - y0) * S

ground = Image.open(GROUND).convert('RGB')
gx, gy = int(7.25 * 57) - (x1 - x0) // 2, 360 + int(10.25 * 38) - (y1 - y0) + 12
grass = np.asarray(ground.crop((gx, gy, gx + x1 - x0, gy + y1 - y0))).astype(float)

def cell(im, bg, phase):
    body = im[y0:y1, x0:x1]
    b = grass if bg == 'ground' else np.zeros(body.shape[:2] + (3,)) + np.array([8, 10, 18], float)
    if phase:
        # As the battle draws it (sprite/phase.ts): the ground turned blue, the body laid over and added as light.
        o = composite(body, b, k=1.0, hue=1.0)
    else:
        a = body[..., 3:4].astype(float) / 255
        o = b * (1 - a) + body[..., :3].astype(float) * a
    return Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).resize((cw, ch), Image.NEAREST)

head = 70
label = 36
ref_h = ch * len(presets) + label * (len(presets) - 1)
ref_w = ref_h
pad = 16
Wd = pad + ref_w + pad + len(cols) * (cw + pad)
Hd = head + label + ref_h + pad + 40
sheet = Image.new('RGB', (Wd, Hd), (14, 16, 24))
d = ImageDraw.Draw(sheet)
d.text((pad, 18), 'La fase de los Ryusei: el cuerpo del ninja hecho luz azul (Golpe Warp e Intercambio)', font=FONT, fill=(226, 236, 255))
ref = Image.open(REF).convert('RGB').resize((ref_w, ref_w), Image.LANCZOS)
sheet.paste(ref, (pad, head + label))
d.text((pad, head + 6), 'Tu imagen de referencia', font=SMALL, fill=(180, 200, 255))
for j, (_, _, name, _) in enumerate(cols):
    d.text((pad + ref_w + pad + j * (cw + pad), head + 6), name, font=SMALL, fill=(180, 200, 255))
for r, (i, pname) in enumerate(presets):
    y = head + label + r * (ch + label)
    for j, (k, p, _, bg) in enumerate(cols):
        x = pad + ref_w + pad + j * (cw + pad)
        sheet.paste(cell(load(f'{k}{i}_{p}'), bg, k == 'p'), (x, y))
    if r:
        d.text((pad + ref_w + pad, y - label + 8), pname, font=SMALL, fill=(240, 240, 240))
    else:
        d.text((pad + ref_w + pad + 4, y + 6), pname, font=SMALL, fill=(240, 240, 240))
d.text((pad, Hd - 34), 'A 3x: cada píxel del juego es un cuadro de 3x3. El color se tomó de tu imagen: azul eléctrico, contornos casi blancos, pelo blanco azulado y un brillo azul alrededor; sobre el mapa se ve el pasto a través del cuerpo.', font=SMALL, fill=(170, 180, 200))
sheet.save(f'{W}/fase-cuerpo.png')
print(sheet.size)
