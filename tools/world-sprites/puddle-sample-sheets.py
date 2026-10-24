"""Sheets, GIFs and paint-over frames for the owner, from the puddle frames.

    python3 -I tools/world-sprites/puddle-sample-sheets.py <frames dir>[,<frames dir>...] <out dir> \
        src/assets/maps/river_forest/ground.webp [battle.png battle.json]

<frames dir> is any folder with a manifest.json of sequences: <stg>/charco_muestra (our first
sample, puddle-sample.ts), <stg>/charco_agua (his water repaint, tools/refs/water-puddle-from-ref.py),
<stg>/charco_mercurio (the mercury in his style, puddle-mercury.py). A later folder's sequence
replaces an earlier one's of the same id.

writes into <out dir>:
  muestra-agua.png, muestra-mercurio.png   every sequence, frame by frame at 4x, labelled in Spanish
  gif/<sequence>.gif                       each sequence at 2x over the river forest ground
  para-repintar[-agua|-mercurio]/          each frame at 1x on a transparent background (256 x 256,
                                           the game's sprite frame, feet at the manifest's `feet`):
                                           para-repintar/ for the first sample, -agua and -mercurio
                                           for the frames from his repaint
  mapa-agua.png, mapa-mercurio.png         with a battle screenshot and its JSON (the screen point of
                                           a ninja's feet and px per metre there, from the game):
                                           a puddle frame beside that ninja, at the game's scale
Deterministic for the same input.
"""
import json
import os
import shutil
import sys

from PIL import Image, ImageDraw, ImageFont

SRCS, OUT, GROUND = sys.argv[1].split(','), sys.argv[2], sys.argv[3]
SHOT = sys.argv[4] if len(sys.argv) > 5 else None
SHOT_JSON = sys.argv[5] if len(sys.argv) > 5 else None

SEQ, DIR_OF = {}, {}
for src in SRCS:
    MAN = json.load(open(os.path.join(src, 'manifest.json')))
    for sq in MAN['sequences']:
        SEQ[sq['id']] = sq
        DIR_OF[sq['id']] = src
FEET = MAN['feet']
PANEL = (32, 33, 43)   # his sheets' panel fill
PAGE = (21, 21, 29)    # his sheets' page colour
INK = (220, 224, 232)
DIM = (150, 156, 170)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def font(size, bold=False):
    try:
        return ImageFont.truetype(FONT_B if bold else FONT, size)
    except OSError:
        return ImageFont.load_default()


# The crop shown for each sequence, in the 256 frame: the ninja and its puddle, or the whole crack.
CROP = (FEET[0] - 64, FEET[1] - 108, FEET[0] + 64, FEET[1] + 20)
CROP_WIDE = (FEET[0] - 104, FEET[1] - 136, FEET[0] + 120, FEET[1] + 20)


def frames(seq):
    return [Image.open(os.path.join(DIR_OF[seq['id']], f)).convert('RGBA') for f in seq['files']]


def crop_of(seq):
    return CROP_WIDE if seq['wide'] else CROP


def on(bg, im):
    out = bg.copy()
    out.alpha_composite(im)
    return out


def sheet(path, title, rows, note):
    """rows: [(row label, sequence id, frames per line)]; every frame at 4x on his panel colour."""
    S, GAP, LAB = 4, 18, 34
    f_title, f_lab, f_row, f_note = font(40, True), font(24), font(28, True), font(22)
    blocks = []
    for label, sid, per in rows:
        seq = SEQ[sid]
        c = crop_of(seq)
        cw, ch = (c[2] - c[0]) * S, (c[3] - c[1]) * S
        n = len(seq['files'])
        lines = (n + per - 1) // per
        blocks.append((label, seq, c, cw, ch, per, lines))
    W = max(GAP + per * (cw + GAP) for _, _, _, cw, _, per, _ in blocks)
    H = 110 + sum(48 + lines * (LAB + ch + GAP) for *_, ch, _, lines in blocks) + 60
    img = Image.new('RGB', (W, H), PAGE)
    d = ImageDraw.Draw(img)
    d.text((GAP, 22), title, font=f_title, fill=INK)
    d.text((GAP, 72), note, font=f_note, fill=DIM)
    y = 110
    for label, seq, c, cw, ch, per, lines in blocks:
        d.text((GAP, y + 8), label, font=f_row, fill=INK)
        y += 48
        for i, fr in enumerate(frames(seq)):
            col, line = i % per, i // per
            x0 = GAP + col * (cw + GAP)
            y0 = y + line * (LAB + ch + GAP)
            name = seq['label'].split(' (')[0]
            d.text((x0, y0 + 4), f'{name} {i + 1}', font=f_lab, fill=DIM)
            cell = Image.new('RGBA', (c[2] - c[0], c[3] - c[1]), PANEL + (255,))
            cell.alpha_composite(fr.crop(c))
            img.paste(cell.resize((cw, ch), Image.NEAREST), (x0, y0 + LAB))
        y += lines * (LAB + ch + GAP)
    img.save(path, optimize=True)


def ground_bg(c):
    """A patch of the river forest ground (open grass, left of the river) the size of the crop."""
    g = Image.open(GROUND).convert('RGBA')
    w, h = c[2] - c[0], c[3] - c[1]
    x0, y0 = 300, 640 - (FEET[1] - c[1])
    return g.crop((x0, y0, x0 + w, y0 + h))


def gif(path, seq, scale=2):
    c = crop_of(seq)
    bg = ground_bg(c)
    ims = [on(bg, fr.crop(c)).resize(((c[2] - c[0]) * scale, (c[3] - c[1]) * scale), Image.NEAREST).convert('RGB') for fr in frames(seq)]
    step = round(1000 / seq['fps'])
    dur = [step] * len(ims)
    if not seq['loop']:
        dur[-1] = 900
    # One shared palette for the whole sequence, so nothing flickers.
    strip = Image.new('RGB', (ims[0].width, ims[0].height * len(ims)))
    for i, im in enumerate(ims):
        strip.paste(im, (0, i * im.height))
    pal = strip.quantize(colors=255, method=Image.MEDIANCUT)
    q = [im.quantize(palette=pal, dither=Image.NONE) for im in ims]
    q[0].save(path, save_all=True, append_images=q[1:], duration=dur, loop=0, disposal=1, optimize=False)


def map_shot(path, seq_id, frame_i, title):
    """The puddle frame on the game's own screenshot, beside a standing ninja, at the game's zoom."""
    shot = Image.open(SHOT).convert('RGBA')
    info = json.load(open(SHOT_JSON))
    z = info['pxPerM'] / MAN['pxPerM']                # screen px per sprite px
    fx, fy = info['puddle']                           # the puddle's feet point on the screen
    fr = Image.open(os.path.join(DIR_OF[seq_id], SEQ[seq_id]['files'][frame_i])).convert('RGBA')
    fr = fr.resize((round(fr.width * z), round(fr.height * z)), Image.NEAREST)
    shot.alpha_composite(fr, (round(fx - FEET[0] * z), round(fy - FEET[1] * z)))
    ux, uy = info['unit']
    m = info['pxPerM']
    box = (round(min(ux, fx) - 3.2 * m), round(uy - 3.0 * m), round(max(ux, fx) + 3.2 * m), round(max(uy, fy) + 1.0 * m))
    view = shot.crop(box)
    k = 2 if view.width < 900 else 1
    view = view.resize((view.width * k, view.height * k), Image.NEAREST)
    pad = 64
    out = Image.new('RGB', (view.width, view.height + pad), PAGE)
    out.paste(view.convert('RGB'), (0, pad))
    d = ImageDraw.Draw(out)
    d.text((14, 12), title, font=font(26, True), fill=INK)
    d.text((14, 42), f'Mapa del bosque del río, escala del juego (1 m = {MAN["pxPerM"]} px), ampliado x{k}', font=font(16), fill=DIM)
    out.save(path, optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    from_his = any(os.path.basename(d.rstrip('/')) != 'charco_muestra' for d in SRCS)
    if from_his:
        note = 'Copia de tu dibujo, píxel a píxel, a la escala del juego (ampliada x4).'
        title = 'Técnica de Agua: Cuerpo Líquido'
        note_m = 'Mercurio en tu estilo: tu movimiento y tus formas del agua, hechos de metal líquido (cromo). Escala del juego, x4.'
        title_m = 'Kōton: Forma de Plata Líquida (mercurio)'
    else:
        note = 'Muestra para repintar (no es arte final). Escala del juego, ampliada x4. Agua con tu paleta de agua v3.'
        title = 'Jutsu de agua: Forma de charco'
        note_m = 'Muestra para repintar (no es arte final). Escala del juego, ampliada x4. Mercurio: cromo, metal líquido.'
        title_m = 'Habilidad futura: Forma de mercurio'
    sheet(os.path.join(OUT, 'muestra-agua.png'), title, [
        ('Transformarse (ninja por defecto)', 'agua-transformarse-hombre', 6),
        ('Charco quieto (bucle)', 'agua-charco-quieto', 6),
        ('Salir (ninja por defecto)', 'agua-salir-hombre', 6),
        ('Transformarse (Lyra)', 'agua-transformarse-lyra', 6),
        ('Salir (Lyra)', 'agua-salir-lyra', 6),
    ], note)
    sheet(os.path.join(OUT, 'muestra-mercurio.png'), title_m, [
        ('Transformarse (ninja por defecto)', 'mercurio-transformarse-hombre', 6),
        ('Charco quieto (bucle)', 'mercurio-charco-quieto', 6),
        ('Salir (ninja por defecto)', 'mercurio-salir-hombre', 6),
        ('Transformarse (Lyra)', 'mercurio-transformarse-lyra', 6),
        ('Salir (Lyra)', 'mercurio-salir-lyra', 6),
        ('Moverse y meterse por la rendija bajo un muro', 'mercurio-moverse-rendija', 3),
    ], note_m)
    gd = os.path.join(OUT, 'gif')
    os.makedirs(gd, exist_ok=True)
    for s in SEQ.values():
        gif(os.path.join(gd, s['id'] + '.gif'), s)
    for src in SRCS:
        base = os.path.basename(src.rstrip('/'))
        rp = os.path.join(OUT, {'charco_muestra': 'para-repintar', 'charco_agua': 'para-repintar-agua', 'charco_mercurio': 'para-repintar-mercurio'}.get(base, 'para-repintar-' + base))
        if os.path.isdir(rp):
            shutil.rmtree(rp)
        os.makedirs(rp)
        for sid, d in DIR_OF.items():
            if d == src:
                for f in SEQ[sid]['files']:
                    shutil.copyfile(os.path.join(src, f), os.path.join(rp, f))
    if SHOT:
        map_shot(os.path.join(OUT, 'mapa-agua.png'), 'agua-charco-quieto', 0, 'Charco de agua junto a un ninja, en el mapa')
        map_shot(os.path.join(OUT, 'mapa-mercurio.png'), 'mercurio-charco-quieto', 0, 'Charco de mercurio junto a un ninja, en el mapa')


main()
