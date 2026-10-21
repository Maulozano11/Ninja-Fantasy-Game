import sys
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
exec(open('lay_only.py').read())
from PIL import Image, ImageDraw
L = LAY['L']
x0, y0 = PICS['L'][:2]
cr = [c for c in L['crows'] if c['name'] == 'L2'][0]
X0, Y0, X1, Y1 = 440, 838, 492, 878
z = 12
c = L['rgb'][Y0 - y0:Y1 - y0, X0 - x0:X1 - x0].copy()
m = cr['mask'][Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]
c[m] = c[m] * 0.6 + np.array([0, 120, 0]) * 0.4
im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).resize(((X1 - X0) * z, (Y1 - Y0) * z), Image.NEAREST)
d = ImageDraw.Draw(im)
for gx in range(X0, X1, 5):
    d.line([((gx - X0) * z, 0), ((gx - X0) * z, 6 if gx % 10 else 14)], fill=(255, 255, 0))
    if gx % 10 == 0:
        d.text(((gx - X0) * z + 2, 2), str(gx), fill=(255, 255, 0))
for gy in range(Y0, Y1, 5):
    d.line([(0, (gy - Y0) * z), (6 if gy % 10 else 14, (gy - Y0) * z)], fill=(255, 255, 0))
    if gy % 10 == 0:
        d.text((2, (gy - Y0) * z + 2), str(gy), fill=(255, 255, 0))
pts = [((x - X0) * z, (y - Y0) * z) for x, y in cr['cut']]
d.line(pts, fill=(255, 0, 0), width=2)
im.save('l2mask.png')
