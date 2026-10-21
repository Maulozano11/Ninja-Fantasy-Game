# Runs the converter up to the frame list and pickles nothing: used via exec in experiments.
import sys, numpy as np
SRC = '/home/user/Ninja-Fantasy-Game/tools/refs/cobra-from-ref.py'
def load(stop="# His LEFT is frame 0 and his RIGHT frame 5"):
    s = open(SRC).read()
    s = s[:s.index(stop)]
    sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg', '/dev/null']
    g = {'__name__': 'cobra'}
    exec(compile(s, SRC, 'exec'), g)
    return g
