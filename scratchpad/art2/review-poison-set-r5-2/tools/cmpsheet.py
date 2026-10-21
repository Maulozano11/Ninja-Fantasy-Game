from lib import *
from align import his_crop, KEYS, refmap, PC
import json,sys
al=json.load(open(R+'/align.json'))
def sheet(name, k, f=None, extra=None):
    an,fi=KEYS.get(name,(None,None))
    if f is None: f=frames(name,an)[fi]
    a=al[name]; bx=refmap[name]['box']; h,w=f.shape[:2]
    hc=his_crop(bx[0]+a['dx'],bx[1]+a['dy'],w,h,a['sx'],a['sy']).clip(0,255).astype(np.uint8)
    ours=comp(f,PC); g=grass(h,w); og=comp(f,g)
    diff=np.abs(hc.astype(int)-ours.astype(int)).mean(-1)
    dm=np.stack([diff*3]*3,-1).clip(0,255).astype(np.uint8)
    gap=np.full((h,4,3),255,np.uint8)
    row=np.concatenate([hc,gap,ours,gap,og,gap,dm],1)
    Image.fromarray(up(row,k)).save(R+f'/cmp-{name}.png')
if __name__=='__main__':
    for n in sys.argv[2:]: sheet(n,int(sys.argv[1]))
