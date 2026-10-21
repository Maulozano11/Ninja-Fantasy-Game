"""exec the converter up to a marker, for analysis: from partial import G"""
import sys, os
SRC = '/home/user/Ninja-Fantasy-Game/tools/refs/griffin-from-ref.py'
def run(marker='# --- 5. checks', src=SRC, subs=()):
    txt = open(src).read()
    for a, b in subs:
        assert a in txt, a
        txt = txt.replace(a, b)
    if marker:
        txt = txt.split(marker)[0]
    saved = list(sys.argv)
    sys.argv = ['x', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-chakra-set-owner.jpg', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/griffin-fix/partial-out.ts']
    g = {'__name__': 'conv'}
    try:
        exec(compile(txt, src, 'exec'), g)
    finally:
        sys.argv = saved
    return g
