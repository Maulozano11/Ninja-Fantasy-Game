"""Shared helpers: his reductions (PIL BOX of his crop window) and ours, OKLab, region dumps."""
import numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed'
SHEET = {'ryusei_swap':'8','northstar_command':'8','northstar_submission':'8','mirai_evasion':'9','koton_block':'9','koton_wall':'9','ryusei_warp':'9','dragon_fire_bomb':'10','wood_dragon_jutsu':'10','adamantine_sealing_chains':'10','taki_sixtyfour_palms':'10','shadow_clone':'11','dragon_fire_stream':'11','water_dragon_suiryuudan':'11'}


def his_win(jid):
    return Image.open(f'{SP}/stage/ui_icons_{SHEET[jid]}/ref/{jid}.png').convert('RGB')


def his(jid, n):
    return np.asarray(his_win(jid).resize((n, n), Image.BOX)).astype(float)


def ours(jid, n, d):
    f = f'{d}/{jid}.png' if n == 44 else f'{d}/{jid}@2x.png'
    return np.asarray(Image.open(f).convert('RGB')).astype(float)


def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def oklab(rgb):
    rgb = np.asarray(rgb, float)
    R_, G, B = [lin(rgb[..., i]) for i in range(3)]
    l = np.cbrt(0.4122214708*R_ + 0.5363325363*G + 0.0514459929*B)
    m = np.cbrt(0.2119034982*R_ + 0.6806995451*G + 0.1073969566*B)
    s = np.cbrt(0.0883024619*R_ + 0.2817188376*G + 0.6299787005*B)
    return np.stack([0.2104542553*l + 0.793617785*m - 0.0040720468*s, 1.9779984951*l - 2.428592205*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.808675766*s], -1)


def lch(rgb):
    o = oklab(rgb)
    return o[..., 0], np.hypot(o[..., 1], o[..., 2]), (np.degrees(np.arctan2(o[..., 2], o[..., 1])) + 360) % 360


def hx(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], float)


def hexc(c):
    return '%02x%02x%02x' % tuple(int(round(v)) for v in c)


def dump(a, x0, y0, x1, y1, title=''):
    print(title)
    print('     ' + ' '.join('%6d' % x for x in range(x0, x1)))
    for y in range(y0, y1):
        print('%3d  ' % y + ' '.join(hexc(a[y, x]) for x in range(x0, x1)))
