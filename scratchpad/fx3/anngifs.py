# usage: anngifs.py <art2> <char.png> : both annihilation GIFs (all surge rows, burn x2, fade)
import sys, os, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
art2, charp = sys.argv[1], sys.argv[2]
st = os.path.join(art2, 'staging', 'vfx_fire')
man = json.load(open(os.path.join(st, 'manifest.json')))['sprites']
ch = Image.open(charp).convert('RGBA')
FEET = (64, 120)
def frames(name):
    s = man[name]
    im = Image.open(os.path.join(st, s['file'])).convert('RGBA')
    fw, fh = s['frameW'], s['frameH']
    return s, {an: [im.crop((i * fw, info['row'] * fh, (i + 1) * fw, (info['row'] + 1) * fh)) for i in range(info['frames'])] for an, info in s['anims'].items()}
def staged(s, f, left=56):
    g = Image.new('RGBA', (f.width + left, f.height), (20, 22, 33, 255))
    ax, ay = s['anchor']
    g.alpha_composite(ch, (left + ax - 14 - FEET[0], ay - FEET[1])); g.alpha_composite(f, (left, 0))
    return g.convert('RGB')
def gif(name, out):
    s, fr = frames(name)
    keys = sorted([k for k in fr if k.startswith('surge')], key=lambda k: int(k[5:] or 1))
    surge = [f for k in keys for f in fr[k]]
    seq = [staged(s, f) for f in surge + fr['burn'] + fr['burn'] + fr['fade']]
    w, h = seq[0].size
    pick = [len(surge) // 2, len(surge) + 2, len(surge) + 13, len(seq) - 6, len(seq) - 3]
    mont = Image.new('RGB', (w, h * len(pick)))
    for n, j in enumerate(pick): mont.paste(seq[j], (0, h * n))
    pal = mont.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in seq]
    q[0].save(out + '.part', format='GIF', save_all=True, append_images=q[1:], duration=83, loop=0, disposal=1); os.replace(out + '.part', out)
    print(os.path.basename(out), len(q), 'frames', os.path.getsize(out) // 1024, 'KB', keys)
gif('annihilation_enh', os.path.join(art2, 'vfx-fire-annihilation-s.gif'))
gif('annihilation', os.path.join(art2, 'vfx-fire-annihilation-normal.gif'))
