from PIL import Image, ImageDraw, ImageFont
import os
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/clans-shots/mirai'
OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/clans-shots/mirai-sheet.png'
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
FR = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
FH = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
FH2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 19)
PW = 780
# (file, [crop boxes side by side], title, line)
P = [
 ('01-ojo-consejo.png', [(330, 70, 1330, 640)], 'Ojo del Mañana', 'Turno de Akira (Mirai): el consejo y las marcas rojas en el suelo'),
 ('02-ojo-planes-cerca.png', [(420, 215, 1480, 778)], 'Ojo del Mañana', 'Enemigos a ≤18 m: línea hasta donde irán + icono de su acción'),
 ('03-ojo-objetivo-cerca.png', [(276, 180, 1330, 780)], 'Ojo del Mañana', 'A quién atacarán: anillo rojo y área de la Bola de Fuego planeada'),
 ('04-llama-boton.png', [(430, 420, 1340, 865)], 'Katon: Llama Persecutoria', 'Botón «Persigue» (3): acción, 12 m, 2d6 fuego, DES con desventaja'),
 ('05-llama-apuntar.png', [(540, 270, 1340, 865)], 'Katon: Llama Persecutoria', 'Al apuntar: «Salvación DES CD 15 · con desventaja»'),
 ('06-llama-fuera-de-alcance.png', [(560, 130, 1600, 790)], 'Katon: Llama Persecutoria', 'Objetivo a 12.9 m: «Fuera de alcance» (alcance 12 m)'),
 ('07-llama-en-vuelo.png', [(560, 300, 1340, 640)], 'Katon: Llama Persecutoria', 'Sellos de mano y la llama en vuelo hacia Rogue 1'),
 ('08-llama-resultado.png', [(960, 240, 1600, 560)], 'Katon: Llama Persecutoria', 'Dados 16 y 2, queda el 2: falla (6 vs CD 15) y recibe 5 de fuego'),
 ('09-evasion-aviso.png', [(400, 250, 1180, 600)], 'Evasión Premonitoria', 'Rogue 1 acierta a Akira: aviso de reacción (2 chakra y la reacción)'),
 ('10-evasion-paso.png', [(250, 360, 1030, 640)], 'Evasión Premonitoria', '«¡Esquivado!»: Akira ya está 1.58 m al lado (el paso no se anima)'),
 ('11-evasion-resultado.png', [(270, 400, 610, 600), (1250, 250, 1590, 555)], 'Evasión Premonitoria', 'Registro: «Akira se aparta: el ataque falla» · chakra 27 → 25'),
 ('12-evasion-una-por-ronda.png', [(420, 400, 700, 600), (1250, 250, 1590, 615)], 'Evasión Premonitoria', 'Una vez por ronda: el golpe de Rogue 2 entra sin aviso (4 de daño)'),
 ('13-contra-koton-antes.png', [(280, 280, 1340, 870)], 'Contra: Kōton vence a Mirai', 'Hana apunta un muro de metal entre Akira y los enemigos'),
 ('14-contra-koton-despues.png', [(330, 280, 1330, 720)], 'Contra: Kōton vence a Mirai', 'Tras el muro: los planes de Rogue 2 y Raider ya no se ven'),
 ('15-contra-northstar-inmune.png', [(560, 280, 1360, 860)], 'Contra: Mirai vence a Northstar', 'Hana como Northstar (prueba): Command no toma a un Mirai'),
 ('16-enemigo-mirai-esquiva.png', [(960, 220, 1600, 500)], 'Evasión Premonitoria (enemigo)', 'Los renegados también son Mirai: Rogue 1 esquiva la Llama'),
 ('17-evasion-antes-durante-despues.png', [(0, 0, 1620, 540)], 'Evasión Premonitoria', 'Antes · durante · después: Akira desaparece, no se ve el paso'),
 ('18-evidencia-movimiento-sin-animar.png', [(0, 0, 1200, 500)], 'Prueba aparte (movimiento)', 'Hana camina 4 m a 0.1× de velocidad y ya está al final'),
]
BG = (11, 15, 20)
BAR = (17, 24, 39)
GAP = 16
CAP = 70

def panel(f, boxes):
    im = Image.open(os.path.join(D, f)).convert('RGB')
    parts = [im.crop(b) for b in boxes]
    if len(parts) == 1:
        p = parts[0]
    else:
        h = max(x.height for x in parts)
        w = sum(x.width for x in parts) + 8 * (len(parts) - 1)
        p = Image.new('RGB', (w, h), (5, 6, 12))
        x = 0
        for q in parts:
            p.paste(q, (x, 0)); x += q.width + 8
    k = PW / p.width
    return p.resize((PW, round(p.height * k)), Image.LANCZOS)

def fit(draw, text, font, width):
    if draw.textlength(text, font=font) <= width: return text
    while draw.textlength(text + '…', font=font) > width: text = text[:-1]
    return text + '…'

cells = []
for f, boxes, title, line in P:
    img = panel(f, boxes)
    c = Image.new('RGB', (PW, CAP + img.height), BAR)
    d = ImageDraw.Draw(c)
    n = f.split('-')[0]
    d.text((14, 8), fit(d, f'{n} · {title}', FB, PW - 28), font=FB, fill=(254, 243, 199))
    d.text((14, 40), fit(d, line, FR, PW - 28), font=FR, fill=(226, 232, 240))
    c.paste(img, (0, CAP))
    cells.append(c)

W = GAP * 3 + PW * 2
HEAD = 92
rows = [cells[i:i + 2] for i in range(0, len(cells), 2)]
H = HEAD + sum(max(c.height for c in r) + GAP for r in rows) + GAP
sheet = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(sheet)
d.text((GAP, 14), 'Clan Mirai · fase 1 · habilidades base en batalla', font=FH, fill=(254, 202, 202))
d.text((GAP, 56), 'Ojo del Mañana (pasiva, 18 m) · Evasión Premonitoria (reacción, 2 chakra) · Katon: Llama Persecutoria (acción, 3 chakra, 12 m)', font=FH2, fill=(203, 213, 225))
y = HEAD
for r in rows:
    x = GAP
    for c in r:
        sheet.paste(c, (x, y)); x += PW + GAP
    y += max(c.height for c in r) + GAP
sheet.save(OUT, optimize=True)
print(OUT, sheet.size)
