import sys, os
import numpy as np
from PIL import Image, ImageFilter
R, ICONS = sys.argv[1], sys.argv[2]
SHEET = {'ryusei_swap':'8','northstar_command':'8','northstar_submission':'8','mirai_evasion':'9','koton_block':'9','koton_wall':'9','ryusei_warp':'9','dragon_fire_bomb':'10','wood_dragon_jutsu':'10','adamantine_sealing_chains':'10','taki_sixtyfour_palms':'10','shadow_clone':'11','dragon_fire_stream':'11','water_dragon_suiryuudan':'11'}
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def oklab(rgb):
    R_, G, B = [lin(rgb[..., i]) for i in range(3)]
    l = np.cbrt(0.4122214708*R_ + 0.5363325363*G + 0.0514459929*B)
    m = np.cbrt(0.2119034982*R_ + 0.6806995451*G + 0.1073969566*B)
    s = np.cbrt(0.0883024619*R_ + 0.2817188376*G + 0.6299787005*B)
    return np.stack([0.2104542553*l + 0.793617785*m - 0.0040720468*s, 1.9779984951*l - 2.428592205*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.808675766*s], -1)
def blur(im, r):
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(float)
os.makedirs(f'{R}/diff', exist_ok=True)
print('%-26s %5s %6s %6s %6s %6s | %6s %6s %6s %6s %5s' % ('icon', 'size', 'dE', 'p95', 'dL', 'dC', 'L_his', 'L_our', 'C_his', 'C_our', 'hot%'))
for jid, s in SHEET.items():
    his = Image.open(f'{R}/stage/s{s}/ref/{jid}.png').convert('RGB')
    for n, f in ((88, f'{jid}@2x.png'), (44, f'{jid}.png')):
        ours = Image.open(f'{ICONS}/{f}').convert('RGB')
        hb = his.resize((n, n), Image.BOX)
        r = n / 30
        a = oklab(blur(hb, r)); b = oklab(blur(ours, r))
        d = np.sqrt(((a - b) ** 2).sum(-1)) * 100
        Ca = np.hypot(a[..., 1], a[..., 2]); Cb = np.hypot(b[..., 1], b[..., 2])
        print('%-26s %5d %6.2f %6.2f %+6.2f %+6.2f | %6.2f %6.2f %6.2f %6.2f %5.1f' % (jid, n, d.mean(), np.percentile(d, 95), (b[..., 0] - a[..., 0]).mean() * 100, (Cb - Ca).mean() * 100, a[..., 0].mean() * 100, b[..., 0].mean() * 100, Ca.mean() * 100, Cb.mean() * 100, (d > 8).mean() * 100))
        # heatmap
        h = np.clip(d / 20, 0, 1)
        hm = Image.fromarray((np.stack([h, h * 0.3, 1 - h], -1) * 255).astype(np.uint8)).resize((n * (8 if n == 44 else 4),) * 2, Image.NEAREST)
        side = Image.new('RGB', (hm.width * 3 + 16, hm.height), (255, 255, 255))
        side.paste(hb.resize(hm.size, Image.NEAREST), (0, 0)); side.paste(ours.resize(hm.size, Image.NEAREST), (hm.width + 8, 0)); side.paste(hm, (2 * hm.width + 16, 0))
        side.save(f'{R}/diff/{jid}-{n}.png')
