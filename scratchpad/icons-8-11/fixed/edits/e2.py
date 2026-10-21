p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_6a85ff87-34d-1/tools/ui/ui-icons-23.ts'
s = open(p).read()
old = """    marks: [
      { kind: 'bright', what: 'his white foam, spray and the light crests of the water', r: 1, thr: 0.08, minL: 0.8, minPx: 3, speck: 0.15, share: 0.35, mix: 0.8 },"""
new = """    // His spray and foam are near-white specks on his navy: his box makes them muted grey-blue, which
    // the palette's saturated blues took (a blue halo where his spray is). Hue weighed more, and his
    // whitest foam kept white.
    qChroma: 1.6,
    marks: [
      { kind: 'colour', what: 'his whitest foam and spray', r: 0, thr: 0, minL: 0.93, minPx: 2, share: 0.3, mix: 1, pick: 'peak' },
      { kind: 'bright', what: 'his white foam, spray and the light crests of the water', r: 1, thr: 0.08, minL: 0.8, minPx: 3, speck: 0.15, share: 0.35, mix: 0.8 },"""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
print('ok')
