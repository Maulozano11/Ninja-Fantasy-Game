"""Preview sheets for the proposed D/C jutsu: for each one, the owner's sprite strips it uses and
storyboard mockups ("Ahora" / "Opción A" / "Opción B") built only from existing frames (his VFX
sheets at 1x, the game's own character renders), shown at 2x. Plus one contact sheet and the
dragon-head example. Nothing is scaled except whole-number nearest-neighbour zoom; nothing is
rotated or recoloured.

Usage: python3 -I mockups.py <repo> <jutsu-list dir>
(needs <jutsu-list>/work/poses from render_poses.ts and <jutsu-list>/work/dragon from dragon_head.py)
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

REPO, SP = sys.argv[1], sys.argv[2]
WORLD = os.path.join(REPO, 'src/assets/world')
POSES = os.path.join(SP, 'work/poses')
DRAGON = os.path.join(SP, 'work/dragon')
STRIPS = os.path.join(SP, 'vfx')
OUT = os.path.join(SP, 'previews')
os.makedirs(OUT, exist_ok=True)

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
_fonts = {}


def font(sz, bold=False):
    k = (sz, bold)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(FONTB if bold else FONT, sz)
    return _fonts[k]


BG = (18, 16, 26)
PANEL = (26, 23, 37)
EDGE = (58, 54, 76)
GROUND = (33, 30, 42)
GLINE = (52, 48, 64)
TXT = (236, 232, 245)
DIM = (160, 154, 180)
TAG = {'now': (148, 163, 184), 'A': (250, 204, 21), 'B': (96, 165, 250), 'C': (244, 114, 182)}


# --- sheets ----------------------------------------------------------------------------------
class Sheet:
    def __init__(self, group, name):
        m = json.load(open(os.path.join(WORLD, group, 'manifest.json')))
        self.spec = m['sprites'][name]
        self.img = Image.open(os.path.join(WORLD, group, self.spec['file'])).convert('RGBA')
        self.fw, self.fh = self.spec['frameW'], self.spec['frameH']
        self.ax, self.ay = self.spec['anchor']

    def anim(self, a=None):
        return self.spec['anims'][a] if a else next(iter(self.spec['anims'].values()))

    def frame(self, a, i):
        an = self.anim(a)
        i = max(0, min(an['frames'] - 1, i))
        return self.img.crop((i * self.fw, an['row'] * self.fh, (i + 1) * self.fw, (an['row'] + 1) * self.fh))


_sh = {}


def S(el, role):
    k = (el, role)
    if k not in _sh:
        _sh[k] = Sheet('vfx_beasts', el) if role == 'beast' else Sheet(f'vfx_{el}', role)
    return _sh[k]


_sp = {}


def sprite(who, pose, f):
    k = (who, pose, f)
    if k not in _sp:
        _sp[k] = Image.open(os.path.join(POSES, f'{who}-{pose}-{f}.png')).convert('RGBA')
    return _sp[k]


FX, FY = 128, 216


def faded(im, a):
    if a >= 0.999:
        return im
    im = im.copy()
    im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    return im


def mirror(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def body_dx(who):
    """Like auraDx in the game: the body's middle against the feet, so an aura sits on the body."""
    im = sprite(who, 'idle', 0)
    a = im.getchannel('A').load()
    s = sx = 0
    for y in range(FY - 85, FY - 25):
        for x in range(256):
            if a[x, y]:
                s += a[x, y]
                sx += a[x, y] * (x + 0.5)
    return round(sx / s - FX) if s else 0


DX = {'caster': body_dx('caster'), 'target': body_dx('target'), 'target2': body_dx('target2')}


def flight(t, ax, ay, bx, by):
    """vfxSprites.ts flight(): eased along, with a 30 px arc."""
    e = 2 * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 2 / 2
    return ax + (bx - ax) * e, ay + (by - ay) * e - math.sin(t * math.pi) * 30


# --- a scene (1x), then zoomed 2x -------------------------------------------------------------
class Scene:
    def __init__(self, W=290, H=184, G=160):
        self.W, self.H, self.G = W, H, G
        self.back, self.units, self.fx, self.texts, self.rings = [], [], [], [], []
        self.shake = 0

    def unit(self, who, pose, f, x, face=1, alpha=1.0, dy=0):
        self.units.append((who, pose, f, x, face, alpha, dy))
        return self

    def vfx(self, sh, anim, i, x, y, flip=False, alpha=1.0, layer='fx'):
        im = sh.frame(anim, i)
        if flip:
            im = mirror(im)
            ox = x - (sh.fw - sh.ax)
        else:
            ox = x - sh.ax
        (self.back if layer == 'back' else self.fx).append((faded(im, alpha), round(ox), round(y - sh.ay), None))
        return self

    def aura(self, el, i, x, alpha=1.0, who='caster', dy=0, back=True, front=True):
        g = self.G + dy
        if back and el != 'lightning':
            self.vfx(S(el, 'aura_back'), 'idle', i, x + DX[who], g, alpha=alpha, layer='back')
        if front:
            self.vfx(S(el, 'aura'), 'idle', i, x + DX[who], g, alpha=alpha)
        return self

    def raw(self, im, x, y, alpha=1.0, layer='back', clip_bottom=None):
        if clip_bottom is not None and y + im.height > clip_bottom:
            h = clip_bottom - y
            if h <= 0:
                return self
            im = im.crop((0, 0, im.width, h))
        (self.back if layer == 'back' else self.fx).append((faded(im, alpha), round(x), round(y), None))
        return self

    def text(self, t, x, y, color, size=13):
        self.texts.append((t, x, y, color, size))
        return self

    def heal_ring(self, x, t, dy=0):
        self.rings.append((x, t, dy))
        return self

    def render(self, k=2):
        im = Image.new('RGB', (self.W, self.H), BG)
        d = ImageDraw.Draw(im)
        d.rectangle((0, self.G - 12, self.W, self.H), fill=GROUND)
        d.line((0, self.G - 12, self.W, self.G - 12), fill=GLINE)
        for (who, pose, f, x, face, alpha, dy) in self.units:
            d.ellipse((x - 20, self.G + dy - 4, x + 20, self.G + dy + 4), fill=(22, 20, 30))
        for (src, x, y, _) in self.back:
            im.paste(src, (x, y), src)
        for (who, pose, f, x, face, alpha, dy) in sorted(self.units, key=lambda u: u[6]):
            spr = sprite(who, pose, f)
            if face < 0:
                spr = mirror(spr)
            spr = faded(spr, alpha)
            im.paste(spr, (round(x - FX), round(self.G + dy - FY)), spr)
        for (x, t, dy) in self.rings:
            # The heal drawn in code today (renderer.ts): a green ring and rising motes.
            g = self.G + dy
            rx, ry = 24 + t * 8, 7 + t * 2
            col = tuple(int(c * (1 - t) + b * t) for c, b in zip((74, 222, 128), BG))
            d.ellipse((x - rx, g - 2 - ry, x + rx, g - 2 + ry), outline=col, width=2)
            for i in range(10):
                mx = x + (((i * 29) % 40) - 20)
                my = g - 10 - ((t * 90 + i * 13) % 90)
                d.rectangle((mx, my, mx + 1, my + 1), fill=(187, 247, 208))
        for (src, x, y, _) in self.fx:
            im.paste(src, (x, y), src)
        if self.shake:
            im = im.transform(im.size, Image.AFFINE, (1, 0, -self.shake, 0, 1, 0), fillcolor=BG)
        im = im.resize((self.W * k, self.H * k), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for (t, x, y, color, size) in self.texts:
            f = font(13 * k + 2, True)
            w = d.textlength(t, font=f)
            d.text((x * k - w / 2, y * k), t, font=f, fill=color, stroke_width=3, stroke_fill=(10, 8, 14))
        return im


# Standard layout: caster on the left, target on the right, 190 px (3.3 m) apart.
C, T, G = 50, 240, 160


def base(caster=('cast', 0), target=('idle', 0), cx=C, tx=T, W=290, tface=-1, twho='target'):
    s = Scene(W=W)
    if caster:
        s.unit('caster', caster[0], caster[1], cx)
    if target:
        s.unit(twho, target[0], target[1], tx, face=tface)
    return s


def proj(s, el, role, t, i, cx=C, tx=T, l1=60, alpha=1.0):
    x, y = flight(t, cx, G - 70, tx, G - l1)
    sh = S(el, role)
    s.vfx(sh, 'fly', i, x, y, alpha=alpha)
    return s


def hit(s, el, i, tx=T, role='hit', alpha=1.0, y=None):
    sh = S(el, role)
    s.vfx(sh, None, i, tx, G - 60 if y is None else y, alpha=alpha)
    return s


def blast(s, el, i, tx=T, alpha=1.0, layer='fx'):
    sh = S(el, 'blast')
    s.vfx(sh, None, i, tx, G, alpha=alpha, layer=layer)
    return s


# --- the twelve jutsu -------------------------------------------------------------------------
def j_projectile(el, role, hit_role='hit', label=None, label_col=(255, 255, 255)):
    """cast -> projectile -> impact, the way the game plays any single-target jutsu today."""
    f1 = base(('cast', 0))
    f2 = proj(base(('cast', 1)), el, role, 0.12, 1)
    f3 = proj(base(('cast', 1)), el, role, 0.7, 5)
    f4 = hit(base(('idle', 0), ('hurt', 0)), el, 4, role=hit_role)
    frames = [('0,0 s · conjura (pose cast)', f1), ('0,6 s · sale', f2), ('0,9 s · vuela', f3), ('1,2 s · impacto', f4)]
    if label:
        f4.text(label, T, 18, label_col)
    return frames


def summary_projectile(el, role, hit_role='hit', t=0.45, label=None, label_col=(255, 255, 255)):
    s = proj(base(('cast', 1), ('hurt', 0)), el, role, t, 3)
    hit(s, el, 4, role=hit_role)
    if label:
        s.text(label, T, 14, label_col)
    return s


J = []

# 1 · Tres brasas (fire, D)
J.append(dict(
    n=1, slug='tres-brasas', short='Tres brasas', name='Técnica de Fuego: Tres brasas', el='Fuego', rank='D',
    line='Fire Technique: Three Embers · Acción · 1 chakra · un objetivo a 9 m · tirada de ataque, 2d6 fuego',
    strips=['fire-multi', 'fire-hit'], data=True, tweak=False,
    options=[('now', 'Ahora (solo datos) · así está bien: tres cometas de fuego y el estallido de púas', j_projectile('fire', 'multi'))],
    summary=summary_projectile('fire', 'multi')))

# 2 · Remolino (wind, D)
J.append(dict(
    n=2, slug='remolino', short='Remolino', name='Técnica de Viento: Remolino', el='Viento', rank='D',
    line='Wind Technique: Whirl · Acción · 1 chakra · un objetivo a 9 m · salvación de FUE, 1d8 contundente, corta arbustos',
    strips=['wind-bolt', 'wind-hit'], data=True, tweak=False,
    options=[('now', 'Ahora (solo datos) · así está bien: tu bola-vórtice de viento y la X de hojas', j_projectile('wind', 'bolt'))],
    summary=summary_projectile('wind', 'bolt')))


# 3 · Manto de brisa (wind, D, utility)
def manto(opt):
    f1 = base(('cast', 0), None)
    f2 = base(('cast', 1), None).aura('wind', 3, C)
    f3 = base(('idle', 0), None).aura('wind', 9, C)
    f4 = Scene().unit('caster', 'idle', 1, C).unit('target', 'attack', 1, 135, face=-1)
    if opt == 'A':
        f4.aura('wind', 6, C, alpha=0.4).text('esquivando', C + 4, 8, (167, 243, 208))
        cap4 = 'turno enemigo · el aura tenue (40 %) sigue: ataca con desventaja'
    else:
        f3 = base(('idle', 0), None).aura('wind', 10, C, alpha=0.35)
        cap4 = 'turno enemigo · ya no se ve quién está protegido'
    return [('0,0 s · acción adicional', f1), ('0,6 s · la brisa lo envuelve', f2),
            ('1,2 s' + (' · se apaga' if opt == 'B' else ''), f3), (cap4, f4)]


J.append(dict(
    n=3, slug='manto-de-brisa', short='Manto de brisa', name='Técnica de Viento: Manto de brisa', el='Viento', rank='D',
    line='Wind Technique: Breeze Mantle · Utilidad · acción adicional · 1 chakra · sobre ti · te atacan con desventaja hasta tu turno',
    strips=['wind-aura', 'wind-aura_back'], data=False, tweak=True,
    options=[('A', 'Opción A (recomendada) · el aura queda tenue hasta tu próximo turno', manto('A')),
             ('B', 'Opción B · solo un destello de 1,2 s, como el Clon', manto('B'))],
    summary=Scene().unit('caster', 'idle', 1, C).unit('target', 'attack', 1, 135, face=-1).aura('wind', 6, C).text('esquivando', C + 4, 8, (167, 243, 208))))

# 4 · Calambre (lightning, D)
J.append(dict(
    n=4, slug='calambre', short='Calambre', name='Técnica de Rayo: Calambre', el='Rayo', rank='D',
    line='Lightning Technique: Jolt · Acción · 1 chakra · un objetivo a 7,5 m · salvación de CON o nada: 1d6 rayo y Entumecido',
    strips=['lightning-multi', 'lightning-hit'], data=True, tweak=False,
    options=[('now', 'Ahora (solo datos) · así está bien: agujas de trueno, chispazo y el cartel «Entumecido»',
              j_projectile('lightning', 'multi', label='Entumecido', label_col=(147, 197, 253)))],
    summary=summary_projectile('lightning', 'multi', label='Entumecido', label_col=(147, 197, 253))))


# 5 · Abanico de chispas (lightning, C, cone 4.5 m)
E1, E2 = 165, 250


def cone_scene(t, pose=('cast', 1), hurt=False, hits=()):
    s = Scene(W=300)
    s.unit('caster', pose[0], pose[1], C)
    s.unit('target', 'hurt' if hurt else 'idle', 0, E1, face=-1, dy=-8)
    s.unit('target', 'hurt' if hurt else 'idle', 1 if hurt else 2, E2, face=-1, dy=4)
    sh = S('lightning', 'breath')
    L, steps = 256, 3
    for i in range(steps):
        k = (i + 0.5) / steps
        if t < k * 0.6:
            break
        a = (1 - t) / 0.2 if t > 0.8 else 1
        s.vfx(sh, 'fly', (int(t * 17) + i) % 8, C + L * k - sh.fw * 0.3, G - 30, alpha=a)
    for (x, dy, i) in hits:
        s.vfx(S('lightning', 'hit'), None, i, x, G + dy - 60)
    return s


abanico_now = [('0,0 s · conjura', cone_scene(-1, ('cast', 0))), ('0,7 s · el abanico se abre', cone_scene(0.3)),
               ('1,1 s · cubre el cono', cone_scene(0.62)), ('1,8 s · se apaga (no se ve a quién dio)', cone_scene(0.9, ('idle', 0), hurt=True))]
abanico_a = [('0,0 s · conjura', cone_scene(-1, ('cast', 0))), ('0,7 s · el abanico se abre', cone_scene(0.3)),
             ('1,1 s · chispazo en el 1.º alcanzado', cone_scene(0.62, hits=[(E1, -8, 3)])),
             ('1,2 s · y en el 2.º, 80 ms después', cone_scene(0.75, ('idle', 0), hurt=True, hits=[(E1, -8, 7), (E2, 4, 4)]))]
J.append(dict(
    n=5, slug='abanico-de-chispas', short='Abanico de chispas', name='Técnica de Rayo: Abanico de chispas', el='Rayo', rank='C',
    line='Lightning Technique: Spark Fan · Acción · 2 chakra · cono de 4,5 m · salvación de DES, mitad: 2d8 rayo',
    strips=['lightning-breath', 'lightning-hit'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · el cono de rayos ramificados', abanico_now),
             ('A', 'Opción A (recomendada) · además, un chispazo sobre cada enemigo alcanzado', abanico_a)],
    summary=cone_scene(0.9, ('cast', 1), hurt=True, hits=[(E1, -8, 5), (E2, 4, 3)])))


# 6 · Guijarros (earth, D, bonus action)
def guijarros(opt):
    if opt == 'now':
        return j_projectile('earth', 'multi', hit_role='multi_hit')
    f1 = base(('cast', 0)).aura('earth', 1, C)
    f2 = base(('cast', 1)).aura('earth', 5, C)
    f3 = proj(base(('cast', 1)).aura('earth', 8, C, alpha=0.4), 'earth', 'multi', 0.55, 4)
    f4 = hit(base(('idle', 0), ('hurt', 0)), 'earth', 4, role='multi_hit')
    return [('0,0 s · rocas y polvo a sus pies', f1), ('0,4 s · las piedras se levantan', f2),
            ('0,8 s · salen disparadas', f3), ('1,2 s · impacto de balas de roca', f4)]


J.append(dict(
    n=6, slug='guijarros', short='Guijarros', name='Técnica de Tierra: Guijarros', el='Tierra', rank='D',
    line='Earth Technique: Pebble Shot · ACCIÓN ADICIONAL · 1 chakra · un objetivo a 9 m · tirada de ataque, 1d6 contundente',
    strips=['earth-multi', 'earth-multi_hit', 'earth-aura_back', 'earth-aura'], data=False, tweak=True,
    options=[('now', 'Ahora (solo datos) · tres balas de roca y su impacto propio', guijarros('now')),
             ('A', 'Opción A (recomendada) · tu aura de tierra (columnas de roca y polvo) sube a sus pies durante la pausa de 0,56 s que ya existe', guijarros('A'))],
    summary=hit(proj(base(('cast', 1), ('hurt', 0)).aura('earth', 6, C, alpha=0.6), 'earth', 'multi', 0.45, 3), 'earth', 4, role='multi_hit')))


# 7 · Corona de púas (earth, C, around the caster 3 m)
MC, L1, R1 = 150, 62, 240


def crown_base(pose, hurt=False):
    s = Scene(W=300)
    s.unit('caster', pose[0], pose[1], MC)
    s.unit('target', 'hurt' if hurt else 'idle', 0, L1, face=1, dy=-6)
    s.unit('target', 'hurt' if hurt else 'idle', 1 if hurt else 2, R1, face=-1, dy=4)
    return s


corona_now = [('0,0 s · pisotón (pose attack)', crown_base(('attack', 0))),
              ('0,6 s · explosión de roca SOBRE el ninja', hit(crown_base(('attack', 1)), 'earth', 2, tx=MC)),
              ('0,9 s · lo tapa entero', hit(crown_base(('attack', 2)), 'earth', 6, tx=MC)),
              ('1,4 s · nadie ve dónde dio', hit(crown_base(('idle', 0), hurt=True), 'earth', 10, tx=MC))]
corona_a = [('0,0 s · pose charge + columnas de roca detrás', crown_base(('charge', 0)).aura('earth', 1, MC)),
            ('0,4 s · anillo de polvo alrededor', crown_base(('charge', 1)).aura('earth', 6, MC)),
            ('0,7 s · explosión de roca en cada enemigo', hit(hit(crown_base(('attack', 2)).aura('earth', 10, MC, alpha=0.5), 'earth', 3, tx=L1, y=G - 66), 'earth', 3, tx=R1, y=G - 56)),
            ('1,2 s · el ninja siempre se ve', hit(hit(crown_base(('idle', 0), hurt=True), 'earth', 8, tx=L1, y=G - 66), 'earth', 8, tx=R1, y=G - 56))]
corona_b = [('0,0 s · pose charge', crown_base(('charge', 0))),
            ('0,4 s · púas de cristal DETRÁS del ninja', blast(crown_base(('charge', 1)), 'earth', 4, tx=MC, layer='back')),
            ('0,8 s · (igual que el Gólem S)', blast(crown_base(('attack', 2), hurt=True), 'earth', 8, tx=MC, layer='back')),
            ('1,3 s', blast(crown_base(('idle', 0), hurt=True), 'earth', 13, tx=MC, layer='back'))]
J.append(dict(
    n=7, slug='corona-de-puas', short='Corona de púas', name='Técnica de Tierra: Corona de púas', el='Tierra', rank='C',
    line='Earth Technique: Spike Crown · Acción · 2 chakra · todo a 3 m a tu alrededor · salvación de DES, mitad: 2d8 perforante',
    strips=['earth-aura_back', 'earth-aura', 'earth-hit'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · la explosión de roca sale sobre el pecho del ninja y lo tapa', corona_now),
             ('A', 'Opción A (recomendada) · columnas de roca y anillo de polvo alrededor, y la explosión en cada enemigo', corona_a),
             ('B', 'Opción B · las púas de cristal (blast) detrás del ninja; más trabajo y se parece al Gólem (rango S)', corona_b)],
    summary=hit(hit(crown_base(('attack', 2)).aura('earth', 9, MC, alpha=0.7), 'earth', 4, tx=L1, y=G - 66), 'earth', 4, tx=R1, y=G - 56)))


# 8 · Rocío sanador (water, D, heal an ally at 6 m)
def ally(pose=('idle', 0), x=T):
    s = Scene()
    return s, x


def rocio(opt):
    def sc(cp, ap=('idle', 0)):
        s = Scene()
        s.unit('caster', cp[0], cp[1], C)
        s.unit('target2', ap[0], ap[1], T, face=1)
        return s
    if opt == 'now':
        return [('0,0 s · conjura', sc(('cast', 0))), ('0,6 s · nada vuela', sc(('cast', 1))),
                ('0,8 s · anillo verde dibujado en código', sc(('idle', 0)).heal_ring(T, 0.2).text('+4', T, 22, (134, 239, 172))),
                ('1,5 s · se apaga', sc(('idle', 0)).heal_ring(T, 0.75))]
    if opt == 'A':
        f2 = sc(('cast', 1))
        x, y = flight(0.15, C, G - 70, T, G - 60)
        f2.vfx(S('water', 'bolt'), 'fly', 1, x, y)
        f3 = sc(('cast', 1))
        x, y = flight(0.75, C, G - 70, T, G - 60)
        f3.vfx(S('water', 'bolt'), 'fly', 5, x, y)
        return [('0,6 s · sale la gota (orbe de agua)', f2), ('0,9 s · cruza hasta el aliado', f3),
                ('1,1 s · el agua lo envuelve', sc(('idle', 0)).aura('water', 2, T, who='target2').text('+4', T, 22, (134, 239, 172))),
                ('1,6 s · se apaga', sc(('idle', 0)).aura('water', 8, T, who='target2', alpha=0.5))]
    return [('0,0 s · conjura', sc(('cast', 0))), ('0,6 s · nada vuela', sc(('cast', 1))),
            ('0,7 s · el agua envuelve al aliado', sc(('idle', 0)).aura('water', 2, T, who='target2').text('+4', T, 22, (134, 239, 172))),
            ('1,3 s · se apaga', sc(('idle', 0)).aura('water', 8, T, who='target2', alpha=0.5))]


J.append(dict(
    n=8, slug='rocio-sanador', short='Rocío sanador', name='Técnica de Agua: Rocío sanador', el='Agua', rank='D',
    line='Water Technique: Healing Dew · Utilidad · acción · 2 chakra · un aliado a 6 m · cura 1d8',
    strips=['water-bolt', 'water-aura', 'water-aura_back'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · el anillo verde dibujado en código, no es tu arte', rocio('now')),
             ('A', 'Opción A (recomendada) · tu orbe de agua vuela al aliado y tu aura de agua lo envuelve', rocio('A')),
             ('B', 'Opción B · sin vuelo: solo tu aura de agua sobre el aliado', rocio('B'))],
    summary=None))


# 9 · Géiser (water, C, circle 1.5 m at 9 m)
def geiser(opt):
    if opt == 'now':
        f2 = proj(base(('cast', 1)), 'water', 'sphere', 0.15, 1, l1=30)
        f3 = proj(base(('cast', 1)), 'water', 'sphere', 0.8, 6, l1=30)
        return [('0,6 s · sale una burbuja', f2), ('0,9 s · cae sobre él', f3),
                ('1,2 s · géiser', blast(base(('idle', 0), ('hurt', 0)), 'water', 4)),
                ('1,7 s', blast(base(('idle', 0), ('hurt', 1)), 'water', 10))]
    f2 = base(('cast', 1))
    hit(f2, 'water', 2, y=G - 4)
    f3 = blast(base(('cast', 1), ('hurt', 0)), 'water', 4)
    f3.shake = 3
    return [('0,0 s · conjura', base(('cast', 0))), ('0,6 s · aviso: salpica el suelo bajo él', f2),
            ('0,9 s · revienta el géiser (sacudida)', f3), ('1,4 s', blast(base(('idle', 0), ('hurt', 1)), 'water', 10))]


J.append(dict(
    n=9, slug='geiser', short='Géiser', name='Técnica de Agua: Géiser', el='Agua', rank='C',
    line='Water Technique: Geyser · Acción · 2 chakra · círculo de 1,5 m a 9 m · salvación de FUE, mitad: 3d6 contundente',
    strips=['water-sphere', 'water-hit', 'water-blast'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · una burbuja vuela y revienta en el géiser', geiser('now')),
             ('A', 'Opción A (recomendada) · sin proyectil: salpica el suelo y sube el géiser desde abajo', geiser('A'))],
    summary=blast(base(('cast', 1), ('hurt', 0)), 'water', 6)))


# 10 · Espejismo (genjutsu, C)
def espejismo(opt):
    if opt == 'now':
        return j_projectile('genjutsu', 'bolt', label='Confundido', label_col=(240, 171, 252))
    f2 = proj(base(('cast', 1)), 'genjutsu', 'sphere', 0.1, 1)
    f3 = proj(base(('cast', 1)), 'genjutsu', 'sphere', 0.55, 4)
    f4 = hit(base(('idle', 0), ('hurt', 0)), 'genjutsu', 4).text('Confundido', T, 18, (240, 171, 252))
    return [('0,6 s · sale el orbe-ojo con anillo', f2), ('1,0 s · flota despacio (×1,5)', f3),
            ('1,4 s · estalla en violeta', f4), ('', None)]


J.append(dict(
    n=10, slug='espejismo', short='Espejismo', name='Técnica de Genjutsu: Espejismo', el='Genjutsu', rank='C',
    line='Genjutsu Technique: Mirage · Acción · 2 chakra · un objetivo a 9 m · salvación de SAB o nada: 2d6 psíquico y Confundido 2 rondas',
    strips=['genjutsu-bolt', 'genjutsu-sphere', 'genjutsu-hit'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · el orbe-ojo pequeño vuela a la velocidad normal', espejismo('now')),
             ('A', 'Opción A (recomendada) · la esfera-ojo con anillo y púas, volando más despacio, como en un sueño', espejismo('A'))],
    summary=hit(proj(base(('cast', 1), ('hurt', 0)), 'genjutsu', 'sphere', 0.45, 3), 'genjutsu', 4).text('Confundido', T, 14, (240, 171, 252))))


# 11 · Tajo sangrante (kenjutsu, D, melee 3 m)
def tajo(opt):
    tx, cx = T, T - 62
    run = base(('run', 2), cx=120, tx=tx)
    f2 = base(('attack', 0), cx=cx, tx=tx)
    if opt == 'now':
        f3 = hit(base(('attack', 2), ('hurt', 0), cx=cx, tx=tx), 'wind', 3, tx=tx)
        f4 = hit(base(('idle', 0), ('hurt', 1), cx=cx, tx=tx), 'wind', 8, tx=tx).text('Sangrando', tx, 18, (252, 165, 165))
        return [('0,0 s · se acerca de un salto', run), ('0,5 s · golpe (pose attack)', f2),
                ('0,7 s · la X de hojas de viento', f3), ('1,3 s · cartel «Sangrando»', f4)]
    sl = S('wind', 'slash')
    f3 = base(('attack', 2), ('hurt', 0), cx=cx, tx=tx)
    f3.vfx(sl, 'fly', 2, tx, G - 60)
    f4 = base(('idle', 0), ('hurt', 1), cx=cx, tx=tx)
    f4.vfx(sl, 'fly', 5, tx + 6, G - 60, alpha=0.45)
    f4.text('Sangrando', tx, 18, (252, 165, 165))
    return [('0,0 s · se acerca de un salto', run), ('0,5 s · golpe (pose attack)', f2),
            ('0,7 s · UNA media luna de viento cruza', f3), ('1,1 s · se desvanece · «Sangrando»', f4)]


J.append(dict(
    n=11, slug='tajo-sangrante', short='Tajo sangrante', name='Técnica de Kenjutsu: Tajo sangrante', el='Kenjutsu', rank='D',
    line='Kenjutsu Technique: Bleeding Cut · Acción · 1 chakra · cuerpo a cuerpo, salta hasta 3 m · tirada de ataque, 1d8 cortante y Sangrando',
    strips=['wind-hit', 'wind-slash'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · golpe y la X de hojas de viento, como la Danza de la luna creciente', tajo('now')),
             ('A', 'Opción A (recomendada) · en vez de la X, una sola media luna de viento (solo espejada, sin girar)', tajo('A'))],
    summary=base(('attack', 2), ('hurt', 0), cx=T - 62).vfx(S('wind', 'slash'), 'fly', 2, T, G - 60).text('Sangrando', T, 14, (252, 165, 165))))


# 12 · Embestida (taijutsu, C, melee reach 6 m)
def embestida(opt):
    t0 = 42
    if opt == 'now':
        return [('0,0 s · arranca', base(('idle', 0), cx=t0, tx=262)),
                ('carrera normal', base(('run', 1), cx=110, tx=262)),
                ('sigue corriendo', base(('run', 4), cx=170, tx=262)),
                ('golpe y estallido de chakra', hit(base(('attack', 2), ('hurt', 0), cx=205, tx=262), 'chakra', 3, tx=262))]
    return [('0,0 s · destello de chakra (como el Shunshin)', base(('charge', 0), cx=t0, tx=262).aura('chakra', 3, t0)),
            ('carrera ×2', base(('run', 2), cx=150, tx=262).aura('chakra', 9, t0, alpha=0.35)),
            ('ya está encima: golpe', hit(base(('attack', 2), ('hurt', 0), cx=205, tx=262), 'chakra', 3, tx=262)),
            ('estallido de chakra', hit(base(('idle', 0), ('hurt', 1), cx=205, tx=262), 'chakra', 8, tx=262))]


J.append(dict(
    n=12, slug='embestida', short='Embestida', name='Técnica de Taijutsu: Embestida', el='Taijutsu', rank='C',
    line='Taijutsu Technique: Rush · Acción · 2 chakra · cuerpo a cuerpo con alcance de 6 m · tirada de ataque, 2d8 contundente',
    strips=['chakra-aura', 'chakra-hit'], data=True, tweak=True,
    options=[('now', 'Ahora (solo datos) · corre a la velocidad normal y golpea', embestida('now')),
             ('A', 'Opción A (recomendada) · destello de chakra al arrancar y carrera al doble de rápido', embestida('A'))],
    summary=hit(base(('attack', 2), ('hurt', 0), cx=205, tx=262).aura('chakra', 9, 42, alpha=0.5), 'chakra', 3, tx=262)))


# Rocío's summary needs the ally (a second preset) facing the same way as the caster.
def rocio_summary():
    s = Scene()
    s.unit('caster', 'cast', 1, C)
    s.unit('target2', 'idle', 0, T, face=1)
    x, y = flight(0.45, C, G - 70, T, G - 60)
    s.vfx(S('water', 'bolt'), 'fly', 3, x, y)
    s.aura('water', 3, T, who='target2', alpha=0.8)
    s.text('+4', T, 14, (134, 239, 172))
    return s


# --- drawing the sheets -----------------------------------------------------------------------
EL_ES = {'fire': 'Fuego', 'water': 'Agua', 'wind': 'Viento', 'lightning': 'Rayo', 'earth': 'Tierra',
         'genjutsu': 'Genjutsu', 'chakra': 'Chakra', 'poison': 'Veneno'}
ROLE_ES = {'bolt': 'proyectil (bolt)', 'stream': 'chorro, tramo (stream)', 'stream_head': 'chorro, punta (stream_head)',
           'breath': 'aliento / cono (breath)', 'sphere': 'esfera (sphere)', 'slash': 'corte (slash)',
           'multi': 'ráfaga múltiple (multi)', 'multi_hit': 'impacto múltiple (multi_hit)', 'hit': 'impacto (hit)',
           'blast': 'explosión de área (blast)', 'aura': 'aura, capa delante (aura)',
           'aura_back': 'aura, capa detrás (aura_back)'}
ANIM_ES = {'fly': 'vuelo', 'hit': 'impacto', 'blast': 'explosión', 'idle': 'reposo (bucle)', 'dive': 'picada',
           'attack': 'ataque', 'summon': 'invocación'}


def strip(name, avail):
    """One sheet's animations, frame by frame at 2x with numbers (the vfx_strips.py look), wrapped
    to the page width."""
    el, role = name.split('-', 1)
    sh = S(el, role)
    k, pad = (2 if sh.fw <= 160 else 1), 6  # big sheets (blasts) at 1x so the page stays short
    cw, ch = sh.fw * k, sh.fh * k
    per = max(1, (avail - pad) // (cw + pad))
    title = f"{EL_ES[el]} · " + (f"bestia: {sh.spec.get('label', '')}" if role == 'beast' else ROLE_ES.get(role, role))
    rows = []
    for a, an in sh.spec['anims'].items():
        lab = f"{ANIM_ES.get(a, a)} ({a}): {an['frames']} cuadros a {an['fps']} fps" + (', en bucle' if an.get('loop') else '')
        rows.append((lab, [sh.frame(a, i) for i in range(an['frames'])]))
    ncol = min(per, max(len(f) for _, f in rows))
    W = max(pad + ncol * (cw + pad), 640)
    H = 72
    for _, fr in rows:
        H += 30 + ((len(fr) + per - 1) // per) * (ch + pad + 18)
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.text((pad, 8), title, font=font(26, True), fill=TXT)
    d.text((pad, 42), f"cuadro {sh.fw}x{sh.fh} px · mostrado a {k}x · 57 px = 1 m", font=font(18), fill=DIM)
    y = 72
    for lab, fr in rows:
        d.text((pad, y), lab, font=font(20), fill=TXT)
        y += 30
        for i, f in enumerate(fr):
            x = pad + (i % per) * (cw + pad)
            yy = y + (i // per) * (ch + pad + 18)
            d.rectangle((x - 1, yy - 1, x + cw, yy + ch), fill=PANEL, outline=EDGE)
            big = f.resize((cw, ch), Image.NEAREST)
            im.paste(big, (x, yy), big)
            d.text((x + 2, yy + ch + 1), str(i), font=font(14), fill=DIM)
        y += ((len(fr) + per - 1) // per) * (ch + pad + 18)
    return im


def fit(d, text, size, width, bold=True, low=20):
    while size > low and d.textlength(text, font=font(size, bold)) > width:
        size -= 2
    return font(size, bold)


def wrap(d, text, f, width):
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def preview(j, path, per_line=4, k=2):
    opts = j['options']
    fw = max(s.W for _, _, frs in opts for _, s in frs if s) * k
    fh = 184 * k
    gap = 18
    W = 72 + per_line * (fw + gap)
    tmp = Image.new('RGB', (10, 10))
    dt = ImageDraw.Draw(tmp)
    strips = [strip(n, W - 72) for n in j['strips']]
    # flow the strips into rows
    rows, cur, cw = [], [], 0
    for s in strips:
        if cur and cw + s.width + gap > W - 36:
            rows.append(cur)
            cur, cw = [], 0
        cur.append(s)
        cw += s.width + gap
    if cur:
        rows.append(cur)
    H = 36 + 64 + 46 + 30 + 40
    H += 50 + sum(max(s.height for s in r) + gap for r in rows) + 20
    opt_layout = []
    for tag, title, frs in opts:
        frs = [f for f in frs if f[1] is not None]
        lines = wrap(dt, title, font(34, True), W - 72)
        nl = (len(frs) + per_line - 1) // per_line
        h = 20 + 46 * len(lines) + 10 + nl * (fh + 76) + 20
        opt_layout.append((tag, lines, frs, h))
        H += h + gap
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    y = 30
    d.text((36, y), f"{j['n']} · {j['name']}", font=font(52, True), fill=TXT)
    y += 70
    for ln in wrap(d, f"Rango {j['rank']} · {j['line']}", font(28), W - 72):
        d.text((36, y), ln, font=font(28), fill=DIM)
        y += 38
    y += 18
    d.text((36, y), 'Tus sprites que usa (hojas aprobadas; a 2x, las grandes a 1x):', font=font(30, True), fill=TXT)
    y += 50
    for r in rows:
        x = 36
        for s in r:
            im.paste(s, (x, y))
            d.rectangle((x - 1, y - 1, x + s.width, y + s.height), outline=EDGE)
            x += s.width + gap
        y += max(s.height for s in r) + gap
    y += 20
    for tag, lines, frs, h in opt_layout:
        col = TAG[tag]
        d.rectangle((24, y, W - 24, y + h), fill=PANEL, outline=col, width=3)
        yy = y + 20
        for ln in lines:
            d.text((48, yy), ln, font=font(34, True), fill=col)
            yy += 46
        yy += 10
        for i, (cap, s) in enumerate(frs):
            col_i, line_i = i % per_line, i // per_line
            x = 48 + col_i * (fw + gap)
            fy = yy + line_i * (fh + 76)
            fr = s.render(k)
            im.paste(fr, (x, fy))
            d.rectangle((x - 1, fy - 1, x + fr.width, fy + fr.height), outline=EDGE)
            for li, cl in enumerate(wrap(d, cap, font(27), fw)[:2]):
                d.text((x, fy + fh + 6 + li * 31), cl, font=font(27), fill=TXT)
        y += h + gap
    im.save(path, optimize=True)
    return im.size


made = []
for j in J:
    if j['summary'] is None and j['n'] == 8:
        j['summary'] = rocio_summary()
    p = os.path.join(OUT, f"{j['n']}-{j['slug']}.png")
    made.append((p, preview(j, p)))


# --- the dragon example (an existing jutsu: Aniquilación de la llama del dragón) ---------------
DW, DH, DG, DC = 760, 370, 340, 200
TG = [(420, -14), (545, 6), (650, -6)]
heads = [Image.open(os.path.join(DRAGON, f'dragon_head_{i}.png')).convert('RGBA') for i in range(6)]
HEAD_X, HEAD_Y = DC - 175, DG - 295
MOUTH = (DC + 62, DG - 150)


def dscene(pose=('cast', 1), hurt=()):
    s = Scene(W=DW, H=DH, G=DG)
    s.unit('caster', pose[0], pose[1], DC)
    for i, (x, dy) in enumerate(TG):
        s.unit('target', 'hurt' if i in hurt else 'idle', i % 2, x, face=-1, dy=dy)
    return s


def head(s, i, rise=0.0, alpha=1.0):
    s.raw(heads[i % 6], HEAD_X, HEAD_Y + rise, alpha=alpha, layer='back', clip_bottom=DG - 70)
    return s


def fire_back(s, i, alpha=1.0):
    for x in (DC - 95, DC - 30):
        s.vfx(S('fire', 'aura_back'), 'idle', i, x, DG, alpha=alpha, layer='back')
    return s


def breath_tiles(s, t, ox, oy, L, ex, ey):
    sh = S('fire', 'breath')
    steps = max(2, round(L / 57 / 1.6))
    for i in range(steps):
        k = (i + 0.5) / steps
        if t < k * 0.6:
            break
        a = (1 - t) / 0.2 if t > 0.8 else 1
        x = ox + (ex - ox) * k
        y = oy + (ey - oy) * k
        s.vfx(sh, 'fly', (int(t * 17) + i) % 8, x - sh.fw * 0.3, y, alpha=a)
    return s


def bolt_to(s, t, i, tx, ty, ox=MOUTH[0], oy=MOUTH[1], role='bolt', alpha=1.0):
    e = 2 * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 2 / 2
    s.vfx(S('fire', role), 'fly', i, ox + (tx - ox) * e, oy + (ty - oy) * e, alpha=alpha)
    return s


def dhit(s, n, i):
    x, dy = TG[n]
    s.vfx(S('fire', 'hit'), None, i, x, DG + dy - 60)
    return s


cone_end = (DC + 513, DG - 30)
drag_now = [('0,6 s · el aliento de fuego se repite por el cono', breath_tiles(dscene(), 0.3, DC, DG - 30, 513, *cone_end)),
            ('1,0 s · cubre los 9 m', breath_tiles(dscene(hurt=(0, 1)), 0.62, DC, DG - 30, 513, *cone_end)),
            ('1,7 s · se apaga', breath_tiles(dscene(('idle', 0), hurt=(0, 1, 2)), 0.9, DC, DG - 30, 513, *cone_end))]
drag_a = [('0,0 s · llamas detrás del ninja', fire_back(dscene(('cast', 0)), 2)),
          ('0,4 s · asoma la cabeza del dragón', fire_back(head(dscene(('cast', 0)), 0, rise=120), 5)),
          ('0,7 s · abre la boca: 1.ª bola', bolt_to(fire_back(head(dscene(), 1), 8), 0.25, 1, TG[0][0], DG + TG[0][1] - 60)),
          ('0,9 s · 2.ª y 3.ª, cada 150 ms', bolt_to(bolt_to(bolt_to(fire_back(head(dscene(), 2), 11), 0.85, 5, TG[0][0], DG + TG[0][1] - 60), 0.55, 3, TG[1][0], DG + TG[1][1] - 60), 0.25, 1, TG[2][0], DG + TG[2][1] - 60)),
          ('1,2 s · cada bola revienta en su enemigo', dhit(dhit(bolt_to(fire_back(head(dscene(hurt=(0,)), 3), 2), 0.8, 6, TG[2][0], DG + TG[2][1] - 60), 0, 6), 1, 3)),
          ('1,6 s · la cabeza se hunde en las llamas', dhit(dhit(fire_back(head(dscene(('idle', 0), hurt=(0, 1, 2)), 4, rise=110, alpha=0.6), 6, alpha=0.6), 1, 8), 2, 4))]
drag_b = [('0,4 s · asoma la cabeza', fire_back(head(dscene(('cast', 0)), 0, rise=120), 5)),
          ('0,8 s · el aliento sale de SU boca', breath_tiles(fire_back(head(dscene(), 1), 8), 0.3, MOUTH[0], MOUTH[1], 420, *cone_end)),
          ('1,1 s · cubre el cono', breath_tiles(fire_back(head(dscene(hurt=(0, 1)), 2), 11), 0.62, MOUTH[0], MOUTH[1], 420, *cone_end)),
          ('1,8 s · se apaga y la cabeza se hunde', breath_tiles(fire_back(head(dscene(('idle', 0), hurt=(0, 1, 2)), 3, rise=100, alpha=0.6), 4, alpha=0.6), 0.9, MOUTH[0], MOUTH[1], 420, *cone_end))]
PHX = S('fire', 'beast')
PX, PY = DC + 40, DG - 175


def phoenix(s, anim, i, alpha=1.0):
    s.vfx(PHX, anim, i, PX, PY, alpha=alpha)
    return s


drag_c = [('0,4 s · el fénix baja en picada (fila «dive», nunca usada)', phoenix(fire_back(dscene(('cast', 0)), 4), 'dive', 2)),
          ('0,7 s · aletea y ataca (fila «attack», nunca usada)', phoenix(dscene(), 'attack', 2)),
          ('0,9 s · lanza las bolas de fuego', bolt_to(bolt_to(phoenix(dscene(), 'attack', 4), 0.6, 4, TG[0][0], DG + TG[0][1] - 60, ox=PX + 30, oy=PY + 10), 0.25, 1, TG[1][0], DG + TG[1][1] - 60, ox=PX + 30, oy=PY + 10)),
          ('1,3 s · revientan en cada enemigo', dhit(dhit(bolt_to(phoenix(dscene(hurt=(0,)), 'fly', 3), 0.8, 6, TG[2][0], DG + TG[2][1] - 60, ox=PX + 30, oy=PY + 10), 0, 6), 1, 3))]

dragon = dict(
    n='Tu ejemplo', slug='dragon', name='Técnica de Fuego: Aniquilación de la llama del dragón (ya existe)', rank='A',
    line='secreto del clan Mirai · cono de 9 m · 5d8 fuego · las reglas NO cambian, solo la animación · maqueta a 1x',
    strips=['fire-aura_back', 'fire-bolt', 'fire-hit', 'fire-beast'],
    options=[('now', 'Ahora · el aliento de fuego repetido a lo largo del cono', drag_now),
             ('A', 'Opción A · la cabeza del dragón (recortada de tu Gran aniquilación potenciada) sale de las llamas y dispara 3 bolas de fuego', drag_a),
             ('B', 'Opción B · la misma cabeza, y el aliento de fuego sale de su boca', drag_b),
             ('C', 'Opción C · el fénix (tu bestia de fuego, sin usar) en vez de la cabeza: guarda el dragón para el rango S', drag_c)])


def preview_dragon(j, path, per_line=3, k=1):
    opts = j['options']
    fw, fh = DW * k, DH * k
    gap = 18
    W = 72 + per_line * (fw + gap)
    strips = [strip(n, W - 72) for n in j['strips']]
    rows, cur, cw = [], [], 0
    for s in strips:
        if cur and cw + s.width + gap > W - 36:
            rows.append(cur)
            cur, cw = [], 0
        cur.append(s)
        cw += s.width + gap
    if cur:
        rows.append(cur)
    tmp = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    H = 36 + 128 + 56 + 50 + sum(max(s.height for s in r) + gap for r in rows) + 20 + 60
    lay = []
    for tag, title, frs in opts:
        lines = wrap(tmp, title, font(34, True), W - 72)
        nl = (len(frs) + per_line - 1) // per_line
        h = 20 + 46 * len(lines) + 10 + nl * (fh + 76) + 20
        lay.append((tag, lines, frs, h))
        H += h + gap
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    y = 30
    for ln in wrap(d, f"{j['n']} · {j['name']}", font(50, True), W - 72):
        d.text((36, y), ln, font=font(50, True), fill=TXT)
        y += 64
    d.text((36, y), f"Rango {j['rank']} · {j['line']}", font=font(28), fill=DIM)
    y += 46
    d.text((36, y), 'Maqueta hecha con tus cuadros tal cual: la cabeza es un recorte en bruto (el humo detrás quitado por color); no escalada ni girada.', font=font(24), fill=DIM)
    y += 50
    d.text((36, y), 'Tus sprites que usa (hojas aprobadas; a 2x, las grandes a 1x):', font=font(30, True), fill=TXT)
    y += 50
    for r in rows:
        x = 36
        for s in r:
            im.paste(s, (x, y))
            d.rectangle((x - 1, y - 1, x + s.width, y + s.height), outline=EDGE)
            x += s.width + gap
        y += max(s.height for s in r) + gap
    y += 20
    for tag, lines, frs, h in lay:
        col = TAG[tag]
        d.rectangle((24, y, W - 24, y + h), fill=PANEL, outline=col, width=3)
        yy = y + 20
        for ln in lines:
            d.text((48, yy), ln, font=font(34, True), fill=col)
            yy += 46
        yy += 10
        for i, (cap, s) in enumerate(frs):
            x = 48 + (i % per_line) * (fw + gap)
            fy = yy + (i // per_line) * (fh + 76)
            fr = s.render(k)
            im.paste(fr, (x, fy))
            d.rectangle((x - 1, fy - 1, x + fr.width, fy + fr.height), outline=EDGE)
            for li, cl in enumerate(wrap(d, cap, font(27), fw)[:2]):
                d.text((x, fy + fh + 6 + li * 31), cl, font=font(27), fill=TXT)
        y += h + gap
    im.save(path, optimize=True)
    return im.size


p = os.path.join(OUT, 'ejemplo-dragon.png')
made.append((p, preview_dragon(dragon, p)))
# One frame of option A at 2x, so the head can be judged pixel by pixel.
p = os.path.join(OUT, 'ejemplo-dragon-A-2x.png')
drag_a[4][1].render(2).save(p, optimize=True)
made.append((p, (DW * 2, DH * 2)))


# --- the contact sheet -------------------------------------------------------------------------
def contact(js, path, title):
    k, cols, gap = 2, 3, 26
    cw, chh = 290 * k + 20, 184 * k
    W = gap + cols * (cw + gap)
    rowsN = (len(js) + cols - 1) // cols
    cell_h = 76 + 46 + chh + 128
    H = 120 + rowsN * (cell_h + gap)
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.text((gap, 26), title, font=font(54, True), fill=TXT)
    d.text((gap, 90), 'Amarillo = trae un ajuste de animación recomendado · gris = así está bien', font=font(26), fill=DIM)
    for i, j in enumerate(js):
        x = gap + (i % cols) * (cw + gap)
        y = 130 + (i // cols) * (cell_h + gap)
        col = TAG['A'] if j['tweak'] else TAG['now']
        d.rectangle((x, y, x + cw, y + cell_h), fill=PANEL, outline=col, width=4)
        nm = f"{j['n']} · {j['short']}"
        d.text((x + 16, y + 10), nm, font=fit(d, nm, 52, cw - 32), fill=TXT)
        d.text((x + 16, y + 76), f"{j['el']} · Rango {j['rank']}", font=font(34, True), fill=col)
        fr = j['summary'].render(k)
        if fr.width > cw - 20:
            fr = fr.crop(((fr.width - (cw - 20)) // 2, 0, (fr.width + cw - 20) // 2, fr.height))
        im.paste(fr, (x + 10, y + 122))
        how = 'Entra con solo datos' if j['data'] else 'Necesita un cambio pequeño'
        adj = 'Ajuste de animación: Opción A' if j['tweak'] else 'Animación: así está bien'
        d.text((x + 16, y + 122 + chh + 12), how, font=fit(d, how, 32, cw - 32, bold=False), fill=TXT)
        d.text((x + 16, y + 122 + chh + 58), adj, font=fit(d, adj, 32, cw - 32, bold=False), fill=col)
    im.save(path, optimize=True)
    return im.size


p = os.path.join(SP, 'jutsus-propuestos.png')
made.append((p, contact(J, p, 'Jutsu nuevos de rango D y C (12)')))
for p, size in made:
    print(f'{p}\t{size[0]}x{size[1]}')
