import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
G = os.environ.get('G', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_chakra_v3')
M = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
_cache = {}
def sheet(name):
    if name not in _cache:
        _cache[name] = np.array(Image.open(os.path.join(G, M[name]['file'])).convert('RGBA')).astype(np.float64)
    return _cache[name]
def frames(name, anim):
    s = M[name]; a = s['anims'][anim]; W, H = s['frameW'], s['frameH']
    sh = sheet(name)
    return [sh[a['row']*H:(a['row']+1)*H, i*W:(i+1)*W] for i in range(a['frames'])]
def light(f):
    return float((f[..., 3]/255 * f[..., :3].mean(-1)).mean())
def over(dst, src):
    a = src[..., 3:4]/255; da = dst[..., 3:4]/255
    oa = a + da*(1-a)
    rgb = np.where(oa > 0, (src[..., :3]*a + dst[..., :3]*da*(1-a))/np.maximum(oa, 1e-9), 0)
    return np.concatenate([rgb, oa*255], -1)
def on_bg(f, bg=(28, 36, 48)):
    b = np.zeros_like(f); b[..., :3] = bg; b[..., 3] = 255
    return over(b, f)
def to_img(f, scale=1):
    im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), 'RGBA')
    if scale != 1: im = im.resize((im.width*scale, im.height*scale), Image.NEAREST)
    return im
def strip(fs, scale=2, bg=(28, 36, 48), labels=None, gap=4):
    ims = [to_img(on_bg(f, bg), scale) for f in fs]
    W = sum(i.width for i in ims) + gap*(len(ims)-1); H = max(i.height for i in ims) + 14
    out = Image.new('RGBA', (W, H), (60, 60, 70, 255)); d = ImageDraw.Draw(out); x = 0
    for k, im in enumerate(ims):
        out.paste(im, (x, 14)); d.text((x+2, 1), str(labels[k] if labels else k), fill=(255, 255, 0, 255)); x += im.width + gap
    return out
def changed(a, b, thr=24):
    d = np.abs(a - b).max(-1)
    return int((d > thr).sum())
