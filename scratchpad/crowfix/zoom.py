import sys, json
from PIL import Image
d = sys.argv[1]; key, fr = sys.argv[2], sys.argv[3]
x0, y0, x1, y1 = map(int, sys.argv[4].split(','))
K = int(sys.argv[5]) if len(sys.argv) > 5 else 8
his = Image.open(f'{d}/crows-his-{key}.png').convert('RGBA')
ours = Image.open(f'{d}/f-{fr}-dark.png').convert('RGBA')
ours = ours.resize((ours.width // 4, ours.height // 4), Image.NEAREST)
bgc = Image.new('RGBA', his.size, (31, 31, 41, 255)); bgc.alpha_composite(his); his = bgc
a = his.crop((x0, y0, x1, y1)).resize(((x1 - x0) * K, (y1 - y0) * K), Image.NEAREST)
b = ours.crop((x0, y0, x1, y1)).resize(((x1 - x0) * K, (y1 - y0) * K), Image.NEAREST)
o = Image.new('RGB', (a.width * 2 + 8, a.height)); o.paste(a, (0, 0)); o.paste(b, (a.width + 8, 0)); o.save(sys.argv[6] if len(sys.argv) > 6 else 'dbg/zoom.png')
