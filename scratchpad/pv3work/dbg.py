import sys
R='/home/user/Ninja-Fantasy-Game/'
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
src=open(R+'tools/refs/poison-from-ref.py').read()
cut=src.index('# --- build every key frame')
sys.argv=['x', R+'docs/reference/poison-set-owner-reference.jpg', '/dev/null', S+'art2/vfx-poison-v3-character.png']
g={'__name__':'dbg'}
exec(compile(src[:cut], 'poison-from-ref.py', 'exec'), g)
globals().update(g)
from PIL import Image
import numpy as np
name=sys.argv_name if hasattr(sys,'argv_name') else None
