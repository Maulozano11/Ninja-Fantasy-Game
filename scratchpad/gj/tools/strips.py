import json, os, sys
from PIL import Image
G = 'art2/staging/vfx_genjutsu_v3'
M = json.load(open(G + '/manifest.json'))['sprites']
os.makedirs('gj/strips', exist_ok=True)
bgc = tuple(int(v) for v in (sys.argv[1] if len(sys.argv) > 1 else '32,32,42').split(','))
for n, s in M.items():
    if n == 'beast': continue
    sh = Image.open(G + '/' + s['file']).convert('RGBA')
    for an, a in s['anims'].items():
        fw, fh = s['frameW'], s['frameH']
        z = 3 if fw <= 120 else 2
        out = Image.new('RGBA', ((fw + 2) * a['frames'], fh), bgc + (255,))
        for i in range(a['frames']):
            out.alpha_composite(sh.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)), (i * (fw + 2), 0))
        out = out.resize((out.width * z, out.height * z), Image.NEAREST)
        out.convert('RGB').save('gj/strips/%s-%s.png' % (n, an))
