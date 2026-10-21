# kcomp.py <srcdir> <key> <out> [layers...] -- composite extracted layers over the reference navy
import sys, json
from PIL import Image
d, key, out = sys.argv[1:4]
only = sys.argv[4:]
info = json.load(open(f'{d}/{key}.json'))
W, H = info['frame']
bg = Image.new('RGBA', (W, H), (8, 15, 44, 255))
order = [n for n in ['cloud', 'ground', 'sparks', 'bolt', 'dragon', 'kanji'] if n in info['layers'] and (not only or n in only)]
for n in order:
    bg.alpha_composite(Image.open(f'{d}/{key}-{n}.png').convert('RGBA'))
if not only or 'debris' in only:
    for db in info.get('debris', []):
        bg.alpha_composite(Image.open(f"{d}/{db['file']}").convert('RGBA'), (db['x'], db['y']))
bg.save(out)
