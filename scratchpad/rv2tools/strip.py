import sys, json
from PIL import Image
S=sys.argv[1]; R=sys.argv[2]; name=sys.argv[3]; anim=sys.argv[4]; sc=int(sys.argv[5]); frames=[int(v) for v in sys.argv[6].split(',')]; cols=int(sys.argv[7]); bg=tuple(int(v) for v in sys.argv[8].split(',')) if len(sys.argv)>8 else (32,32,42)
tag=sys.argv[9] if len(sys.argv)>9 else ''
man=json.load(open(S+'/staging/vfx_genjutsu_v3/manifest.json'))['sprites']
m=man[name]; im=Image.open(S+'/staging/vfx_genjutsu_v3/'+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']
row=m['anims'][anim]['row']
rows=(len(frames)+cols-1)//cols
can=Image.new('RGB',(cols*(fw+2),rows*(fh+2)),(255,0,255))
for j,i in enumerate(frames):
    f=im.crop((i*fw,row*fh,(i+1)*fw,(row+1)*fh))
    c=Image.new('RGBA',(fw,fh),bg+(255,)); c.alpha_composite(f)
    can.paste(c.convert('RGB'),((j%cols)*(fw+2),(j//cols)*(fh+2)))
can=can.resize((can.width*sc,can.height*sc),Image.NEAREST)
can.save(R+'/s_%s_%s%s.png'%(name,anim,tag))
print(can.size)
