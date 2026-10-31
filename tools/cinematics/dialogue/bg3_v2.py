"""His dialogue panel (the owner's picture, 2026-10-31) in the middle, the party's sprites on the
left and Barrabás's on the right in the courtyard; the check's % lowered (a mission boss needs very
high Charisma); Karma marks on the answers that move it. His panel is lifted from his picture as is
(only the % is repainted) until a clean one on magenta comes from the generator."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S, OUT = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
HIS = np.array(Image.open(f'{OUT}/his_ui.png').convert('RGB')).astype(int)
SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
SERIFB = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SANSB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F = lambda p, s: ImageFont.truetype(p, s)

# --- his panel: the frame's inside, plus the gold of its corners and crest -----------------------
X0, Y0, X1, Y1 = 138, 388, 1536, 884
sub = HIS[Y0:Y1, X0:X1]
r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
yy, xx = np.mgrid[Y0:Y1, X0:X1]
inner = (xx >= 160) & (xx <= 1512) & (yy >= 452) & (yy <= 862)
gold = (r > 140) & (r >= g) & (g > 80) & (r - b > 70)
crest_red = (r > 150) & (g < 80) & (b < 90)
band = ~((xx >= 214) & (xx <= 1470) & (yy >= 470) & (yy <= 850))
crest = (xx > 722) & (xx < 928) & (yy < 455)
from scipy import ndimage
keep = inner | ((gold | (crest & crest_red)) & (band | crest) & ((yy >= 440) | crest))
keep = ndimage.binary_closing(keep, iterations=2)
keep = ndimage.binary_fill_holes(keep | inner)
al = ndimage.gaussian_filter(keep.astype(float), 0.7)
PANEL = np.dstack([sub, (al * 255)]).astype(np.uint8)
# repaint the % in the medallion: his green over the old digits, the new number on it
cx, cy = 1368 - X0, 765 - Y0
med = PANEL[cy - 26:cy + 26, cx - 48:cx + 48, :3].astype(int)
mg = (med.max(-1) > 150)
green = np.median(med[(med[..., 1] > med[..., 0] + 15) & ~mg], axis=0)
for y in range(cy - 24, cy + 24):
    for x in range(cx - 44, cx + 44):
        if ((x - cx) / 44) ** 2 + ((y - cy) / 24) ** 2 < 1 and PANEL[y, x, :3].max() > 130:
            PANEL[y, x, :3] = green
PANEL = Image.fromarray(PANEL, 'RGBA')
d = ImageDraw.Draw(PANEL)
d.text((cx, cy), '18 %', font=F(SERIF, 24), fill=(248, 244, 230), anchor='mm')


def karma(d, x, y, up):
    """A Karma mark: a small half-light, half-dark disc, the arrow and the word."""
    d.ellipse([x - 11, y - 11, x + 11, y + 11], fill=(30, 26, 34), outline=(200, 160, 90), width=2)
    d.pieslice([x - 9, y - 9, x + 9, y + 9], 90, 270, fill=(236, 226, 200))
    c = (150, 220, 140) if up else (230, 100, 90)
    d.text((x + 18, y), 'Karma ' + ('▲' if up else '▼'), font=F(SANSB, 17), fill=c, anchor='lm')


karma(d, 1080 - X0 + 100, 765 - Y0, True)       # offer a surrender
karma(d, 1225 - X0 + 30, 825 - Y0, False)        # a kunai while he talks
# --- the scene: the courtyard in focus, closer, the party left, Barrabás right -------------------
bg = Image.open(f'{S}/hydra/col14/empty.png').convert('RGBA')
bg = bg.resize((int(bg.width * 1.35), int(bg.height * 1.35)), Image.LANCZOS)
SCENE = bg.crop((150, 110, 150 + W * 1, 110 + H)).resize((W, H)) if False else None
SCENE = Image.open(f'{S}/hydra/col14/empty.png').convert('RGBA').resize((int(1672 * 1.6), int(941 * 1.6)), Image.LANCZOS).crop((260, 260, 260 + W, 260 + H))
SCENE = Image.alpha_composite(SCENE, Image.new('RGBA', SCENE.size, (0, 0, 0, 70)))


def sprite(img, path, x, y, h, flip=False):
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getbbox())
    im = im.resize((int(im.width * h / im.height), h), Image.NEAREST)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    sh = Image.new('RGBA', img.size)
    ImageDraw.Draw(sh).ellipse([x - im.width * 0.45, y - 10, x + im.width * 0.45, y + 8], fill=(0, 0, 0, 120))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(4)))
    img.alpha_composite(im, (int(x - im.width / 2), int(y - im.height)))


def frame(subtitle=None, notes=None, bar='barrabas_idle_256'):
    img = SCENE.copy()
    for n, x, y in [('leg_solen', 150, 610), ('leg_romano', 270, 660), ('leg_lyra', 110, 760), ('leg_aiden', 300, 800), ('leg_aurelia', 160, 900)]:
        sprite(img, f'{S}/cc/{n}.png', x, y, 170)
    sprite(img, f'{S}/barrabas/{bar}.png', 1740, 840, 205, True)
    if subtitle is None:
        p = PANEL.resize((int(PANEL.width * 0.86), int(PANEL.height * 0.86)), Image.LANCZOS)
        img.alpha_composite(p, (int(W / 2 - p.width / 2) + 10, H - p.height - 30))
    else:
        d = ImageDraw.Draw(img)
        d.text((W / 2, 860), 'BARRABÁS', font=F(SERIFB, 26), fill=(214, 190, 140), anchor='mm', stroke_width=3, stroke_fill=(0, 0, 0))
        d.text((W / 2, 905), subtitle, font=F(SERIF, 32), fill=(245, 240, 228), anchor='mm', stroke_width=3, stroke_fill=(0, 0, 0))
    if notes:
        d = ImageDraw.Draw(img)
        y = 40
        for t, c in notes:
            d.text((W / 2, y), t, font=F(SERIFB, 26), fill=c, anchor='ma', stroke_width=3, stroke_fill=(0, 0, 0))
            y += 38
    # his Focus ribbon, bottom left
    rib = Image.fromarray(HIS[868:936, 0:448].astype(np.uint8)).convert('RGBA')
    img.alpha_composite(rib, (0, H - rib.height))
    return img


frame().convert('RGB').save(f'{OUT}/v2_1_eleccion.png')
frame('¡Maldito mocoso! Esto no se va a quedar así.', [('Karma ▼  atacaste mientras hablaba', (230, 110, 100)), ('Romano desaprueba', (230, 120, 110)), ('Aurelia desaprueba', (230, 120, 110))]).convert('RGB').save(f'{OUT}/v2_2_reaccion.png')
print('ok')
