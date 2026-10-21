# usage: flash.py <staging> <group> [names...] : mean alpha x brightness per frame for each row,
# and the biggest step between neighbouring frames as a share of the row's peak.
import sys, os, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
root, g, names = sys.argv[1], sys.argv[2], sys.argv[3:]
man = json.load(open(os.path.join(root, g, 'manifest.json')))['sprites']
for name, s in man.items():
    if names and name not in names: continue
    im = Image.open(os.path.join(root, g, s['file'])).convert('RGBA')
    fw, fh = s['frameW'], s['frameH']
    rows = {}
    for an, info in s['anims'].items():
        vals = []
        for i in range(info['frames']):
            f = im.crop((i * fw, info['row'] * fh, (i + 1) * fw, (info['row'] + 1) * fh))
            px = f.get_flattened_data() if hasattr(f, 'get_flattened_data') else f.getdata(); tot = 0
            for r, gg, b, a in px:
                if a: tot += a * (0.3 * r + 0.59 * gg + 0.11 * b)
            vals.append(tot / (255 * 255 * fw * fh) * 1000)
        rows[an] = (vals, info)
    peak = max(max(v) for v, _ in rows.values()) or 1
    for an, (vals, info) in rows.items():
        steps = [abs(vals[i + 1] - vals[i]) / peak for i in range(len(vals) - 1)]
        if info.get('loop'): steps.append(abs(vals[0] - vals[-1]) / peak)
        print(f'{name:16s} {an:7s} max step {max(steps) * 100:5.1f}%  ' + ' '.join(f'{v:6.1f}' for v in vals))
