from common import *
def outside(empty):
    o=np.zeros_like(empty); o[0]=empty[0]; o[-1]=empty[-1]; o[:,0]=empty[:,0]; o[:,-1]=empty[:,-1]
    while True:
        d=o.copy()
        d[1:]|=o[:-1]; d[:-1]|=o[1:]; d[:,1:]|=o[:,:-1]; d[:,:-1]|=o[:,1:]
        d&=empty
        if (d==o).all(): return o
        o=d
def enclosed(f):
    a=np.asarray(f)[...,3]; e=a==0
    return e & ~outside(e)
if __name__=='__main__':
    for n,sp in MAN['sprites'].items():
        if n=='beast': continue
        for an in sp['anims']:
            fr=frames(n,an)
            print(n,an,[int(enclosed(f).sum()) for f in fr])
