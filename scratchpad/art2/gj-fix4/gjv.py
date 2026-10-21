"""Viewing helpers for the genjutsu fix pass 4."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
A = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
V = A + 'gj-fix4/v/'
REF = Image.open(A + 'REF-genjutsu-set-owner.jpg').convert('RGB')
STAGE = os.environ.get('GJSTAGE', A + 'staging/vfx_genjutsu_v3/')
def man():
    return json.load(open(STAGE + 'manifest.json'))['sprites']
def frame(name, anim=None, i=0, stage=None):
    st = stage or STAGE
    s = json.load(open(st + 'manifest.json'))['sprites'][name]
    im = Image.open(st + s['file']).convert('RGBA')
    if anim is None: anim = list(s['anims'])[0]
    a = s['anims'][anim]; W, H = s['frameW'], s['frameH']
    return im.crop((i * W, a['row'] * H, (i + 1) * W, (a['row'] + 1) * H))
def onbg(fr, col):
    bg = Image.new('RGBA', fr.size, tuple(col) + (255,)); bg.alpha_composite(fr); return bg.convert('RGB')
GRASS = (76, 110, 58); DARK = (32, 32, 42)
def his(x0, y0, x1, y1, S=4):
    return REF.crop((x0, y0, x1, y1)).resize(((x1 - x0) * S, (y1 - y0) * S), Image.NEAREST)
def up(im, S):
    return im.resize((im.width * S, im.height * S), Image.NEAREST)
def row(ims, gap=6, bg=(255, 0, 255)):
    W = sum(i.width for i in ims) + gap * (len(ims) - 1); H = max(i.height for i in ims)
    out = Image.new('RGB', (W, H), bg); x = 0
    for i in ims: out.paste(i, (x, 0)); x += i.width + gap
    return out
def col(ims, gap=6, bg=(255, 0, 255)):
    H = sum(i.height for i in ims) + gap * (len(ims) - 1); W = max(i.width for i in ims)
    out = Image.new('RGB', (W, H), bg); y = 0
    for i in ims: out.paste(i, (0, y)); y += i.height + gap
    return out
