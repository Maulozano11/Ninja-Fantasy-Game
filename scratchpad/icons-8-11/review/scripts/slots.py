import sys
from PIL import Image
R, ICONS = sys.argv[1], sys.argv[2]
SHEET = {'ryusei_swap':'8','northstar_command':'8','northstar_submission':'8','mirai_evasion':'9','koton_block':'9','koton_wall':'9','ryusei_warp':'9','dragon_fire_bomb':'10','wood_dragon_jutsu':'10','adamantine_sealing_chains':'10','taki_sixtyfour_palms':'10','shadow_clone':'11','dragon_fire_stream':'11','water_dragon_suiryuudan':'11'}
frame = Image.open(f'{ICONS}/skill_slot_steel.png').convert('RGBA')
fw, fh = frame.size
print('frame', frame.size)
def slot(icon, k):
    f = frame.resize((fw * k, fh * k), Image.NEAREST)
    base = Image.new('RGBA', f.size, (16, 18, 24, 255))
    base.paste(icon.convert('RGBA'), (6 * k, 6 * k))
    base.alpha_composite(f)
    return base
ids = list(SHEET)
# rows: his box44 in slot (1x), ours 44 in slot (1x), his box88 in slot(2x), ours 88 in slot (2x)
W = len(ids) * (fw * 2 + 8)
out = Image.new('RGBA', (W, fh * 2 * 2 + fh * 2 + 40), (16, 18, 24, 255))
for i, jid in enumerate(ids):
    his = Image.open(f'{R}/stage/s{SHEET[jid]}/ref/{jid}.png').convert('RGB')
    o44 = Image.open(f'{ICONS}/{jid}.png'); o88 = Image.open(f'{ICONS}/{jid}@2x.png')
    x = i * (fw * 2 + 8)
    out.alpha_composite(slot(his.resize((44, 44), Image.BOX), 1), (x, 0))
    out.alpha_composite(slot(o44, 1), (x + fw + 4, 0))
    # 2x: frame doubled, 88 inside
    f2 = frame.resize((fw * 2, fh * 2), Image.NEAREST)
    for j, ic in enumerate((his.resize((88, 88), Image.BOX), o88)):
        base = Image.new('RGBA', f2.size, (16, 18, 24, 255)); base.paste(ic.convert('RGBA'), (12, 12)); base.alpha_composite(f2)
        out.alpha_composite(base, (x, fh + 10 + j * (fh * 2 + 6)))
out.save(f'{R}/slots-review.png')
out.resize((out.width * 2, out.height * 2), Image.NEAREST).crop((0, 0, out.width, out.height * 2)).save(f'{R}/slots-review-zoom-a.png')
out.resize((out.width * 2, out.height * 2), Image.NEAREST).crop((out.width, 0, out.width * 2, out.height * 2)).save(f'{R}/slots-review-zoom-b.png')
