"""Final previews with Spanish labels for the owner. Run from the repo root: python3 -I final.py <partsdir>"""
import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import scarlet_ref as R

D = sys.argv[1]
A = os.path.join(D, 'all')
W = os.path.join(D, 'work')
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
BG = (226, 226, 232, 255)


def load(p):
    if p == 'REDUCED':
        return R.reduced()
    return np.asarray(Image.open(p).convert('RGBA'))


def tile(a, box, k, label, f=font):
    x0, y0, x1, y1 = box
    a = a[y0:y1, x0:x1].copy()
    a[a[..., 3] == 0] = BG
    im = Image.fromarray(a, 'RGBA').resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    t = Image.new('RGBA', (im.width, im.height + 30), (255, 255, 255, 255))
    t.paste(im, (0, 30))
    ImageDraw.Draw(t).text((4, 4), label, fill=(20, 20, 30, 255), font=f)
    return t


def grid(tiles, cols, title=None):
    w, h = tiles[0].size
    rows = (len(tiles) + cols - 1) // cols
    top = 40 if title else 0
    S = Image.new('RGBA', (cols * (w + 8) + 8, rows * (h + 8) + 8 + top), (255, 255, 255, 255))
    if title:
        ImageDraw.Draw(S).text((10, 8), title, fill=(20, 20, 30, 255), font=font)
    for i, t in enumerate(tiles):
        S.paste(t, (8 + (i % cols) * (w + 8), top + 8 + (i // cols) * (h + 8)))
    return S


# 1. at rest: the reduced reference beside ours (only the boots and gloves on our body)
box = (94, 164, 154, 222)
grid([tile(load('REDUCED'), box, 8, 'Referencia reducida (estudio)'),
      tile(load(os.path.join(A, 'sw_idle_0.png')), box, 8, 'En el juego: con espada'),
      tile(load(os.path.join(A, 'bare_idle_0.png')), box, 8, 'En el juego: sin arma')], 3,
     'Botas y guantes de Scarlet: reposo, 8x').save(os.path.join(D, 'reposo-vs-referencia@8.png'))

# 2. his picture beside ours, the same size on screen
for name, title in (('boots', 'Botas: tu dibujo (izquierda) y en el juego (derecha)'), ('gloves', 'Guantes: tu dibujo y en el juego (mano cercana, mano lejana)')):
    im = Image.open(os.path.join(D, 'study', name + '.png')).convert('RGBA')
    S = Image.new('RGBA', (im.width + 20, im.height + 50), (255, 255, 255, 255))
    ImageDraw.Draw(S).text((10, 10), title, fill=(20, 20, 30, 255), font=font)
    S.paste(im, (10, 45))
    S.save(os.path.join(D, ('botas' if name == 'boots' else 'guantes') + '-tu-dibujo-vs-juego.png'))

# 3. every pose
poses = [('sw_idle_0', 'Reposo'), ('sw_attack_0', 'Ataque 1'), ('sw_attack_1', 'Ataque 2'), ('sw_attack_2', 'Ataque 3'),
         ('sw_cast_0', 'Lanzar (runas)'), ('c_book_cast_0', 'Lanzar (grimorio)'), ('c_sphere_cast_0', 'Lanzar (esfera)'), ('c_wave_cast_0', 'Lanzar (onda)'),
         ('sw_handsigns_0', 'Sellos'), ('bare_handsigns_1', 'Sellos 2'), ('sw_hurt_0', 'Daño'), ('sw_victory_0', 'Victoria'),
         ('sw_charge_0', 'Cargar'), ('sw_walk_2', 'Caminar'), ('sw_walk_6', 'Caminar 2'), ('sw_run_0', 'Correr'),
         ('sw_run_3', 'Correr 2'), ('sw_crouch_0', 'Agacharse'), ('sw_sneak_2', 'Sigilo'), ('sw_downed_0', 'Derribado'),
         ('sw_sit_0', 'Sentado'), ('sw_read_0', 'Leer'), ('sw_train_2', 'Entrenar'), ('bare_train_0', 'Entrenar sin arma'),
         ('sw_lean_0', 'Apoyado'), ('bare_idle_0', 'Reposo sin arma')]
box = (60, 96, 196, 232)
tiles = [tile(load(os.path.join(A, n + '.png')), box, 3, l, small) for n, l in poses]
grid(tiles, 6, 'Botas y guantes de Scarlet en todas las poses (cuerpo masculino, 3x)').save(os.path.join(D, 'poses@3.png'))

# 4. bodies
bodies = [('sw_idle_0', 'Masculino'), ('female_idle_0', 'Femenino'), ('slender_idle_0', 'Esbelto'), ('bulky_idle_0', 'Corpulento'),
          ('sw_walk_2', 'Masculino caminando'), ('female_walk_2', 'Femenino caminando'), ('slender_walk_2', 'Esbelto caminando'), ('bulky_walk_2', 'Corpulento caminando')]
box = (80, 120, 176, 226)
grid([tile(load(os.path.join(A, n + '.png')), box, 3, l, small) for n, l in bodies], 4,
     'Los cuatro cuerpos (3x)').save(os.path.join(D, 'cuerpos@3.png'))

# 5. colours
box = (92, 140, 164, 222)
grid([tile(load(os.path.join(W, 'his_idle_0.png')), box, 4, 'Sus colores'),
      tile(load(os.path.join(W, 'brown_idle_0.png')), box, 4, 'Cuero marrón, hebilla dorada'),
      tile(load(os.path.join(W, 'navy_idle_0.png')), box, 4, 'Botas azules, guantes claros')], 3,
     'Colores: Cuero y Hebilla (botas), Cuero (guantes); las puntas de los dedos siguen la piel').save(os.path.join(D, 'colores@4.png'))
print('ok')
