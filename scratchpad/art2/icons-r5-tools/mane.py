import sys; sys.path.insert(0, sys.argv[1])
from kx import *
from PIL import Image, ImageFilter
w = sys.argv[2]
src = Image.open(w+'/out/ref/kirin_thunder.png').convert('RGB')
src = src.crop((1,1,src.size[0]-1,src.size[1]-1))
box = np.array(src.resize((44,44), Image.BOX)).astype(float)
lan = np.array(src.resize((44,44), Image.LANCZOS)).astype(float)
outs=[]
A = cleanup(quant(box), box)
C = cleanup(quant(lan), lan)
# strand pull on box: L - gauss
from PIL import Image as I
L = oklab(box)[...,0]
Lb = np.array(I.fromarray((L*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)/255
D = quant(box)
d = L-Lb
D = np.clip(D + (d>0.035) - (d<-0.035), 0, len(PAL)-1)
D = cleanup(D, box)
for name, arr in [('boxraw', box.astype(np.uint8)), ('lanraw', np.clip(lan,0,255).astype(np.uint8)), ('A_box', img(A)), ('C_lan', img(C)), ('D_boxpull', img(D))]:
    outs.append(Image.fromarray(arr).resize((44*8,44*8), Image.NEAREST))
sheet = Image.new('RGB', (len(outs)*(352+8), 352), (16,16,20))
for i,o in enumerate(outs): sheet.paste(o, (i*360,0))
sheet.save(w+'/mane-variants.png')
for nm,q in [('A',A),('C',C),('D',D)]:
    LL = oklab(P[q].astype(float))[...,0]
    print(nm, np.percentile(LL,[10,25,50,75,90]).round(3))
print('his box', np.percentile(oklab(box)[...,0],[10,25,50,75,90]).round(3))
print('his lan', np.percentile(oklab(np.clip(lan,0,255))[...,0],[10,25,50,75,90]).round(3))
