import sys, os, json
import numpy as np
from PIL import Image
REF='/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg'
ST='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons'
OUT='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r2'
im=Image.open(REF).convert('RGB')
IDS=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
# my own art-window crop: x 33..234 (201), y from probe
lefts=[33,285,537,789]
BG=(20,22,28)
def crop(i):
    x=lefts[i]
    return im.crop((x,276,x+201,482))
for i,jid in enumerate(IDS):
    his=crop(i)
    o44=Image.open(f'{ST}/{jid}.png').convert('RGBA')
    o88=Image.open(f'{ST}/{jid}@2x.png').convert('RGBA')
    print(jid,o44.size,o88.size,o44.mode)
    # Sheet A: his at 352 (box) | ours 88 at x4 | ours 44 at x8
    W=352
    sheet=Image.new('RGB',(W*3+40,W+20),BG)
    sheet.paste(his.resize((W,W),Image.LANCZOS),(10,10))
    def flat(o):
        b=Image.new('RGB',o.size,BG); b.paste(o,(0,0),o); return b
    sheet.paste(flat(o88).resize((W,W),Image.NEAREST),(W+20,10))
    sheet.paste(flat(o44).resize((W,W),Image.NEAREST),(2*W+30,10))
    sheet.save(f'{OUT}/{jid}-his352-our88x4-our44x8.png')
    # his box reduction to 44 / 88 for comparison
    h44=his.resize((44,44),Image.BOX); h88=his.resize((88,88),Image.BOX)
    s2=Image.new('RGB',(44*8*2+30,44*8+20),BG)
    s2.paste(h44.resize((352,352),Image.NEAREST),(10,10))
    s2.paste(flat(o44).resize((352,352),Image.NEAREST),(372,10))
    s2.save(f'{OUT}/{jid}-hisbox44-vs-our44-x8.png')
