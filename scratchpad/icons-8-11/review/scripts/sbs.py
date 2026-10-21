import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
R, ICONS = sys.argv[1], sys.argv[2]
SHEETS = {'8': ['ryusei_swap','northstar_command','northstar_submission'],
          '9': ['mirai_evasion','koton_block','koton_wall','ryusei_warp'],
          '10': ['dragon_fire_bomb','wood_dragon_jutsu','adamantine_sealing_chains','taki_sixtyfour_palms'],
          '11': ['shadow_clone','dragon_fire_stream','water_dragon_suiryuudan']}
Z = 352
for s, ids in SHEETS.items():
    rows = []
    for jid in ids:
        his = Image.open(f'{R}/stage/s{s}/ref/{jid}.png').convert('RGB')
        o88 = Image.open(f'{ICONS}/{jid}@2x.png')
        o44 = Image.open(f'{ICONS}/{jid}.png')
        a88 = np.asarray(o88)[:, :, 3]; a44 = np.asarray(o44)[:, :, 3]
        print(jid, 'his', his.size, 'alpha88 min', a88.min(), 'alpha44 min', a44.min())
        h1 = his.resize((Z, Z), Image.NEAREST)  # his pixels, squeezed to square if not square
        h2 = his.resize((88, 88), Image.BOX).resize((Z, Z), Image.NEAREST)
        h3 = his.resize((44, 44), Image.BOX).resize((Z, Z), Image.NEAREST)
        a = o88.convert('RGB').resize((Z, Z), Image.NEAREST)
        b = o44.convert('RGB').resize((Z, Z), Image.NEAREST)
        row = Image.new('RGB', (5 * Z + 40, Z), (40, 40, 40))
        for i, im in enumerate([h1, h2, a, h3, b]):
            row.paste(im, (i * (Z + 10), 0))
        rows.append(row)
    out = Image.new('RGB', (rows[0].width, len(rows) * (Z + 10)), (40, 40, 40))
    for i, r in enumerate(rows):
        out.paste(r, (0, i * (Z + 10)))
    out.save(f'{R}/sbs-{s}.png')
