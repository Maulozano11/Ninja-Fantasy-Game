import sys
from PIL import Image
REF=sys.argv[1]; ICONS=sys.argv[2]; OUT=sys.argv[3]
ref=Image.open(REF).convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
xs=[33,285,537,789]
Z=6
for i,iid in enumerate(ids):
    crop=ref.crop((xs[i]+1,277,xs[i]+200,481))  # trim seam
    a=crop.resize((88*Z,88*Z),Image.LANCZOS)
    o=Image.open(f'{ICONS}/{iid}@2x.png').convert('RGB').resize((88*Z,88*Z),Image.NEAREST)
    s=Image.new('RGB',(88*Z*2+12,88*Z),(15,17,22))
    s.paste(a,(0,0)); s.paste(o,(88*Z+12,0))
    s.save(f'{OUT}/{iid}-his-vs-our88-x6.png')
