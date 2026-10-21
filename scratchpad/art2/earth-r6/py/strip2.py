from fr import *
import sys
# strip2.py name anim frames zoom crop out [bg r,g,b] [group2 for compare row]
n,a=sys.argv[1],sys.argv[2]; fi=[int(v) for v in sys.argv[3].split(',')]; z=int(sys.argv[4])
crop=[int(v) for v in sys.argv[5].split(',')]; out=sys.argv[6]
bg=tuple(int(v) for v in sys.argv[7].split(',')) if len(sys.argv)>7 else (36,36,48)
groups=sys.argv[8].split(':') if len(sys.argv)>8 else [None]
rows=[]
for g in groups:
    fs,_=frames(n,a,g or None)
    tiles=[]
    for i in fi:
        x0,y0,x1,y1=crop; f=fs[i][y0:y1,x0:x1]
        b=Image.new('RGBA',(f.shape[1],f.shape[0]),bg+(255,)); b.alpha_composite(Image.fromarray(f)); tiles.append(b.convert('RGB'))
    rows.append(tiles)
w,h=rows[0][0].size
o=Image.new('RGB',((w+1)*len(fi),(h+1)*len(rows)),(255,0,255))
for r,tiles in enumerate(rows):
    for k,t in enumerate(tiles): o.paste(t,(k*(w+1),r*(h+1)))
o=o.resize((o.width*z,o.height*z),Image.NEAREST)
d=ImageDraw.Draw(o)
for k,i in enumerate(fi): d.text((k*(w+1)*z+2,2),str(i),fill=(255,255,0))
o.save(out); print(out)
