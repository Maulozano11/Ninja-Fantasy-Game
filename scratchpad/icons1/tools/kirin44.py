from PIL import Image
pal='161638 1a2453 183270 1a4386 17559e 2169ab 267cbc 8a7f9d 3091c9 3fa5d6 4ebbe2 56d2ed d9c3c0 6fe8f5 a1f5fa d8feff'.split()
L='0123456789abcdef'
base=Image.open('../art2/staging/ui_icons/kirin_thunder.png').convert('RGB')
M=[[L[pal.index('%02x%02x%02x'%base.getpixel((x,y))[:3])] for x in range(44)] for y in range(44)]
def put(pts,c):
    for x,y in pts: M[y][x]=c
# 1 upper gum line
put([(x,20) for x in range(23,31)],'1')
put([(x,21) for x in range(31,39)],'1')
put([(38,20),(39,21)],'1')
# upper teeth
put([(28,21),(30,21),(28,22)],'f')
put([(29,21)],'2')
put([(32,22),(34,22),(36,22),(38,22),(32,23),(36,23)],'f')
put([(33,22),(35,22),(37,22),(31,22)],'2')
# breath under the teeth
put([(33,23),(34,23),(35,23),(37,23),(29,22),(30,22),(31,23)],'d')
# lower jaw: teeth row and gum
teeth=[(24,27),(26,29),(28,31),(30,33)]
gaps=[(25,28),(27,30),(29,32),(31,34)]
gum=[(23,27),(24,28),(25,29),(26,30),(27,31),(28,32),(29,33),(30,34),(22,26)]
put(gum,'1'); put(teeth,'f'); put(gaps,'2')
# eye
put([(35,18),(36,18),(37,19)],'0'); put([(34,17),(35,17),(36,17),(37,18)],'e')
# snout front outline
put([(39,y) for y in range(15,21)],'2')
o=Image.new('RGB',(44,44))
for y in range(44):
    for x in range(44):
        h=pal[L.index(M[y][x])]; o.putpixel((x,y),tuple(int(h[i:i+2],16) for i in (0,2,4)))
o.save('iter/k44-edit.png')
his=Image.open('../art2/staging/ui_icons/ref/kirin_thunder.png').convert('RGB').crop((1,1,200,205)).resize((440,440),Image.LANCZOS)
v=Image.new('RGB',(440*3+40,460),(20,20,26))
v.paste(his,(10,10)); v.paste(base.resize((440,440),Image.NEAREST),(460,10)); v.paste(o.resize((440,440),Image.NEAREST),(910,10))
v.paste(o,(10,10)) if False else None
v.save('iter/k44-view.png')
s=Image.new('RGB',(200,70),(20,20,26)); s.paste(base,(10,10)); s.paste(o,(70,10)); s.paste(o.resize((88,88),Image.NEAREST).resize((44,44)),(130,10)); s.resize((400,140),Image.NEAREST).save('iter/k44-small.png')
