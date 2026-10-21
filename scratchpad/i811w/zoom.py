"""zoom.py <id> <N> <x0> <y0> <x1> <y1> [scale] [out]
Side by side: his box reduction at N, his native pixels at 88 (one-to-one sheets) or none, before, after.
Grid every pixel (faint) and every 5 (strong), with coordinates printed along the top/left."""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw

S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/i811w'
SHEET = {'ryusei_swap': 8, 'northstar_command': 8, 'northstar_submission': 8, 'mirai_evasion': 9, 'koton_block': 9, 'koton_wall': 9, 'ryusei_warp': 9,
         'dragon_fire_bomb': 10, 'wood_dragon_jutsu': 10, 'adamantine_sealing_chains': 10, 'taki_sixtyfour_palms': 10,
         'shadow_clone': 11, 'dragon_fire_stream': 11, 'water_dragon_suiryuudan': 11}


def his(id, N):
    s = SHEET[id]
    im = Image.open(f'{S}/stage/s{s}/ref/{id}@sheet.png').convert('RGB')
    return im.resize((N, N), Image.BOX)


def ours(id, N, which):
    f = f'{id}.png' if N == 44 else f'{id}@2x.png'
    p = f'{S}/before/{f}' if which == 'before' else f'{S}/stage/s{SHEET[id]}/{f}'
    return Image.open(p).convert('RGB')


def main():
    id, N, x0, y0, x1, y1 = sys.argv[1], int(sys.argv[2]), *map(int, sys.argv[3:7])
    k = int(sys.argv[7]) if len(sys.argv) > 7 else 12
    out = sys.argv[8] if len(sys.argv) > 8 else f'{S}/z.png'
    ims = [('his box', his(id, N)), ('before', ours(id, N, 'before')), ('after', ours(id, N, 'after'))]
    w, h = x1 - x0, y1 - y0
    pad = 30
    W = len(ims) * (w * k + pad) + pad
    H = h * k + 2 * pad
    o = Image.new('RGB', (W, H), (20, 22, 28))
    d = ImageDraw.Draw(o)
    for n, (name, im) in enumerate(ims):
        ox = pad + n * (w * k + pad)
        crop = im.crop((x0, y0, x1, y1)).resize((w * k, h * k), Image.NEAREST)
        o.paste(crop, (ox, pad))
        for i in range(w + 1):
            c = (255, 255, 255) if (x0 + i) % 5 == 0 else (60, 60, 60)
            if (x0 + i) % 5 == 0 or k >= 10:
                d.line([(ox + i * k, pad), (ox + i * k, pad + h * k)], fill=c if (x0 + i) % 5 == 0 else (0, 0, 0), width=1)
            if (x0 + i) % 5 == 0 and i < w:
                d.text((ox + i * k + 1, pad - 12), str(x0 + i), fill=(255, 255, 0))
        for j in range(h + 1):
            if (y0 + j) % 5 == 0 or k >= 10:
                d.line([(ox, pad + j * k), (ox + w * k, pad + j * k)], fill=(255, 255, 255) if (y0 + j) % 5 == 0 else (0, 0, 0), width=1)
            if (y0 + j) % 5 == 0 and j < h:
                d.text((ox - 22 if n == 0 else ox + 2, pad + j * k + 1), str(y0 + j), fill=(255, 255, 0))
        d.text((ox, H - pad + 8), name, fill=(220, 220, 220))
    o.save(out)
    print(out)


if __name__ == '__main__':
    main()
