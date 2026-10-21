import sys
from PIL import Image
id=sys.argv[1]; out=sys.argv[2]
b=Image.open('../art2/staging/ui_icons/ref/%s.png'%id).convert('RGB').crop((1,1,200,205))
his=b.resize((88,88),Image.LANCZOS)
ours=Image.open('dbg/%s-88.png'%id).convert('RGB')
o=Image.new('RGB',(88*4*2+16+100,88*4),(16,16,20))
o.paste(his.resize((352,352),Image.NEAREST),(0,0)); o.paste(ours.resize((352,352),Image.NEAREST),(360,0))
o.paste(his,(720,0)); o.paste(ours,(720,100))
o.save(out)
