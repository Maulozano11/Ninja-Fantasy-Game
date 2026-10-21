"""The drake's dust before and after it was closed: beforeafter.py before.png after.png out.png
Top: frames 3-7 at 3x, before | after. Bottom: the left side at 5x, frames 3-6, before (upper row) and after."""
import sys
from PIL import Image, ImageDraw, ImageFont
before, after, out = sys.argv[1:4]
FW, K = 284, 3
X0, Y0, X1, Y1 = 0, 98, 192, 167  # the dust region (frame coordinates)
LX0, LY0, LX1, LY1, LK = 8, 100, 72, 167, 5  # the left side
PANEL = (34, 34, 44, 255)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
ims = [Image.open(p).convert('RGBA') for p in (before, after)]


def tile(im, f, box, k):
    x0, y0, x1, y1 = box
    crop = im.crop((f * FW + x0, y0, f * FW + x1, y1))
    bg = Image.new('RGBA', crop.size, PANEL)
    bg.alpha_composite(crop)
    return bg.convert('RGB').resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)


cw, ch = (X1 - X0) * K, (Y1 - Y0) * K
lw_, lh_ = (LX1 - LX0) * LK, (LY1 - LY0) * LK
gap, lw, top = 10, 90, 40
W = max(lw + 2 * cw + 3 * gap, lw + 4 * (lw_ + gap) + gap)
top2 = top + 5 * (ch + gap) + 50
H = top2 + 30 + 2 * (lh_ + gap) + 34
sheet = Image.new('RGB', (W, H), (12, 12, 16))
d = ImageDraw.Draw(sheet)
d.text((lw + gap, 8), 'BEFORE (flat bottom, straight left side)', font=bold, fill=(255, 230, 120))
d.text((lw + 2 * gap + cw, 8), 'AFTER (closed: rounded puffs that thin out)', font=bold, fill=(255, 230, 120))
for r, f in enumerate((3, 4, 5, 6, 7)):
    y = top + r * (ch + gap)
    d.text((10, y + ch // 2 - 10), f'frame {f}' + ('\n(his)' if f == 5 else ''), font=font, fill=(220, 220, 220))
    for c, im in enumerate(ims):
        sheet.paste(tile(im, f, (X0, Y0, X1, Y1), K), (lw + gap + c * (cw + gap), y))
d.text((10, top2 - 40), f'3x, frame px x {X0}-{X1 - 1}, y {Y0}-{Y1 - 1} of 284x167 (the feet line / ground is y 163; 3 clear rows below it)', font=font, fill=(160, 160, 170))
d.text((10, top2), f'THE LEFT SIDE, {LK}x (frame px x {LX0}-{LX1 - 1}, y {LY0}-{LY1 - 1}): frames 3, 4 (the burst), 5 (his), 6; upper row before, lower row after', font=bold, fill=(255, 230, 120))
for r, (im, name) in enumerate(zip(ims, ('before', 'after'))):
    y = top2 + 30 + r * (lh_ + gap)
    d.text((10, y + lh_ // 2 - 10), name, font=font, fill=(220, 220, 220))
    for c, f in enumerate((3, 4, 5, 6)):
        sheet.paste(tile(im, f, (LX0, LY0, LX1, LY1), LK), (lw + gap + c * (lw_ + gap), y))
sheet.save(out)
print(sheet.size)
