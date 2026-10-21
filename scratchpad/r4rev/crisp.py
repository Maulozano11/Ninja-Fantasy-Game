from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
for n in ['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']:
    his=Image.open('his_'+n+'.png')
    for S in (44,88):
        hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
        hn=np.asarray(his.resize((S,S),Image.NEAREST)).astype(float)
        o=np.asarray(Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')).astype(float)
        r=[]
        for a in (hb,hn,o):
            L=oklab(a)[...,0]
            e=(np.abs(np.diff(L,axis=0)).mean()+np.abs(np.diff(L,axis=1)).mean())/2
            # fraction of strong edges
            st=((np.abs(np.diff(L,axis=1))>0.12).mean()+(np.abs(np.diff(L,axis=0))>0.12).mean())/2
            r.append('%.3f/%.3f'%(e,st))
        print(n,S,'edge mean/strong  hisbox',r[0],' hisnearest',r[1],' ours',r[2])
