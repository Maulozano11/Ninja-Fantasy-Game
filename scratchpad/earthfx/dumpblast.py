import sys; sys.path.insert(0,sys.argv[1])
from refdec import *
R=load(); r=R[sys.argv[2]]
print(r['w'],r['h'],r['anchor'],list(r['pieces'].keys()))
names=list(r['pieces'].keys())
sc=3
tiles=[]
for n in names:
    im=render(r,piece(r,n)); bg=Image.new('RGBA',im.size,(222,214,190,255)); bg.alpha_composite(im)
    tiles.append(bg.resize((im.width*sc,im.height*sc),Image.NEAREST))
cols=3; W=tiles[0].width; H=tiles[0].height
c=Image.new('RGB',(cols*(W+6),((len(tiles)+cols-1)//cols)*(H+6)),(40,40,50))
for i,t in enumerate(tiles): c.paste(t.convert('RGB'),((i%cols)*(W+6),(i//cols)*(H+6)))
c.save(sys.argv[3])
