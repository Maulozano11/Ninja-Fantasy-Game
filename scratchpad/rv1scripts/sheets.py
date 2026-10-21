import sys, os
from PIL import Image
import numpy as np
REF=sys.argv[1]; ICONS=sys.argv[2]; OUT=sys.argv[3]
ref=Image.open(REF).convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
xs=[33,285,537,789]
# verify x offsets for slot 2..4 by scanning
a=np.asarray(ref).astype(int)
for i,x0 in enumerate(xs):
    seg=a[380, x0-6:x0+3].tolist()
    print(ids[i], 'cols', x0-6, seg)
bg=(15,17,22)
for i,iid in enumerate(ids):
    x0=xs[i]
    crop=ref.crop((x0,276,x0+201,482))
    his88=crop.resize((88,88),Image.LANCZOS)
    his44=crop.resize((44,44),Image.BOX)
    o88=Image.open(f'{ICONS}/{iid}@2x.png').convert('RGBA')
    o44=Image.open(f'{ICONS}/{iid}.png').convert('RGBA')
    print(iid, o88.size, o44.size, o88.mode)
    Z=4
    W=88*Z*2+44*Z*2*2+ 5*16
    sheet=Image.new('RGB',(88*Z*4+16*5, 88*Z+32),bg)
    def paste(im,x):
        b=Image.new('RGBA',im.size,bg+(255,)); b.alpha_composite(im.convert('RGBA'))
        sheet.paste(b.convert('RGB'),(x,16))
    paste(his88.resize((88*Z,88*Z),Image.NEAREST),16)
    paste(o88.resize((88*Z,88*Z),Image.NEAREST),16+88*Z+16)
    paste(his44.resize((88*Z,88*Z),Image.NEAREST),16+2*(88*Z+16))
    paste(o44.resize((88*Z,88*Z),Image.NEAREST),16+3*(88*Z+16))
    sheet.save(f'{OUT}/{iid}-his88-our88-his44-our44-x{Z}.png')
