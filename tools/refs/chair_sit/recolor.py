"""His Solen's layers recoloured toward three of his generator's versions, side by side with them."""
import colorsys, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
S = sys.argv[1]
s = np.load(S + '/solen_small.npy').astype(float)
lab = np.load(S + '/labels.npy', allow_pickle=True)
H, W, _ = s.shape
alpha = lab != ''
F = lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)


def recolor(img, mask, target):
    """His shading kept: each pixel's value relative to the layer's base, the hue and saturation of
    `target`; his darkest line pixels stay his."""
    out = img.copy()
    px = img[mask] / 255.0
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px])
    base_v = np.median(hsv[:, 2]); base_s = np.median(hsv[:, 1])
    th, ts, tv = colorsys.rgb_to_hsv(*(np.array(target) / 255.0))
    res = []
    for (h, sat, v), p in zip(hsv, px):
        if v < 0.1:
            res.append(p); continue
        rel = v / max(base_v, 1e-3)
        nv = min(0.97, tv * rel ** 0.85)
        ns = ts * (0.7 + 0.3 * min(1.0, rel))
        # highlights pale toward white, shadows keep their colour (his shading, the new colour)
        ns *= 1 - max(0.0, nv - 0.82) * 2.2
        res.append(colorsys.hsv_to_rgb(th, ns, nv))
    out[mask] = np.array(res) * 255
    return out


VERSIONS = [
    ('2: pelo castaño, capa roja', {'pelo': (120, 64, 32), 'capa': (170, 30, 30), 'bufanda': (60, 50, 50)}),
    ('3: pelo blanco, todo negro', {'pelo': (225, 225, 232), 'capa': (40, 30, 34), 'bufanda': (40, 30, 34), 'armadura': (60, 55, 62), 'ropa': (30, 26, 30), 'pantalon': (35, 30, 35)}),
    ('5: rubio, capa blanca y azul', {'pelo': (230, 196, 110), 'capa': (230, 228, 220), 'bufanda': (230, 228, 220), 'ropa': (30, 50, 140), 'pantalon': (30, 45, 110), 'armadura': (200, 205, 215)}),
]
sheet = np.array(Image.open('docs/reference/poses/chair-seated-variants-owner-reference.png').convert('RGB'))
CW = sheet.shape[1] // 5
Z = 4
tiles = []
base = Image.fromarray(np.where(alpha[..., None], s, (36, 36, 44)).astype(np.uint8)).resize((W * Z, H * Z), Image.NEAREST)
for i, (name, cols) in enumerate(VERSIONS):
    img = s.copy()
    for layer, col in cols.items():
        m = lab == layer
        if m.any():
            img = recolor(img, m, col)
    ours = Image.fromarray(np.where(alpha[..., None], img, (36, 36, 44)).astype(np.uint8)).resize((W * Z, H * Z), Image.NEAREST)
    c = int(name[0]) - 1
    his = Image.fromarray(sheet[0:470, c * CW:(c + 1) * CW])
    his = his.resize((int(his.width * H * Z / his.height), H * Z), Image.LANCZOS)
    tiles.append((name, his, ours))
tw = max(t[1].width for t in tiles) + W * Z + 30
out = Image.new('RGB', (tw * 3 + 40 + W * Z + 30, H * Z + 110), (24, 22, 28))
d = ImageDraw.Draw(out)
d.text((14, 10), 'Las capas de tu Solen recoloreadas (nuestro juego) junto a las versiones de tu generador', font=F(22), fill=(246, 205, 120))
out.paste(base, (14, 80)); d.text((14, 52), 'Tu Solen (base)', font=F(16), fill=(236, 228, 212))
x = 14 + W * Z + 30
for name, his, ours in tiles:
    d.text((x, 52), name, font=F(16), fill=(236, 228, 212))
    out.paste(his, (x, 80)); out.paste(ours, (x + his.width + 6, 80))
    d.text((x, 80 + H * Z + 4), 'tu generador', font=F(12), fill=(180, 180, 190)); d.text((x + his.width + 6, 80 + H * Z + 4), 'nuestras capas', font=F(12), fill=(140, 230, 160))
    x += his.width + W * Z + 40
out.save(S + '/recolor_vs_his.png'); print(out.size)
