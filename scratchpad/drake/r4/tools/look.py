import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/r4/tools'); import dec, rv
T = sys.argv[1]
a, s, A = dec.load(f'earth-{T}.ts'); fr = a['fly']
rv.zoom(fr, [0, 1, 2, 7], (95, 60, 175, 180), 5, path=f'{T}-hind-0127.png')
rv.zoom(fr, [5, 3, 4, 6], (95, 55, 185, 135), 5, path=f'{T}-tail-5346.png')
