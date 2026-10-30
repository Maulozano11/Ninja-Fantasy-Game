"""The welcome dialogue with Barrabás and its choice, mocked in the courtyard (MISSION_DESIGN, "His
welcome"; dialogue rules 1-5): his line; the four answers on his gem buttons, each in its
personality's colour (red pride, blue the smart one, gold loyalty, amethyst the mission first: a
recolour of his red gem until he paints it); the speaker's Focus; his answer to each tone."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
S = sys.argv[1]
OUT = sys.argv[2]
W, H = 1920, 1080
FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
FR = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s)
FS = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', s)
BG = Image.open(f'{S}/hydra/col14/empty.png').convert('RGBA').resize((W, H), Image.LANCZOS)
UI = f'{S}/bui'


def recolour(im, hue):
    """His red gem in another colour: only the red of the gem turns, the gold frame stays his."""
    a = np.array(im.convert('RGBA'))
    hsv = np.array(im.convert('RGB').convert('HSV')).astype(int)
    red = ((hsv[..., 0] < 14) | (hsv[..., 0] > 238)) & (hsv[..., 1] > 90)
    hsv[..., 0] = np.where(red, hue, hsv[..., 0])
    rgb = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))
    return Image.fromarray(np.dstack([rgb, a[..., 3]]), 'RGBA')


GEM = {'red': Image.open(f'{UI}/gem_red.png').convert('RGBA'), 'blue': Image.open(f'{UI}/gem_blue.png').convert('RGBA'),
       'gold': Image.open(f'{UI}/gem_gold.png').convert('RGBA'), 'off': Image.open(f'{UI}/gem_off.png').convert('RGBA')}
GEM['amethyst'] = recolour(GEM['red'], 196)
TAGC = {'red': (240, 90, 80), 'blue': (110, 170, 255), 'gold': (245, 200, 90), 'amethyst': (190, 130, 240)}
TAGN = {'red': 'ORGULLO', 'blue': 'LA LISTA', 'gold': 'LEALTAD', 'amethyst': 'MISIÓN PRIMERO'}


def sprite(img, path, x, y, h=100, flip=False):
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getbbox())
    im = im.resize((int(im.width * h / im.height), h), Image.NEAREST)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    img.alpha_composite(im, (int(x - im.width / 2), int(y - im.height)))


def scene(dim=0.0):
    img = BG.copy()
    for n, x, y in [('leg_solen', 300, 640), ('leg_romano', 420, 700), ('leg_aiden', 520, 760), ('leg_lyra', 330, 790), ('leg_aurelia', 220, 860)]:
        sprite(img, f'{S}/cc/{n}.png', x, y)
    sprite(img, f'{S}/barrabas/barrabas_idle_256.png', 1290, 760, 112, flip=True)
    if dim:
        img.alpha_composite(Image.new('RGBA', img.size, (0, 0, 0, int(255 * dim))))
    return img


def portrait(path, h, dim=False, flip=False):
    im = Image.open(path).convert('RGBA')
    im = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if dim:
        a = im.split()[3]
        im = ImageEnhance.Brightness(im.convert('RGB')).enhance(0.3).convert('RGBA')
        im.putalpha(a)
    return im


def wrap(d, text, font, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) > width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = t
    return lines + [cur]


def box(img, speaker, name, colour, line, left, right, tag=None, focus=None):
    lay = Image.new('RGBA', img.size)
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([60, 830, W - 60, 1045], radius=14, fill=(14, 10, 14, 228), outline=(190, 150, 80, 255), width=3)
    img.alpha_composite(lay)
    A = portrait(left, 560, speaker != 'L')
    B = portrait(right[0], 560, speaker != 'R', right[1])
    img.alpha_composite(A, (70, 1035 - A.height))
    img.alpha_composite(B, (W - 70 - B.width, 1035 - B.height))
    d = ImageDraw.Draw(img)
    tx = 470
    d.text((tx, 852), name, font=FB(32), fill=colour)
    if tag:
        nx = tx + d.textlength(name, font=FB(32)) + 18
        gem = GEM[tag].resize((150, int(GEM[tag].height * 150 / GEM[tag].width)), Image.LANCZOS)
        img.alpha_composite(gem, (int(nx), 850))
        d.text((nx + 75, 850 + gem.height / 2), TAGN[tag], font=FB(15), fill=(255, 250, 235), anchor='mm', stroke_width=2, stroke_fill=(10, 6, 6))
    y = 902
    for ln in wrap(d, line, FR(29), W - 2 * tx + 40):
        d.text((tx, y), ln, font=FR(29), fill=(240, 236, 228))
        y += 40
    if focus:
        draw_focus(img, *focus)


def draw_focus(img, n, plus):
    """The speaker's Focus: 5 diamonds over its portrait, a new one lighting when the answer is true to it."""
    d = ImageDraw.Draw(img)
    x0, y0 = 90, 470
    d.text((x0, y0 - 34), 'Enfoque', font=FB(22), fill=(250, 225, 160), stroke_width=3, stroke_fill=(10, 6, 6))
    for i in range(5):
        cx, cy = x0 + 16 + i * 40, y0 + 14
        pts = [(cx, cy - 14), (cx + 12, cy), (cx, cy + 14), (cx - 12, cy)]
        if i < n:
            d.polygon(pts, fill=(255, 205, 90), outline=(60, 30, 10))
        elif i < n + plus:
            d.polygon(pts, fill=(255, 240, 200), outline=(255, 160, 40))
        else:
            d.polygon(pts, fill=(40, 34, 40), outline=(150, 120, 80))
    if plus:
        d.text((x0 + 210, y0 + 2), f'+{plus}', font=FB(24), fill=(255, 225, 140), stroke_width=3, stroke_fill=(10, 6, 6))


OPTIONS = [
    ('red', '¿Tú solo contra nosotros cinco? Esto va a ser rápido.', None),
    ('blue', 'Portón abierto, ni un guardia, y tú esperándonos... Es una trampa. ¡Todos atentos!', 'Lo vio el Mirai'),
    ('gold', '¿Un Kōton haciéndole de perro a los Northstar? Tu clan debe estar orgulloso.', None),
    ('amethyst', '[Lanzarle un kunai antes de que termine de hablar]', None),
]


def choice(hover):
    img = scene(dim=0.35)
    # his last line stays in the box, dimmed, under the choice
    box(img, 'none', 'BARRABÁS', (120, 200, 120), '¡Ja! Sabía que vendrían. Solo alguien tan orgulloso como tú entraría por la puerta grande... Insolente.',
        f'{S}/aidenp/aiden_1_neutral.png', (f'{S}/barrabas/p2_2.png', False))
    A = portrait(f'{S}/aidenp/aiden_1_neutral.png', 560)
    img.alpha_composite(A, (70, 1035 - A.height))
    draw_focus(img, 2, 1 if hover == 0 else 0)
    d = ImageDraw.Draw(img)
    t = 'Aiden responde'
    d.text((W / 2, 58), t, font=FS(38), fill=(246, 214, 140), anchor='mm', stroke_width=4, stroke_fill=(10, 6, 6))
    bw = 690
    for i, (g, text, why) in enumerate(OPTIONS):
        gem = GEM[g].resize((bw, int(GEM[g].height * bw / GEM[g].width)), Image.LANCZOS)
        if hover is not None and i != hover:
            a = gem.split()[3]
            gem = ImageEnhance.Color(ImageEnhance.Brightness(gem.convert('RGB')).enhance(0.5)).enhance(0.6).convert('RGBA')
            gem.putalpha(a)
        if i == hover:
            gem = gem.resize((int(gem.width * 1.04), int(gem.height * 1.04)), Image.LANCZOS)
        x, y = int(W / 2 - gem.width / 2), 128 + i * 180 - (gem.height - int(GEM[g].height * bw / GEM[g].width)) // 2
        img.alpha_composite(gem, (x, y))
        d = ImageDraw.Draw(img)
        ty = y + gem.height / 2
        lines = wrap(d, text, FB(23), gem.width - 170)
        for k, ln in enumerate(lines):
            d.text((W / 2, ty + (k - (len(lines) - 1) / 2) * 29), ln, font=FB(23), fill=(255, 250, 235), anchor='mm', stroke_width=3, stroke_fill=(12, 6, 8))
        d.text((x + 40, y - 14), TAGN[g], font=FB(18), fill=TAGC[g], stroke_width=3, stroke_fill=(10, 6, 6))
        if why:
            d.text((x + gem.width - 40, y - 14), '◉ ' + why, font=FB(18), fill=(150, 200, 255), anchor='ra', stroke_width=3, stroke_fill=(10, 6, 6))
    return img


def said(kind, aiden_face, aiden_line, bar_face, bar_line, bar_flip=False, focus_plus=0):
    a = scene()
    box(a, 'L', 'AIDEN', (232, 110, 90), aiden_line, f'{S}/aidenp/aiden_{aiden_face}.png', (f'{S}/barrabas/p2_1.png', False), tag=kind,
        focus=(2, focus_plus) if focus_plus else None)
    b = scene()
    box(b, 'R', 'BARRABÁS', (120, 200, 120), bar_line, f'{S}/aidenp/aiden_{aiden_face}.png', (f'{S}/barrabas/{bar_face}.png', bar_flip))
    return a, b


A0 = scene()
box(A0, 'R', 'BARRABÁS', (120, 200, 120), '¡Ja! Sabía que vendrían. Solo alguien tan orgulloso como tú entraría por la puerta grande... Insolente.',
    f'{S}/aidenp/aiden_1_neutral.png', (f'{S}/barrabas/p2_2.png', False))
A0.convert('RGB').save(f'{OUT}/1_bienvenida.png')
choice(None).convert('RGB').save(f'{OUT}/2_eleccion.png')
choice(0).convert('RGB').save(f'{OUT}/3_eleccion_roja.png')
r1, r2 = said('red', '2_contento', OPTIONS[0][1], 'p2_3_flip', '¿Solo? ¿Y quién te dijo que estoy solo?', focus_plus=1)
r1.convert('RGB').save(f'{OUT}/4_aiden_rojo.png')
r2.convert('RGB').save(f'{OUT}/5_barrabas_rojo.png')
# his answer to each tone (rule 5)
REPLIES = [('red', 'p2_3_flip', '¿Solo? ¿Y quién te dijo que estoy solo?'),
           ('blue', 'p2_4', 'Vaya... por fin alguien que piensa. Lástima que ya sea tarde.'),
           ('gold', 'p2_5', '¿Perro? Ya veremos quién ladra cuando la hidra te muerda.'),
           ('amethyst', 'p2_7', '¡Maldito mocoso! Esto no se va a quedar así.')]
for k, (g, face, line) in enumerate(REPLIES):
    b = scene()
    box(b, 'R', 'BARRABÁS', (120, 200, 120), line, f'{S}/aidenp/aiden_1_neutral.png', (f'{S}/barrabas/{face}.png', False))
    d = ImageDraw.Draw(b)
    gem = GEM[g].resize((260, int(GEM[g].height * 260 / GEM[g].width)), Image.LANCZOS)
    b.alpha_composite(gem, (470, 760))
    d.text((600, 760 + gem.height / 2), 'responde a: ' + TAGN[g].lower(), font=FB(18), fill=(255, 250, 235), anchor='mm', stroke_width=2, stroke_fill=(10, 6, 6))
    b.convert('RGB').save(f'{OUT}/6_respuesta_{k + 1}_{g}.png')
print('ok')
