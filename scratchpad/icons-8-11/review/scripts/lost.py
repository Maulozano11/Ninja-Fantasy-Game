import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
R, ICONS = sys.argv[1], sys.argv[2]
thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0.08
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

def label(mask):
    H, W = mask.shape
    lab = np.zeros((H, W), int); n = 0
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n
                while st:
                    cy, cx = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; st.append((ny, nx))
    return lab, n
os.makedirs(f'{R}/lost', exist_ok=True)
for jid, s in SHEET.items():
    his = np.asarray(Image.open(f'{R}/stage/s{s}/ref/{jid}.png').convert('RGB')).astype(float)
    o88 = np.asarray(Image.open(f'{ICONS}/{jid}@2x.png').convert('RGB')).astype(float)
    pal = np.unique(o88.reshape(-1, 3), axis=0)
    hl = oklab(his); pl = oklab(pal)
    d = np.sqrt((((hl[:, :, None, :] - pl[None, None]) * np.array([1.4, 1, 1])) ** 2).sum(-1))
    md = d.min(-1)
    mask = md > thr
    lab, n = label(mask)
    regs = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 3: continue
        c = his[ys, xs].mean(0)
        nearest = pal[d[ys, xs].mean(0).argmin()]
        regs.append((len(ys), xs.min(), ys.min(), xs.max(), ys.max(), '#%02x%02x%02x' % tuple(int(v) for v in c), '#%02x%02x%02x' % tuple(int(v) for v in nearest), md[ys, xs].mean()))
    regs.sort(reverse=True)
    print(jid, 'palette', len(pal), 'pixels far from palette: %.2f%%' % (mask.mean() * 100))
    for r in regs[:8]:
        print('   n=%3d box=(%d,%d)-(%d,%d) his=%s nearest=%s d=%.3f' % r)
    # image: his window with lost pixels highlighted
    vis = his.copy(); vis[mask] = [0, 255, 0]
    Image.fromarray(np.concatenate([his, vis], 1).astype(np.uint8)).resize((his.shape[1] * 8, his.shape[0] * 4), Image.NEAREST).save(f'{R}/lost/{jid}.png')
