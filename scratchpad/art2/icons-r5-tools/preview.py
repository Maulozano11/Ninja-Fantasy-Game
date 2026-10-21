# preview.py work_dir icon_id [N] : side by side his (lanczos at N) and ours at x Z with grid, plus 1x/x3 bar
import sys
from PIL import Image, ImageDraw
w, iid = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 44
Z = 16 if N == 44 else 8
his = Image.open(f'{w}/out/ref/{iid}.png').convert('RGB')
his = his.crop((1, 1, his.size[0]-1, his.size[1]-1)).resize((N, N), Image.LANCZOS)
ours = Image.open(f'{w}/out/{iid}.png' if N == 44 else f'{w}/out/{iid}@2x.png').convert('RGB')
def grid(im):
    big = im.resize((N*Z, N*Z), Image.NEAREST)
    d = ImageDraw.Draw(big)
    for g in range(0, N+1):
        c = (255, 60, 60) if g % 5 == 0 else (0, 0, 0)
        if g % 5 == 0 or N == 44:
            d.line([(g*Z, 0), (g*Z, N*Z)], fill=c); d.line([(0, g*Z), (N*Z, g*Z)], fill=c)
        if g % 5 == 0 and g < N:
            d.text((g*Z+2, 1), str(g), fill=(255, 255, 0)); d.text((1, g*Z+2), str(g), fill=(255, 255, 0))
    return big
a, b = grid(his), grid(ours)
bar = Image.new('RGB', (N*3*2 + 40, N*3 + 20), (17, 18, 24))
bar.paste(his.resize((N*3, N*3), Image.NEAREST), (10, 10)); bar.paste(ours.resize((N*3, N*3), Image.NEAREST), (N*3 + 30, 10))
one = Image.new('RGB', (N*2 + 30, N + 20), (17, 18, 24)); one.paste(his, (10, 10)); one.paste(ours, (N + 20, 10))
sheet = Image.new('RGB', (N*Z*2 + 30, N*Z + bar.size[1] + 20), (17, 18, 24))
sheet.paste(a, (0, 0)); sheet.paste(b, (N*Z + 30, 0)); sheet.paste(bar, (0, N*Z + 10)); sheet.paste(one, (bar.size[0] + 20, N*Z + 10))
sheet.save(f'{w}/pv-{iid}-{N}.png')
# plain views: his and ours at x6, and at 1x/2x on the bar
Zp = 6 if N == 44 else 3
pl = Image.new('RGB', (N*Zp*2 + 30 + N*2 + 20 + N + 20, N*Zp + 20), (17, 18, 24))
pl.paste(his.resize((N*Zp, N*Zp), Image.NEAREST), (10, 10)); pl.paste(ours.resize((N*Zp, N*Zp), Image.NEAREST), (N*Zp + 20, 10))
pl.paste(ours.resize((N*2, N*2), Image.NEAREST), (2*N*Zp + 30, 10)); pl.paste(ours, (2*N*Zp + 30 + N*2 + 10, 10)); pl.paste(his, (2*N*Zp + 30 + N*2 + 10, 10 + N + 10))
pl.save(f'{w}/pv-{iid}-{N}-plain.png')
