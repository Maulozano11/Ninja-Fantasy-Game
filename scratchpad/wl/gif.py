# usage: gif.py <art2> : vfx-fire-v3-wall_diag.gif, wall_diag alone at 2x: rise once, then idle twice, each at its fps
import sys, os, json
from PIL import Image
art2 = sys.argv[1]
d = os.path.join(art2, 'staging', 'vfx_fire')
s = json.load(open(os.path.join(d, 'manifest.json')))['sprites']['wall_diag']
im = Image.open(os.path.join(d, s['file'])).convert('RGBA'); fw, fh = s['frameW'], s['frameH']
seq, dur = [], []
for an, reps in [('rise', 1), ('idle', 2)]:
    info = s['anims'][an]
    for _ in range(reps):
        for i in range(info['frames']):
            f = im.crop((i * fw, info['row'] * fh, (i + 1) * fw, (info['row'] + 1) * fh))
            g = Image.new('RGBA', f.size, (27, 28, 38, 255)); g.alpha_composite(f)
            seq.append(g.convert('RGB').resize((fw * 2, fh * 2), Image.NEAREST)); dur.append(round(1000 / info['fps']))
mont = Image.new('RGB', (seq[0].width, seq[0].height * 3))
for n, j in enumerate([6, 11, 15]): mont.paste(seq[j], (0, n * seq[0].height))
pal = mont.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in seq]
out = os.path.join(art2, 'vfx-fire-v3-wall_diag.gif')
q[0].save(out + '.part', format='GIF', save_all=True, append_images=q[1:], duration=dur, loop=0, disposal=1); os.replace(out + '.part', out)
print(os.path.basename(out), len(q), 'frames', os.path.getsize(out) // 1024, 'KB')
