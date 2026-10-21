from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
for n in ['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']:
    his=Image.open('his_'+n+'.png')
    for S in (44,88):
        hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
        o=np.asarray(Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')).astype(float)
        res=[]
        for a in (hb,o):
            lab=oklab(a); L=lab[...,0]; C=np.hypot(lab[...,1],lab[...,2])
            q=np.percentile(L,[10,25,50,75,90,99])
            res.append('L pct10..99 '+' '.join('%.2f'%v for v in q)+' C %.3f'%C.mean())
        # blurred diff
        from PIL import ImageFilter
        bh=np.asarray(Image.fromarray(hb.astype(np.uint8)).filter(ImageFilter.GaussianBlur(S/30))).astype(float)
        bo=np.asarray(Image.fromarray(o.astype(np.uint8)).filter(ImageFilter.GaussianBlur(S/30))).astype(float)
        dE=np.linalg.norm(oklab(bh)-oklab(bo),axis=-1).mean()*100
        print(n,S,'\n   his',res[0],'\n   our',res[1],'\n   blurred dE %.2f'%dE)
