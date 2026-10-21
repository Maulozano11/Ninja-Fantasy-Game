# usage: bar.py dest img44 [img44 ...]: each icon at 1x in a 56 slot on a dark bar, then the bar at x3 below
import sys
from PIL import Image
frame = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-r2/out/skill_slot_steel.png').convert('RGBA')
ims = [Image.open(p).convert('RGBA') for p in sys.argv[2:]]
W = 12 + len(ims) * 62
bar = Image.new('RGBA', (W, 70), (21, 23, 29, 255))
for i, im in enumerate(ims):
    x = 8 + i * 62
    bar.paste(im, (x + 6, 7 + 6))
    bar.alpha_composite(frame, (x, 7))
out = Image.new('RGBA', (W * 3, 70 + 70 * 3 + 6), (10, 10, 12, 255))
out.paste(bar, (0, 0))
out.paste(bar.resize((W * 3, 210), Image.NEAREST), (0, 76))
out.save(sys.argv[1])
