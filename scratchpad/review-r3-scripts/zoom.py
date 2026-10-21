from PIL import Image, ImageDraw
import sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-ui-icons-r3'; U=S+'/staging/ui_icons'
def grid(im,k,step=None):
    W,H=im.size; big=im.resize((W*k,H*k),Image.NEAREST); d=ImageDraw.Draw(big)
    for i in range(0,W+1,step or 4):
        d.line([(i*k,0),(i*k,H*k)],fill=(255,0,255) if i%8==0 else (90,90,90),width=1)
    for j in range(0,H+1,step or 4):
        d.line([(0,j*k),(W*k,j*k)],fill=(255,0,255) if j%8==0 else (90,90,90),width=1)
    return big
for n in ['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']:
    im=Image.open(f'{U}/{n}.png').convert('RGB')
    grid(im,16).save(f'{R}/{n}-44-x16-grid.png')
    im=Image.open(f'{U}/{n}@2x.png').convert('RGB')
    grid(im,8,8).save(f'{R}/{n}-88-x8-grid.png')
