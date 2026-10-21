import sys,os
from fr import *
from morph import *
def pin(f,hi=180,lo=120,r=2):
    a=f[:,:,3]; S=a>=hi; C=close(S,r); return C&(a<lo)&~S
names=sys.argv[1].split(',')
for n in names:
    m=json.load(open(group()+'/manifest.json'))['sprites'][n]
    for an in m['anims']:
        fs,_=frames(n,an)
        print(n,an,'pin<120 in solid:',[int(pin(f).sum()) for f in fs])
