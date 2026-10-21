import sys, glob
from PIL import Image
# px.py jid size x0 y0 x1 y1  -> prints his box-reduced and ours hex grids
R2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
ICONS='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons811-rev2/src/assets/ui_icons'
jid, N = sys.argv[1], int(sys.argv[2]); x0,y0,x1,y1 = map(int, sys.argv[3:7])
his = Image.open(glob.glob(f'{R2}/stage/s*/ref/{jid}.png')[0]).convert('RGB').resize((N,N), Image.BOX)
o = Image.open(f'{ICONS}/{jid}{"@2x" if N==88 else ""}.png').convert('RGB')
for name, im in (('his', his), ('our', o)):
    print(name)
    print('     ' + ' '.join(f'{x:>6}' for x in range(x0, x1+1)))
    for y in range(y0, y1+1):
        print(f'{y:>3}: ' + ' '.join('%02x%02x%02x' % im.getpixel((x, y)) for x in range(x0, x1+1)))
