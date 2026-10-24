"""How the owner's heroine template differs from our female body: the sheet proporciones.png.

Side by side at one height (ours, 91 fine pixels, at 8x): his template (Lyra's picture; Elise's body is
the same) scaled to our height, her reduced reference on our female rig at idle frame 0, and our
female body as it is; guide lines at each one's own head top, chin, shoulders, bust, waist, crotch,
knees, ankles and soles, labelled in Spanish with their height in % of the figure. Below them the
four reduced references on our female idle, and the measurements (Spanish) with Saya's and
Aurelia's bodies as well. It prints the table and the per-segment scales.

  npx tsx tools/refs/heroine-idle.mts <out>
  python3 -I tools/refs/heroine-proportions.py <out> <out>/female-idle.png

It reads the reduced references from tools/refs/data (heroine-study.py --write).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import heroine_ref as R  # noqa: E402

# Landmark heights, in each body's pixels (rows; the sole is the row under the last one): her head
# top, her chin, the shoulder joints, the fullest of the bust, the narrowest of the waist, the crotch
# (where the legs part under the skirt), the knees, the ankles, the soles. Found by looking at each.
LANDMARKS = {
    'template': {'top': 0, 'chin': 47, 'shoulders': 64, 'bust': 76, 'waist': 100, 'crotch': 148, 'knee': 186,
                 'ankle': 234, 'sole': 256},
    'saya': {'top': 2, 'chin': 41, 'shoulders': 56, 'bust': 63, 'waist': 82, 'crotch': 118, 'knee': 150,
             'ankle': 181, 'sole': 200},
    'aurelia': {'top': 2, 'chin': 40, 'shoulders': 54, 'bust': 62, 'waist': 80, 'crotch': 113, 'knee': 146,
                'ankle': 184, 'sole': 200},
    'ours': {'top': 128, 'chin': 150, 'shoulders': 154.6, 'bust': 159, 'waist': 168, 'crotch': 182, 'knee': 193,
             'ankle': 207.6, 'sole': 219},
}
# Widths at the shoulders (outer edge to outer edge of the shoulders) and at the waist, in each one's
# pixels.
WIDTHS = {
    'template': {'shoulders': 60, 'waist': 38},
    'saya': {'shoulders': 44, 'waist': 36},
    'aurelia': {'shoulders': 44, 'waist': 34},
    'ours': {'shoulders': 25, 'waist': 16},
}
ES = {'top': 'coronilla', 'chin': 'barbilla', 'shoulders': 'hombros', 'bust': 'busto', 'waist': 'cintura',
      'crotch': 'entrepierna', 'knee': 'rodillas', 'ankle': 'tobillos', 'sole': 'planta'}
COLOURS = {'top': (120, 120, 120), 'chin': (220, 60, 60), 'shoulders': (230, 140, 30), 'bust': (200, 60, 170),
           'waist': (40, 150, 60), 'crotch': (40, 110, 220), 'knee': (120, 70, 200), 'ankle': (0, 160, 160),
           'sole': (120, 120, 120)}


def frac(body, k):
    L = LANDMARKS[body]
    return (L[k] - L['top']) / (L['sole'] - L['top'])


def font(size):
    for path in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                 '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def on_white(a):
    a = a.astype(float)
    al = a[..., 3:4] / 255
    return (a[..., :3] * al + 255 * (1 - al)).astype(np.uint8)


def table():
    """The measurements, as (rows of text, per-segment scales)."""
    out = []
    for body in ('template', 'saya', 'aurelia', 'ours'):
        L = LANDMARKS[body]
        h = L['sole'] - L['top']
        head = (L['chin'] - L['top']) / h
        out.append({
            'body': body, 'height': h, 'head': head, 'heads': 1 / head,
            'torso': (L['crotch'] - L['chin']) / h, 'legs': (L['sole'] - L['crotch']) / h,
            'feet': (L['sole'] - L['ankle']) / h, 'shoulders': WIDTHS[body]['shoulders'] / h,
            'waist': WIDTHS[body]['waist'] / h, 'bust': frac(body, 'bust'), 'knee': frac(body, 'knee'),
        })
    return out


def scales(which):
    """Per segment, how many of our pixels one of hers is (down the segment, and across)."""
    J, O = R.JOINTS[which], R.OUR_JOINTS
    S = R.SEGMENTS[which]
    d = lambda a, b: float(np.hypot(a[0] - b[0], a[1] - b[1]))
    seg = {
        'cabeza': (S['head']['sy'], S['head']['sx']),
        'cuello-pelvis': ((O['pelvis'][1] - O['neck'][1]) / (J['pelvis'][1] - J['neck'][1]),
                          float(np.mean([k[4] for k in S['torso']['knots']]))),
        'brazo': (d(O['shoulderN'], O['elbowN']) / d(J['shoulderN'], J['elbowN']), S['armN']['width']),
        'antebrazo': (d(O['elbowN'], O['wristN']) / d(J['elbowN'], J['wristN']), S['armN']['width']),
        'muslo': (d(O['hipN'], O['kneeN']) / d(J['hipN'], J['kneeN']), S['legN']['width']),
        'espinilla': (d(O['kneeN'], O['ankleN']) / d(J['kneeN'], J['ankleN']), S['legN']['width']),
        'mano': (S['handN']['sx'], S['handN']['sx']),
        'pie': (S['legN']['end']['s'], S['legN']['end']['s']),
        'arma': (S['weapon']['sx'], S['weapon']['sx']),
    }
    return seg


def main():
    out, idle_path = sys.argv[1], sys.argv[2]
    k = 8
    H = 91 * k
    top_y = 120
    idle = np.asarray(Image.open(idle_path).convert('RGBA'))
    x0, x1 = 92, 164
    # panel 1: his template (Lyra's picture) scaled to our height
    N = R.native('lyra').astype(np.uint8)
    fig = R.figure('lyra')
    hisa = np.zeros(N.shape[:2] + (4,), np.uint8)
    hisa[fig, :3] = N[fig]
    hisa[fig, 3] = 255
    s = H / 256
    p1 = Image.fromarray(on_white(hisa)).resize((round(N.shape[1] * s), H), Image.NEAREST)
    # panel 2: her reduced reference on our female idle; panel 3: our female body
    red = R.reduced('lyra')
    base = idle.copy()
    put = red[..., 3] > 0
    base[put] = red[put]
    p2 = Image.fromarray(on_white(base[128:219, x0:x1])).resize(((x1 - x0) * k, H), Image.NEAREST)
    p3 = Image.fromarray(on_white(idle[128:219, x0:x1])).resize(((x1 - x0) * k, H), Image.NEAREST)
    gap = 150
    left = 170
    W = left + p1.width + gap + p2.width + 40 + p3.width + 170
    strip_k = 4
    sw, sh = 112 * strip_k, 114 * strip_k
    total_h = top_y + H + 90 + sh + 60 + 470
    img = Image.new('RGB', (W, total_h), (255, 255, 255))
    d = ImageDraw.Draw(img)
    f_title, f_lab, f_small = font(34), font(20), font(18)
    d.text((left, 20), 'Proporciones: la plantilla del dueño frente a nuestro cuerpo femenino', fill=(0, 0, 0), font=f_title)
    d.text((left, 66), 'Las tres a la misma altura (91 píxeles nuestros, a 8x). Cada línea está a la altura de esa '
           'parte en cada figura.', fill=(60, 60, 60), font=f_small)
    X1, X2 = left, left + p1.width + gap
    X3 = X2 + p2.width + 40
    img.paste(p1, (X1, top_y))
    img.paste(p2, (X2, top_y))
    img.paste(p3, (X3, top_y))
    for x, label in ((X1, 'Plantilla del dueño (Lyra / Elise) a nuestra altura'),
                     (X2, 'Su referencia reducida en nuestro cuerpo'), (X3, 'Nuestro cuerpo femenino actual')):
        d.text((x, top_y + H + 12), label, fill=(0, 0, 0), font=f_lab)
    for key in ES:
        c = COLOURS[key]
        yh = top_y + frac('template', key) * H
        yo = top_y + frac('ours', key) * H
        d.line((X1 - 10, yh, X1 + p1.width, yh), fill=c, width=2)
        d.line((X1 + p1.width, yh, X2, yo), fill=c, width=2)
        d.line((X2, yo, X3 + p3.width + 10, yo), fill=c, width=2)
        d.text((8, yh - 11), f'{ES[key]} {frac("template", key) * 100:.0f}%', fill=c, font=f_small)
        d.text((X3 + p3.width + 16, yo - 11), f'{ES[key]} {frac("ours", key) * 100:.0f}%', fill=c, font=f_small)
    # the four reduced references on our female idle
    sy = top_y + H + 90
    d.text((left, sy - 40), 'Las cuatro referencias reducidas sobre nuestro cuerpo femenino (4x):', fill=(0, 0, 0),
           font=f_lab)
    for i, which in enumerate(R.WHICH):
        red = R.reduced(which)
        base = idle.copy()
        base[..., :3] = (base[..., :3] * 0.5 + 255 * 0.5).astype(np.uint8)
        put = red[..., 3] > 0
        base[put] = red[put]
        tile = Image.fromarray(on_white(base[112:226, 72:184])).resize((sw, sh), Image.NEAREST)
        x = left + i * (sw + 20)
        img.paste(tile, (x, sy))
        d.text((x + 8, sy + 6), R.NAMES[which][1], fill=(0, 0, 0), font=f_small)
    # the measurements
    ty = sy + sh + 40
    rows = table()
    names = {'template': 'Plantilla (Lyra/Elise)', 'saya': 'Saya', 'aurelia': 'Aurelia', 'ours': 'Nuestro cuerpo'}
    d.text((left, ty), 'Medidas (en % de la altura de cada figura):', fill=(0, 0, 0), font=f_lab)
    cols = ['', 'cabezas de alto', 'cabeza', 'barbilla-entrepierna', 'piernas', 'pies', 'hombros (ancho)',
            'cintura (ancho)', 'busto (altura)']
    cx = [left, left + 260, left + 440, left + 590, left + 820, left + 950, left + 1070, left + 1260, left + 1440]
    for x, c in zip(cx, cols):
        d.text((x, ty + 34), c, fill=(60, 60, 60), font=f_small)
    for j, r in enumerate(rows):
        y = ty + 64 + j * 28
        vals = [names[r['body']], f"{r['heads']:.1f}", f"{r['head'] * 100:.0f}%", f"{r['torso'] * 100:.0f}%",
                f"{r['legs'] * 100:.0f}%", f"{r['feet'] * 100:.1f}%", f"{r['shoulders'] * 100:.0f}%",
                f"{r['waist'] * 100:.0f}%", f"{r['bust'] * 100:.0f}%"]
        for x, v in zip(cx, vals):
            d.text((x, y), v, fill=(0, 0, 0) if r['body'] != 'ours' else (30, 80, 200), font=f_small)
    notes = [
        'Lo que más cambia: la cabeza. Ellas miden 5 a 5,4 cabezas; el nuestro 4,1 (la cabeza es un 30% más grande).',
        'Las piernas miden lo mismo (la entrepierna cae al 58% en todas); pero nuestros pies son mucho más grandes (12% contra 8-10%).',
        'Nuestro torso es más corto (35% contra 37-40%) y más ancho: hombros 27% contra 22-23%, cintura 18% contra 15-18%.',
        'Pose: nuestra pierna lejana sale a la derecha; en la plantilla sale la cercana y la lejana baja recta. La espada cuelga igual (52°).',
        'Un cuerpo femenino afinado (misma escala: cabeza más chica, cuello y torso más largos, hombros y cintura más finos, pies más chicos)',
        'se acercaría mucho más. Es decisión del dueño: cambiaría el cuerpo base y lo que ya se ajustó a él (cabezas, peinados, armaduras).',
    ]
    for j, n in enumerate(notes):
        d.text((left, ty + 64 + 4 * 28 + 24 + j * 30), n, fill=(0, 0, 0), font=f_small)
    img.save(os.path.join(out, 'proporciones.png'))
    for r in rows:
        print(r['body'], ' '.join(f'{k}={v:.3f}' for k, v in r.items() if k != 'body'))
    for which in ('lyra', 'saya', 'aurelia'):
        print(which, ' '.join(f'{k}={a:.2f}x{b:.2f}' for k, (a, b) in scales(which).items()))


if __name__ == '__main__':
    main()
