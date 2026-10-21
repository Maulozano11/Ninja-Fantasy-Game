import sys, json
from PIL import Image
st = '../art2/staging/vfx_wind_v3/'
man = json.load(open(st + 'manifest.json'))['sprites']
name, anim, k, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
per = int(sys.argv[5]) if len(sys.argv) > 5 else 99
m = man[name]; a = m['anims'][anim]
sh = Image.open(st + m['file']).convert('RGBA')
fw, fh = m['frameW'], m['frameH']
n = a['frames']; cols = min(n, per); rows = -(-n // cols)
o = Image.new('RGBA', (cols * (fw + 2), rows * (fh + 2)), (0, 0, 0, 255))
for i in range(n):
    f = sh.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh))
    bg = Image.new('RGBA', (fw, fh), (32, 32, 42, 255)); bg.alpha_composite(f)
    o.paste(bg, ((i % cols) * (fw + 2), (i // cols) * (fh + 2)))
o.resize((o.width * k, o.height * k), Image.NEAREST).save(out)
