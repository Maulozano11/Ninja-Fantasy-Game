# usage: cmpdiag.py stageDir out.png x0 y0 x1 y1 [frameRow anim frame] -- compare his crop vs our frame (game coords of the sprite frame)
import sys, json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
stage, out = sys.argv[1], sys.argv[2]
name = sys.argv[3]
x0,y0,x1,y1 = map(int, sys.argv[4:8])
anim = sys.argv[8] if len(sys.argv) > 8 else 'idle'
fi = int(sys.argv[9]) if len(sys.argv) > 9 else 0
z = int(sys.argv[10]) if len(sys.argv) > 10 else 4
man = json.load(open(stage + '/manifest.json'))['sprites'][name]
refmap = json.load(open(S + '/art2/vfx-genjutsu-v3-refmap.json'))
rm = refmap[name]
sheet = Image.open(stage + '/' + name + '.png').convert('RGBA')
fw, fh = man['frameSize'] if 'frameSize' in man else (man['w'], man['h'])
