from PIL import Image
import colorsys
bg=(30,32,45)
for n in 'LR':
    h=Image.open(f'his-{n}-1x.png').convert('RGB'); o=Image.open(f'ours-{n}-1x.png').convert('RGB')
    hp=h.load(); op=o.load()
    W,H=h.size
    def classify(c):
        r,g,b=c
        if abs(r-bg[0])+abs(g-bg[1])+abs(b-bg[2])<25: return 'bg'
        if r>g+15 and b>g+15: return 'mist'
        if r>g+25 and r>b+10: return 'red'
        if g>=r-5 and g>b: return 'green'
        return 'other'
    for name,p in (('his',hp),('ours',op)):
        cls={}
        for y in range(H):
            for x in range(W):
                c=p[x,y]; k=classify(c)
                cls.setdefault(k,[]).append(c)
        s=[]
        for k in ('mist','red','green','other','bg'):
            v=cls.get(k,[])
            if v:
                m=tuple(round(sum(c[i] for c in v)/len(v)) for i in range(3))
                hs=colorsys.rgb_to_hsv(*[x/255 for x in m])
                s.append(f'{k}:{len(v)} mean{m} S{hs[1]:.2f} V{hs[2]:.2f}')
        print(n,name,' | '.join(s))
    # overall diff
    import math
    d=0;cnt=0
    for y in range(H):
        for x in range(W):
            a=hp[x,y];b=op[x,y]
            if classify(a)!='bg' or classify(b)!='bg':
                d+=sum(abs(a[i]-b[i]) for i in range(3))/3;cnt+=1
    print(n,'mean abs diff over non-bg',round(d/cnt,1),cnt)
