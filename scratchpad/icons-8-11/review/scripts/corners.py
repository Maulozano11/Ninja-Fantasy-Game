import sys
import numpy as np
from PIL import Image
R, ICONS = sys.argv[1], sys.argv[2]
SHEET = {'ryusei_swap':'8','northstar_command':'8','northstar_submission':'8','mirai_evasion':'9','koton_block':'9','koton_wall':'9','ryusei_warp':'9','dragon_fire_bomb':'10','wood_dragon_jutsu':'10','adamantine_sealing_chains':'10','taki_sixtyfour_palms':'10','shadow_clone':'11','dragon_fire_stream':'11','water_dragon_suiryuudan':'11'}
for jid, s in SHEET.items():
    for name, im in (('his', Image.open(f'{R}/stage/s{s}/ref/{jid}.png')), ('88', Image.open(f'{ICONS}/{jid}@2x.png')), ('44', Image.open(f'{ICONS}/{jid}.png'))):
        a = np.asarray(im.convert('RGB')).astype(int)
        H, W, _ = a.shape
        k = 4 if name != '44' else 2
        out = []
        for (y, x) in ((0, 0), (0, W - k), (H - k, 0), (H - k, W - k)):
            blk = a[y:y + k, x:x + k].reshape(-1, 3)
            # goldish: r>150, g>100, b<90, r>g>b
            gold = ((blk[:, 0] > 150) & (blk[:, 1] > 100) & (blk[:, 2] < 100) & (blk[:, 0] > blk[:, 2] + 60)).sum()
            grey = ((abs(blk[:, 0] - blk[:, 1]) < 12) & (abs(blk[:, 1] - blk[:, 2]) < 16) & (blk[:, 0] > 40) & (blk[:, 0] < 120)).sum()
            out.append('%d/%d' % (gold, grey))
        print('%-26s %-4s corners gold/grey TL TR BL BR: %s' % (jid, name, ' '.join(out)))
