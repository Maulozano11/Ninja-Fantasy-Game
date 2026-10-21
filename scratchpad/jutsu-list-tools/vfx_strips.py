"""Preview strips of every jutsu VFX sheet: each animation row's frames side by side on a dark
background, at 2x (1x for the huge signature sheets), with Spanish labels.

python3 -I vfx_strips.py <repo>/src/assets/world <out_dir>
Writes <out_dir>/<element>-<role>.png (beasts: <element>-beast.png) and prints one line per file.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WORLD = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

EL_ES = {'fire': 'Fuego', 'water': 'Agua', 'wind': 'Viento', 'lightning': 'Rayo', 'earth': 'Tierra',
         'genjutsu': 'Genjutsu', 'chakra': 'Chakra', 'poison': 'Veneno'}
ROLE_ES = {
    'bolt': 'proyectil', 'multi': 'ráfaga triple', 'multi_hit': 'impacto de ráfaga', 'slash': 'corte (media luna)',
    'hit': 'impacto', 'blast': 'explosión de área', 'breath': 'aliento (cono)', 'stream': 'chorro (tramo que se repite)',
    'stream_head': 'punta del chorro', 'sphere': 'esfera', 'aura': 'aura (capa delante)', 'aura_back': 'aura (capa detrás)',
    'wall': 'muro de lado', 'wall_diag': 'muro en diagonal', 'wall_depth': 'muro hacia el fondo', 'beast': 'bestia invocada',
    'fireball': 'firma: bola de fuego', 'fireball_great': 'firma: gran bola de fuego',
    'annihilation': 'firma: gran aniquilación (cono)', 'annihilation_enh': 'firma: gran aniquilación potenciada',
    'kirin': 'firma: rayo del cielo', 'kirin_enh': 'firma: rayo del cielo potenciado',
}
ANIM_ES = {'fly': 'vuelo', 'hit': 'impacto', 'blast': 'explosión', 'rise': 'sube', 'idle': 'en pie (bucle)',
           'burst': 'estalla', 'surge': 'oleada', 'surge2': 'oleada 2', 'surge3': 'oleada 3', 'burn': 'arde (bucle)',
           'fade': 'se apaga', 'gather': 'se forma', 'strike': 'golpe', 'impact': 'impacto', 'sustain': 'se mantiene',
           'summon': 'invocación', 'dive': 'picado', 'attack': 'ataque'}

FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
FONT_B = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
FONT_S = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
BG = (20, 18, 28, 255)
CELL = (34, 31, 46, 255)
EDGE = (60, 56, 78, 255)
TXT = (232, 228, 240, 255)
DIM = (150, 144, 170, 255)
ANCHOR = (255, 90, 90, 255)
PER_LINE = 8
PAD = 10


def strip(sheet: Image.Image, spec: dict, title: str, sub: str) -> Image.Image:
    fw, fh = spec['frameW'], spec['frameH']
    k = 2 if max(fw, fh) <= 420 else 1
    cw, ch = fw * k, fh * k
    anims = sorted(spec['anims'].items(), key=lambda a: a[1]['row'])
    blocks = []  # (label, [frame images])
    for name, a in anims:
        frames = []
        for i in range(a['frames']):
            fr = sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh))
            frames.append(fr.resize((cw, ch), Image.NEAREST))
        loop = ', bucle' if a.get('loop') else ''
        label = f"«{name}» {ANIM_ES.get(name, name)}: {a['frames']} cuadros a {a['fps']} fps{loop}  ({a['frames'] / a['fps']:.2f} s)"
        blocks.append((label, frames))
    cols = min(PER_LINE, max(len(f) for _, f in blocks))
    W = max(PAD * 2 + cols * (cw + PAD) - PAD, 900)
    head_h = 64
    lab_h = 26
    num_h = 16
    H = head_h
    for _, frames in blocks:
        lines = (len(frames) + PER_LINE - 1) // PER_LINE
        H += lab_h + lines * (ch + num_h + PAD)
    H += PAD
    img = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((PAD, 8), title, font=FONT_B, fill=TXT)
    d.text((PAD, 38), sub + (f'   escala {k}x' if k != 2 else '   escala 2x') + '   (punto rojo = ancla)', font=FONT_S, fill=DIM)
    y = head_h
    ax, ay = spec['anchor']
    for label, frames in blocks:
        d.text((PAD, y + 3), label, font=FONT, fill=TXT)
        y += lab_h
        for i, fr in enumerate(frames):
            col, line = i % PER_LINE, i // PER_LINE
            x0 = PAD + col * (cw + PAD)
            y0 = y + line * (ch + num_h + PAD)
            d.rectangle((x0 - 1, y0 - 1, x0 + cw, y0 + ch), fill=CELL, outline=EDGE)
            img.alpha_composite(fr, (x0, y0))
            px, py = x0 + ax * k, y0 + ay * k
            d.rectangle((px - 1, py - 1, px + 1, py + 1), fill=ANCHOR)
            d.text((x0 + 2, y0 + ch + 1), str(i + 1), font=FONT_S, fill=DIM)
        lines = (len(frames) + PER_LINE - 1) // PER_LINE
        y += lines * (ch + num_h + PAD)
    return img.convert('RGB')


rows = []
for man in sorted(WORLD.glob('vfx_*/manifest.json')):
    m = json.loads(man.read_text())
    group = m['group']
    for key, spec in m['sprites'].items():
        if group == 'vfx_beasts':
            el, role = key, 'beast'
        else:
            el, role = group[4:], key
        sheet = Image.open(man.parent / spec['file']).convert('RGBA')
        title = f"{EL_ES.get(el, el)} / {ROLE_ES.get(role, role)}   [{el}-{role}]"
        sub = f"{group}/{spec['file']}   cuadro {spec['frameW']}x{spec['frameH']} px = {spec['meters'][0]} x {spec['meters'][1]} m   «{spec['label']}»"
        out = OUT / f'{el}-{role}.png'
        strip(sheet, spec, title, sub).save(out, optimize=True)
        anims = ', '.join(f"{n}:{a['frames']}" for n, a in sorted(spec['anims'].items(), key=lambda a: a[1]['row']))
        rows.append(f'{out}\t{anims}')
print('\n'.join(rows))
print(len(rows), 'strips')
