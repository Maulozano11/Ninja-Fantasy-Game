import sys; sys.path.insert(0,'py')
from common import *
def grid(n,an,cols,s,bg=BG,name=None,crop=None):
    fs=frames(n,an)
    if crop: fs=[f.crop(crop) for f in fs]
    w,h=fs[0].size
    rows=(len(fs)+cols-1)//cols
    im=Image.new('RGB',(cols*(w*s+6),rows*(h*s+14)),(70,70,70)); d=ImageDraw.Draw(im)
    ax,ay=MAN[n]['anchor']
    for i,f in enumerate(fs):
        x=(i%cols)*(w*s+6); y=(i//cols)*(h*s+14)
        im.paste(up(on(bg,f),s),(x,y+14)); d.text((x+2,y+2),'%s %s f%d'%(n,an,i),fill=(255,255,0))
        if not crop: d.rectangle([x+ax*s-1,y+14+ay*s-1,x+ax*s+1,y+14+ay*s+1],fill=(255,255,0))
    im.save(name or 'g_%s_%s.png'%(n,an))
if __name__=='__main__':
    a=sys.argv
    grid(a[1],a[2],int(a[3]),int(a[4]))
