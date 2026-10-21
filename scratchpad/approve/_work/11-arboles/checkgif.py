import sys, numpy as np
from PIL import Image, ImageSequence
path=sys.argv[1]; out=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
im=Image.open(path)
info=[]; frames=[]
for i,fr in enumerate(ImageSequence.Iterator(im)):
    info.append((fr.info.get('duration'), getattr(fr,'disposal_method',None)))
    frames.append(fr.convert('RGB').copy())
print(path, im.size, 'frames',len(frames), 'loop',im.info.get('loop'), 'durations',[d for d,_ in info], 'disposal',set(x for _,x in info))
# contact strip at half size (nearest, integer) so 2x art shows at 1x
w,h=frames[0].size; s=2
th=[f.resize((w//s,h//s),Image.NEAREST) for f in frames]
rows=(len(th)+cols-1)//cols
sheet=Image.new('RGB',(cols*(w//s+6),rows*(h//s+6)),(255,0,255))
for i,t in enumerate(th): sheet.paste(t,((i%cols)*(w//s+6),(i//cols)*(h//s+6)))
sheet.save(out)
# frame-to-frame changed pixels
a=[np.array(f).astype(int) for f in frames]
print('changed px', [int((np.abs(a[i]-a[(i+1)%len(a)]).sum(-1)>0).sum()) for i in range(len(a))])
