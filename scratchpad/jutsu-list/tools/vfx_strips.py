"""Preview strips of every jutsu VFX sheet: each animation's frames side by side on a dark
background, with Spanish labels. Usage: python3 -I vfx_strips.py <repo> <outdir>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

repo, out = sys.argv[1], sys.argv[2]
world = os.path.join(repo, 'src/assets/world')
os.makedirs(out, exist_ok=True)

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f_title = ImageFont.truetype(FONTB, 22)
f_row = ImageFont.truetype(FONT, 16)
f_idx = ImageFont.truetype(FONT, 12)

BG = (18, 16, 26)
CELL = (30, 27, 42)
EDGE = (58, 54, 76)
TXT = (236, 232, 245)
DIM = (150, 144, 170)

EL_ES = {'fire': 'Fuego', 'water': 'Agua', 'wind': 'Viento', 'lightning': 'Rayo', 'earth': 'Tierra',
         'genjutsu': 'Genjutsu', 'chakra': 'Chakra', 'poison': 'Veneno'}
ROLE_ES = {'bolt': 'proyectil (bolt)', 'stream': 'chorro, tramo (stream)', 'stream_head': 'chorro, punta (stream_head)',
           'breath': 'aliento / cono (breath)', 'sphere': 'esfera (sphere)', 'slash': 'corte (slash)',
           'multi': 'ráfaga múltiple (multi)', 'multi_hit': 'impacto múltiple (multi_hit)', 'hit': 'impacto (hit)',
           'blast': 'explosión de área (blast)', 'wall': 'muro de frente (wall)', 'wall_diag': 'muro 3/4 (wall_diag)',
           'wall_depth': 'muro hacia el fondo (wall_depth)', 'aura': 'aura, capa delante (aura)',
           'aura_back': 'aura, capa detrás (aura_back)', 'beast': 'bestia (beast)',
           'fireball': 'firma: Bola de fuego', 'fireball_great': 'firma: Gran bola de fuego',
           'annihilation': 'firma: Aniquilación', 'annihilation_enh': 'firma: Aniquilación potenciada',
           'kirin': 'firma: Kirin', 'kirin_enh': 'firma: Kirin potenciado'}
ANIM_ES = {'fly': 'vuelo', 'hit': 'impacto', 'blast': 'explosión', 'rise': 'se levanta', 'idle': 'reposo (bucle)',
           'burst': 'estallido', 'surge': 'oleada', 'surge2': 'oleada 2', 'surge3': 'oleada 3', 'burn': 'arde (bucle)',
           'fade': 'se apaga', 'gather': 'se forma', 'strike': 'cae el golpe', 'impact': 'impacto',
           'sustain': 'se mantiene (bucle)', 'dive': 'picada', 'attack': 'ataque', 'summon': 'invocación'}
PER_LINE = 8
PAD = 6


def strip(img, spec, title, path):
    fw, fh = spec['frameW'], spec['frameH']
    k = 2 if fw <= 340 and fh <= 340 else 1  # signature sheets are huge: 1x
    cw, ch = fw * k, fh * k
    rows = []
    for name, a in spec['anims'].items():
        frames = [img.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in range(a['frames'])]
        label = f"{ANIM_ES.get(name, name)} ({name}): {a['frames']} cuadros a {a['fps']} fps" + (', en bucle' if a.get('loop') else '')
        rows.append((label, frames))
    ncol = min(PER_LINE, max(len(f) for _, f in rows))
    W = PAD + ncol * (cw + PAD)
    W = max(W, 760)
    H = 44 + 26
    for _, fr in rows:
        lines = (len(fr) + PER_LINE - 1) // PER_LINE
        H += 26 + lines * (ch + PAD + 16)
    sheet = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 8), title, font=f_title, fill=TXT)
    d.text((PAD, 40), f"cuadro {fw}x{fh} px · mostrado a {k}x · 57 px = 1 m", font=f_row, fill=DIM)
    y = 70
    for label, fr in rows:
        d.text((PAD, y), label, font=f_row, fill=TXT)
        y += 24
        for i, f in enumerate(fr):
            col, line = i % PER_LINE, i // PER_LINE
            x = PAD + col * (cw + PAD)
            yy = y + line * (ch + PAD + 16)
            d.rectangle((x - 1, yy - 1, x + cw, yy + ch), fill=CELL, outline=EDGE)
            big = f.resize((cw, ch), Image.NEAREST) if k != 1 else f
            sheet.paste(big, (x, yy), big)
            d.text((x + 2, yy + ch + 1), str(i), font=f_idx, fill=DIM)
        y += ((len(fr) + PER_LINE - 1) // PER_LINE) * (ch + PAD + 16) + 2
    sheet.save(path, optimize=True)
    return sheet.size, k


made = []
reps = {}
for el in EL_ES:
    g = os.path.join(world, f'vfx_{el}')
    m = json.load(open(os.path.join(g, 'manifest.json')))
    for name, spec in m['sprites'].items():
        img = Image.open(os.path.join(g, spec['file'])).convert('RGBA')
        title = f"{EL_ES[el]} · {ROLE_ES.get(name, name)}"
        p = os.path.join(out, f'{el}-{name}.png')
        size, k = strip(img, spec, title, p)
        made.append((p, size, k))
        pref = next((n for n in ('impact', 'burn', 'idle', 'fly', 'burst', 'hit', 'blast') if n in spec['anims']), next(iter(spec['anims'])))
        a = spec['anims'][pref]
        mid = a['frames'] // 2
        reps.setdefault(el, []).append((name, img.crop((mid * spec['frameW'], a['row'] * spec['frameH'], (mid + 1) * spec['frameW'], (a['row'] + 1) * spec['frameH']))))
# Beasts: vfx_beasts/<element>
g = os.path.join(world, 'vfx_beasts')
m = json.load(open(os.path.join(g, 'manifest.json')))
for el, spec in m['sprites'].items():
    img = Image.open(os.path.join(g, spec['file'])).convert('RGBA')
    title = f"{EL_ES[el]} · bestia: {spec['label']}"
    p = os.path.join(out, f'{el}-beast.png')
    size, k = strip(img, spec, title, p)
    made.append((p, size, k))
    a = spec['anims']['fly']
    mid = a['frames'] // 2
    reps.setdefault(el, []).append(('beast', img.crop((mid * spec['frameW'], 0, (mid + 1) * spec['frameW'], spec['frameH']))))

# One overview per element: a middle frame of every sheet, at 1x, labelled.
for el, items in reps.items():
    cols = 6
    cell = 320
    rowsN = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (PAD + cols * (cell + PAD), 44 + rowsN * (cell + 26 + PAD)), BG)
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 8), f"{EL_ES[el]}: todos los efectos (un cuadro de cada uno, 1x; los grandes reducidos)", font=f_title, fill=TXT)
    for i, (name, fr) in enumerate(items):
        x = PAD + (i % cols) * (cell + PAD)
        y = 44 + (i // cols) * (cell + 26 + PAD)
        d.rectangle((x, y, x + cell - 1, y + cell - 1), fill=CELL, outline=EDGE)
        w, h = fr.size
        s = min(1, (cell - 4) / w, (cell - 4) / h)
        if s < 1:
            fr = fr.resize((max(1, int(w * s)), max(1, int(h * s))), Image.NEAREST)
        sheet.paste(fr, (x + (cell - fr.size[0]) // 2, y + (cell - fr.size[1]) // 2), fr)
        d.text((x + 2, y + cell + 3), name if name != 'beast' else 'beast (bestia)', font=f_row, fill=TXT)
    p = os.path.join(out, f'overview-{el}.png')
    sheet.save(p, optimize=True)
    made.append((p, sheet.size, 1))

for p, size, k in made:
    print(f'{p}\t{size[0]}x{size[1]}\t{k}x')
