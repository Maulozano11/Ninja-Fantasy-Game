exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pv3work/dbg.py').read())
import sys
nm=sys.argv_extra if hasattr(sys,'argv_extra') else 'blast'
cfg=SPRITES[nm]
cls=classify_his(nm, cfg)
x0,y0,x1,y1=PANELS[nm]
sub=lambda m: m[y0:y1,x0:x1]
a=sub(cls['a']); body=sub(cls['body']); ol=sub(cls['outline']); rem=sub(cls['removed'])
img=np.zeros(a.shape+(3,))
img[...,1]=a*255
img[body]=[90,90,90]
img[ol]=[200,0,0]
img[rem & ~body]=img[rem & ~body]*0.5+np.array([0,0,120])
k=3
Image.fromarray(img.astype(np.uint8)).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST).save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pv3work/dbg-'+nm+'.png')
