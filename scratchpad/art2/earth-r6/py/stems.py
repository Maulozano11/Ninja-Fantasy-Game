from fr import *
import sys
for g in [A+'/earth-r6/before/vfx_earth_v3', sys.argv[1]]:
    for nm,an in [('hit','hit'),('multi_hit','hit'),('blast','blast')]:
        fs,_=frames(nm,an,g)
        out=[]
        for f in fs:
            a=f[:,:,3]; op=a==255
            p=np.pad(op,1)
            l=p[1:-1,:-2]; r=p[1:-1,2:]; u=p[:-2,1:-1]; d=p[2:,1:-1]
            stem=op&(((~l)&(~r)&(u|d))|((~u)&(~d)&(l|r)))
            out.append(int(stem.sum()))
        print(g.split('/')[-2][:6],nm,'1px stem px:',out)
