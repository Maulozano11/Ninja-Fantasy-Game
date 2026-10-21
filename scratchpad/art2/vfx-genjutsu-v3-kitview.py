# A "view" of staging/vfx_genjutsu_v3 for tools/refs/kit-sheet.ts, so the kit sheet shows the KEY
# frame (his picture) of every sprite.
#
# kit-sheet.ts draws hit frame 2 and blast frame 3 (the key frames of the old 6- and 8-frame
# anims). With more frames, his picture is hit frame 3 and blast frame 4, so this view drops each
# of those two anims' first frame (and repeats its last, so the frame counts in the labels stay
# true). Every other file is copied unchanged.
#
#   python3 -I vfx-genjutsu-v3-kitview.py <groupDir> <viewDir>
#   npx tsx tools/refs/kit-sheet.ts <viewDir> genjutsu <out.png>

import json, os, shutil, struct, sys, zlib
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
KEY = {'hit': ('hit', 3, 2), 'blast': ('blast', 4, 3)}  # sprite: (anim, his key frame, the frame kit-sheet draws)

def write_kit_png(path, img):
    """8-bit RGBA, every row filter 0 (what kit-sheet.ts reads)."""
    w, h = img.size
    raw = img.convert('RGBA').tobytes()
    rows = b''.join(b'\x00' + raw[y * w * 4:(y + 1) * w * 4] for y in range(h))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)

shutil.rmtree(dst, ignore_errors=True)
os.makedirs(dst)
man = json.load(open(os.path.join(src, 'manifest.json')))
for f in os.listdir(src):
    if f.endswith('.png') or f == 'manifest.json': shutil.copyfile(os.path.join(src, f), os.path.join(dst, f))
for name, (an, key, drawn) in KEY.items():
    s = man['sprites'][name]; a = s['anims'][an]
    fw, fh = s['frameW'], s['frameH']
    sheet = Image.open(os.path.join(src, s['file'])).convert('RGBA')
    shift = key - drawn
    out = sheet.copy()
    for i in range(a['frames']):
        j = min(a['frames'] - 1, i + shift)
        out.paste(sheet.crop((j * fw, a['row'] * fh, (j + 1) * fw, (a['row'] + 1) * fh)), (i * fw, a['row'] * fh))
    write_kit_png(os.path.join(dst, s['file']), out)
print('kit view written to', dst)
