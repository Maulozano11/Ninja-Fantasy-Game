exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pv3work/dbg.py').read())
nm='blast'
cfg=SPRITES[nm]
cls=classify_his(nm, cfg)
X0,Y0,X1,Y1=495,240,582,345
sub=lambda m: m[Y0:Y1,X0:X1]
a=sub(cls['a']); body=sub(cls['body']); ol=sub(cls['outline']); rem=sub(cls['removed'])
lz=sub(poly_mask(H0,W0,cfg['light']))
img=np.zeros(a.shape+(3,))
img[...,1]=a*255
img[body]=[120,120,120]
img[ol]=[220,0,0]
img[...,2]+=rem*110
img[...,0]+=lz*50
k=6
im1=Image.fromarray(np.clip(img,0,255).astype(np.uint8)).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
im2=Image.fromarray(IM0[Y0:Y1,X0:X1].astype(np.uint8)).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
c=Image.new('RGB',(im1.width*2+8,im1.height)); c.paste(im2,(0,0)); c.paste(im1,(im1.width+8,0)); c.save(S+'pv3work/dbg-blast2.png')
