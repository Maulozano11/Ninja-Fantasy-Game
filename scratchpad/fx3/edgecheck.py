import sys, json, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
root, groups = sys.argv[1], sys.argv[2:]
bad = total = 0
for g in groups:
    m = json.load(open(os.path.join(root, g, 'manifest.json')))
    for name, s in m['sprites'].items():
        a = Image.open(os.path.join(root, g, s['file'])).convert('RGBA').getchannel('A').load()
        fw, fh = s['frameW'], s['frameH']
        for an, info in s['anims'].items():
            for i in range(info['frames']):
                total += 1; x0, y0 = i * fw, info['row'] * fh; sides = []
                if any(a[x0 + x, y0] for x in range(fw)): sides.append('top')
                if any(a[x0 + x, y0 + fh - 1] for x in range(fw)): sides.append('bottom')
                if any(a[x0, y0 + y] for y in range(fh)): sides.append('left')
                ys = [y for y in range(fh) if a[x0 + fw - 1, y0 + y]]
                if ys: sides.append(f'right(y {ys[0]}-{ys[-1]})')
                if sides: bad += 1; print(f'{g}/{name} {an}#{i}: {",".join(sides)}')
print(f'-- {total} frames checked, {bad} touch the border')
