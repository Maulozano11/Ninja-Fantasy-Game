"""His seated Solen (145x156 at 5.6 picture px each) split into layers: every pixel to the layer whose
material and place it is (first draft, to be checked on the label map)."""
import colorsys, json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

S = sys.argv[1]
s = np.load(S + '/solen_small.npy').astype(int)
H, W, _ = s.shape
r, g, b = s[..., 0], s[..., 1], s[..., 2]
# magenta and its fringe are background
mag = ((r - g) > 55) & ((b - g) > 45)
alpha = ~mag & ~((r > 150) & (b > 150) & (g < 120))
hsv = np.array([[colorsys.rgb_to_hsv(*(p / 255.0)) for p in row] for row in s])
hue, sat, val = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
Y, X = np.mgrid[0:H, 0:W]


def box(x0, y0, x1, y1):
    return (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)


def poly(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon(pts, fill=1)
    return np.array(im) > 0


lum = (r * 0.3 + g * 0.59 + b * 0.11)
grey = (sat < 0.18) & (val > 0.12)
skin = (r > 140) & (r > g + 25) & (g > b + 10) & (g > 80) & (sat > 0.25) & (sat < 0.6)
red = ((hue < 18) | (hue > 340)) & (sat > 0.5) & (val > 0.3)
gold = (hue >= 25) & (hue <= 55) & (sat > 0.45) & (val > 0.45)
brown = (hue >= 10) & (hue <= 40) & (sat > 0.25) & (val <= 0.55)
navy = (hue >= 200) & (hue <= 250) & (sat > 0.2) & (val < 0.5)
blue_hair = navy | ((hue >= 195) & (hue <= 240) & (val < 0.75) & (sat > 0.15))
steel = (sat < 0.2) & (val > 0.55)
dark = val < 0.12

# --- the places (his figure, read off the grid sheet) ---------------------------------------------
HEAD = poly([(60, 10), (70, 2), (88, 3), (98, 16), (97, 31), (90, 36), (66, 36), (57, 26)])
FACE = poly([(66, 22), (88, 22), (90, 34), (84, 40), (72, 40), (66, 33)])
SCARF = poly([(56, 33), (100, 33), (104, 49), (80, 52), (56, 50)])
TORSO = poly([(58, 40), (100, 40), (106, 52), (104, 78), (64, 80), (52, 60)])
ARM_L = poly([(50, 48), (66, 46), (70, 80), (54, 82), (48, 62)])
ARM_R = poly([(96, 44), (108, 52), (120, 64), (128, 76), (118, 84), (100, 74)])
LAP = poly([(64, 72), (100, 72), (108, 92), (96, 100), (70, 98)])
LEGS = poly([(68, 90), (128, 90), (130, 112), (100, 112), (70, 112)])
SHINS = box(70, 106, 145, 156)
CAPE = poly([(44, 36), (60, 34), (62, 60), (58, 90), (52, 118), (44, 150), (28, 153), (6, 141), (5, 110), (22, 98), (40, 62)])
SHIN_L = box(72, 108, 97, 156)
SHIN_R = box(110, 108, 145, 153)
ARMREST_L = box(48, 74, 70, 88)
ARMREST_R = box(100, 76, 132, 90)
SEAT = poly([(88, 96), (118, 96), (120, 112), (98, 112), (90, 108)])
FIG = HEAD | FACE | SCARF | TORSO | ARM_L | ARM_R | LAP | LEGS | SHIN_L | SHIN_R | CAPE
CHAIR_LEGS = box(54, 106, 68, 150) | box(98, 106, 112, 150)

lab = np.full((H, W), '', dtype=object)


def put(mask, name):
    m = mask & alpha & (lab == '')
    lab[m] = name


# order matters: the most certain first
put(FACE & skin, 'piel')
put(box(70, 24, 86, 30) & ((red & (val > 0.3)) | ((r > 110) & (g < 70) & (b < 70)) | dark), 'cara')  # his red eyes

put(HEAD & (blue_hair | dark) & ~FACE, 'pelo')
put(FACE & blue_hair, 'pelo')  # bangs over the face
put(SCARF & (grey | dark), 'bufanda')
put(skin & (ARM_L | ARM_R | SHINS | LAP), 'piel')
put((ARM_L | ARM_R | TORSO) & steel, 'armadura')
put(TORSO & red, 'banda')
put(LAP & red, 'faldon')
put((TORSO | LAP) & (gold | brown), 'cinturon')
put((LEGS | LAP) & navy, 'pantalon')
put(LEGS & gold, 'pantalon')  # his gold dots on the trousers
put((SHIN_L | SHIN_R) & (brown | dark | gold | skin), 'sandalias')
# the chair where it shows inside the figure's places: armrests, the seat's front, its legs
put((ARMREST_L | ARMREST_R) & (red | gold | brown) & ~skin, 'silla')
put(SEAT & (red | gold | brown), 'silla')
put(CHAIR_LEGS & ~SHIN_L & ~SHIN_R, 'silla')
put(CAPE & (grey | dark), 'capa')
put(CAPE & gold, 'capa')  # the cape's gold trim
put((ARM_L | ARM_R) & (navy | dark), 'ropa')  # the tunic sleeves
put(TORSO & (navy | dark), 'ropa')
put((ARM_L | ARM_R | TORSO) & (gold | brown), 'armadura')  # pauldron rim, bracer trim
put(alpha & ~FIG, 'silla')  # outside the figure: the chair
# inside the figure, what no rule took (its line, its shadows) goes to the layer around it
for _ in range(30):
    todo = alpha & (lab == '')
    if not todo.any():
        break
    ys, xs = np.nonzero(todo)
    new = lab.copy()
    for y, x in zip(ys, xs):
        votes = {}
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and lab[yy, xx] not in ('', 'silla'):
                    votes[lab[yy, xx]] = votes.get(lab[yy, xx], 0) + 1
        if votes:
            new[y, x] = max(votes, key=votes.get)
    lab = new
put(alpha, 'silla')
np.save(S + '/labels.npy', lab)

COL = {'piel': (255, 170, 190), 'cara': (255, 60, 60), 'pelo': (60, 90, 220), 'bufanda': (120, 120, 120), 'capa': (70, 70, 80), 'armadura': (200, 220, 240),
       'banda': (220, 40, 40), 'faldon': (255, 120, 60), 'cinturon': (180, 120, 40), 'pantalon': (40, 50, 110), 'sandalias': (120, 70, 30), 'ropa': (90, 40, 140), 'silla': (230, 200, 60)}
Z = 6
out = Image.new('RGB', (W * Z * 2 + 60, H * Z + 140), (24, 22, 28))
src = Image.fromarray(np.where(alpha[..., None], s, (24, 22, 28)).astype(np.uint8)).resize((W * Z, H * Z), Image.NEAREST)
labimg = np.zeros((H, W, 3), np.uint8)
for k, c in COL.items():
    labimg[lab == k] = c
labimg[~alpha] = (24, 22, 28)
out.paste(src, (20, 20))
out.paste(Image.fromarray(labimg).resize((W * Z, H * Z), Image.NEAREST), (W * Z + 40, 20))
d = ImageDraw.Draw(out)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
x = 20
for k, c in COL.items():
    n = int((lab == k).sum())
    d.rectangle([x, H * Z + 40, x + 14, H * Z + 54], fill=c)
    d.text((x + 18, H * Z + 38), f'{k} {n}', font=f, fill=(230, 230, 230))
    x += 140
    if x > W * Z * 2 - 100:
        x = 20
out.save(S + '/layers_map.png')
print({k: int((lab == k).sum()) for k in COL})
