import sys; sys.path.insert(0,'.')
from load import *
from morph import *
def pin(f,hi=180,lo=120,r=2):
    a=f[:,:,3]
    S=a>=hi
    C=close(S,r)
    return C&(a<lo)&~S
def enclosed(f,th=1):
    a=f[:,:,3]>=th
    filled=~outside(~a)
    return filled&~a
if __name__=='__main__':
    m=man()['sprites']
    for n in m:
        if n=='beast': continue
        for an,fr in frames(n).items():
            p=[int(pin(f).sum()) for f in fr]
            e=[int(enclosed(f).sum()) for f in fr]
            print(f"{n:12s} {an:6s} pin<120 in solid: {p}\n{'':19s} enclosed clear: {e}")
