import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
def isviolet(p):
    r,g,b,a=[int(v) for v in p]
    return a>=128 and r>g+8 and b>g+8
for i in [7,8,9,10]:
    f=fs[i]
    tops=[]
    for x in range(58,100):
        t=None
        for y in range(88,115):
            if isviolet(f[y,x]): t=y;break
        tops.append(t)
    print(i,' '.join('%s'%(t if t is not None else '-') for t in tops))
# print colours of the line above in frame 9
f=fs[9]
for y in range(96,104):
    print(y, ' '.join('%02x%02x%02x'%tuple(f[y,x,:3]) if f[y,x,3]>0 else '......' for x in range(64,92,2)))
