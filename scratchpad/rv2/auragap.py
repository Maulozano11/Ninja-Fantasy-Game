from PIL import Image, ImageDraw; import numpy as np
exec(open('cmp.py').read().split('stats={}')[0])
m=M['aura']; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']; hx,hy=1072,1175; s=2.41
FIG=[(1040, 962), (1055, 944), (1075, 942), (1095, 952), (1100, 975), (1100, 1000), (1110, 1004), (1112, 1040),
               (1116, 1060), (1120, 1082), (1112, 1090), (1106, 1100), (1104, 1120), (1103, 1140), (1112, 1152), (1112, 1162),
               (1095, 1165), (1083, 1170), (1060, 1172), (1058, 1180), (1033, 1180), (1036, 1160), (1035, 1135), (1030, 1110),
               (1020, 1100), (1000, 1092), (1000, 1078), (1010, 1070), (1013, 1045), (1012, 1006), (1030, 1000), (1040, 990)]
poly=[((x-hx)/s+ax,(y-hy)/s+ay) for x,y in FIG]
mk=Image.new('L',(W,H),0); ImageDraw.Draw(mk).polygon(poly,fill=255); mk=np.asarray(mk)>0
ch=Image.open(S+'/earth-v3-work/character.png').convert('RGBA')
for fi in (0,):
    back=frame('aura_back','idle',fi); front=frame('aura','idle',fi)
    comp=Image.new('RGBA',(W,H),(0,0,0,0)); comp.alpha_composite(back); comp.alpha_composite(ch,(ax-64,ay-120)); comp.alpha_composite(front)
    a=np.asarray(comp)[...,3]
    gap=mk&(a==0); print('figure-polygon px',mk.sum(),'uncovered by our char+aura',gap.sum())
    o=np.asarray(on(comp,(205,205,200))).copy(); o[gap]=(255,0,255)
    Image.fromarray(o).resize((W*4,H*4),Image.NEAREST).save(OUT+'/aura-gap.png')
