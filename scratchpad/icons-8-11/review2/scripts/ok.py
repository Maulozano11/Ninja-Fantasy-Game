import numpy as np, glob
from PIL import Image
R2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
ICONS='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons811-rev2/src/assets/ui_icons'
def lab(rgb):
    a = np.asarray(rgb, dtype=np.float64) / 255.0
    a = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    lms = np.cbrt(a @ M1.T)
    return lms @ M2.T
def lch(rgb):
    L = lab(rgb); C = np.hypot(L[..., 1], L[..., 2]); H = (np.degrees(np.arctan2(L[..., 2], L[..., 1])) + 360) % 360
    return L[..., 0], C, H
def hisw(jid):
    return Image.open(glob.glob(f'{R2}/stage/s*/ref/{jid}.png')[0]).convert('RGB')
def his(jid, N):
    return np.asarray(hisw(jid).resize((N, N), Image.BOX))
def our(jid, N):
    return np.asarray(Image.open(f'{ICONS}/{jid}{"@2x" if N == 88 else ""}.png').convert('RGB'))
def hx(c): return '#%02x%02x%02x' % tuple(int(v) for v in c)
def de(a, b):
    return float(np.linalg.norm(lab(np.array(a)) - lab(np.array(b))))
def hexrgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) for i in (0, 2, 4)]
