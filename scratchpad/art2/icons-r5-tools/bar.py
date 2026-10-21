# bar.py work_dir out.png Z : his row (scaled to our slot size, box) over our row, on the dark bar, at xZ
import sys
from PIL import Image
w, out, Z = sys.argv[1], sys.argv[2], int(sys.argv[3])
ids = ['fireball_goukakyu', 'kirin_thunder', 'great_fire_annihilation', 'water_shield_suijinheki']
frame = Image.open(f'{w}/out/skill_slot_steel.png').convert('RGBA')
row = Image.new('RGBA', (4*56 + 3*4, 56), (17, 18, 24, 255))
for i, iid in enumerate(ids):
    ic = Image.open(f'{w}/out/{iid}.png').convert('RGBA')
    row.alpha_composite(ic, (i*60 + 6, 6)); row.alpha_composite(frame, (i*60, 0))
his = Image.open(f'{w}/out/ref/row.png').convert('RGBA')
k = 56 / 245.0
hisr = his.resize((round(his.size[0]*k), round(his.size[1]*k)), Image.BOX)
bar = Image.new('RGBA', (max(row.size[0], hisr.size[0]) + 16, row.size[1] + hisr.size[1] + 24), (17, 18, 24, 255))
bar.alpha_composite(hisr, (8, 8)); bar.alpha_composite(row, (8, hisr.size[1] + 16))
bar.convert('RGB').resize((bar.size[0]*Z, bar.size[1]*Z), Image.NEAREST).save(out)
