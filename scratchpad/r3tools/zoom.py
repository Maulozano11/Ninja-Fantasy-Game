import sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
name=sys.argv[1]; z=int(sys.argv[2]); bg=sys.argv[3] if len(sys.argv)>3 else '3c5a3c'
im=Image.open(S+'/staging/ui_battle/'+name+'.png').convert('RGBA')
b=Image.new('RGBA',im.size,tuple(int(bg[i:i+2],16) for i in (0,2,4))+(255,))
b.alpha_composite(im)
b=b.resize((im.width*z,im.height*z),Image.NEAREST)
b.convert('RGB').save(S+'/review-ui-r3/p_'+name+'.png')
print(im.size)
