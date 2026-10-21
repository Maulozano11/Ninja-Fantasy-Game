from fr import *
fs,(ax,ay)=frames('wall_depth','rise')
out=[]
for idx in [11]:
    f=fs[idx][140:266, 0:132]
    b=Image.new('RGBA',(f.shape[1],f.shape[0]),(36,36,48,255)); b.alpha_composite(Image.fromarray(f))
    b=b.convert('RGB').resize((f.shape[1]*6,f.shape[0]*6),Image.NEAREST)
    d=ImageDraw.Draw(b)
    # rubble boundary lines
    y=244-140; d.line([(0,y*6),(132*6,y*6)],fill=(255,0,0))
    d.line([(95*6,(183-140)*6),(95*6,(266-140)*6)],fill=(255,0,0))
    d.line([(95*6,(183-140)*6),(132*6,(183-140)*6)],fill=(255,0,0))
    for x in range(0,132,10): d.text((x*6+1,1),str(x),fill=(255,255,0))
    for yy in range(140,266,10): d.text((1,(yy-140)*6),str(yy),fill=(255,255,0))
    b.save(OUT+'/wd11.png')
