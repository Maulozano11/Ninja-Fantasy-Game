import sys, os
import numpy as np
from PIL import Image
R, ICONS = sys.argv[1], sys.argv[2]
SHEET = {'ryusei_swap':'8','northstar_command':'8','northstar_submission':'8','mirai_evasion':'9','koton_block':'9','koton_wall':'9','ryusei_warp':'9','dragon_fire_bomb':'10','wood_dragon_jutsu':'10','adamantine_sealing_chains':'10','taki_sixtyfour_palms':'10','shadow_clone':'11','dragon_fire_stream':'11','water_dragon_suiryuudan':'11'}
Z = 440
os.makedirs(f'{R}/zoom', exist_ok=True)
for jid, s in SHEET.items():
    his = Image.open(f'{R}/stage/s{s}/ref/{jid}.png').convert('RGB')
    o88 = Image.open(f'{ICONS}/{jid}@2x.png').convert('RGB')
    o44 = Image.open(f'{ICONS}/{jid}.png').convert('RGB')
    tiles = [his.resize((Z, Z), Image.NEAREST), o88.resize((Z, Z), Image.NEAREST),
             his.resize((44, 44), Image.BOX).resize((Z, Z), Image.NEAREST), o44.resize((Z, Z), Image.NEAREST)]
    out = Image.new('RGB', (2 * Z + 8, 2 * Z + 8), (255, 255, 255))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % 2) * (Z + 8), (i // 2) * (Z + 8)))
    out.save(f'{R}/zoom/{jid}.png')
