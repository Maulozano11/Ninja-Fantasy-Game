from pair import *
ch=Image.open(S+'/art2/review-chakra-set-r1/rv-character.png').convert('RGBA')
bb=ch.getbbox(); chc=ch.crop(bb)
def comp(i,bgc=(30,29,37),withch=True):
    fb=frames('aura_back','idle')[i]; ff=frames('aura','idle')[i]
    c=Image.new('RGBA',(90,132),bgc+(255,)); c.alpha_composite(fb)
    if withch:
        x=45-chc.width//2; y=115-chc.height+1
        c.alpha_composite(chc,(x,y))
    c.alpha_composite(ff)
    return c.convert('RGB')
if __name__=='__main__':
    b=AL['aura-idle-0']; X,Y=b[3],b[4]
    his=REF.crop((X,Y,X+90,Y+132))
    outs=[up(his,4)]+[up(comp(i,bg),4) for bg in [(30,29,37),(70,110,50)] for i in [0,6]]
    row(outs,gap=6).save(R+'/P-aura-char.png')
