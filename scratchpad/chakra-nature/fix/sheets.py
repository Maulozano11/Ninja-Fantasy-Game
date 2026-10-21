# Before/after sheets with Spanish labels for the review fixes: python3 -I sheets.py <chakra-nature dir>
import sys
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)


def side_by_side(pairs, out, scale=1, title=None):
    """pairs: [(label, image path, crop box)], laid out left to right with a label over each."""
    tiles = []
    for label, path, box in pairs:
        im = Image.open(path).convert('RGB')
        if box:
            im = im.crop(box)
        if scale != 1:
            im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        tiles.append((label, im))
    head = 44 + (34 if title else 0)
    w = sum(t.width for _, t in tiles) + 16 * (len(tiles) + 1)
    h = max(t.height for _, t in tiles) + head + 16
    sheet = Image.new('RGB', (w, h), (20, 17, 13))
    d = ImageDraw.Draw(sheet)
    if title:
        d.text((16, 10), title, font=SMALL, fill=(217, 202, 166))
    x = 16
    for label, t in tiles:
        d.text((x, head - 34), label, font=FONT, fill=(242, 196, 109))
        sheet.paste(t, (x, head))
        x += t.width + 16
    sheet.save(out)


# 1. A ninja saved before the sprite look (no look, Northstar, aura #06b6d4): only the clan changes.
side_by_side(
    [
        ('Antes: solo cambia el clan (Ryusei) -> Naturaleza Viento', f'{D}/review/legacy-despues-clan.png', (24, 112, 1160, 804)),
        ('Ahora: el mismo cambio de clan -> sigue siendo Agua', f'{D}/fix/legacy-despues-clan.png', (24, 112, 1160, 804)),
    ],
    f'{D}/arreglo-clan-no-cambia-naturaleza.png',
    title='Ninja guardado sin aspecto (clan Northstar, Agua). Cambiar de clan ya no le cambia el tipo de chakra ni la naturaleza.',
)

# 2. 1600x900: the pose bar covered the end of the burst's description; now it stays between the panels.
side_by_side(
    [
        ('Antes', f'{D}/review/ui-tierra-magenta.png', (100, 590, 1120, 810)),
        ('Ahora', f'{D}/fix/tierra-magenta.png', (100, 590, 1120, 810)),
    ],
    f'{D}/arreglo-barra-de-poses-1600.png',
    title='Pantalla de 1600x900: la barra de poses tapaba el final de la descripción; ahora queda entre los paneles (en dos filas).',
)
