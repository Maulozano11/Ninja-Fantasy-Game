p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_6a85ff87-34d-1/tools/ui/ui-icons-23.ts'
s = open(p).read()
old = """    marks: [
      { kind: 'dark', what: 'the near-black outlines of his ninja and his kunai', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },"""
new = """    marks: [
      // The tan wrap of his kunai's grip (#c4a491, #a07f61; his pixels 22-40, 54-70): at 44 it went to
      // the palette's blue-grey.
      { kind: 'colour', what: "the tan wrap of his kunai's grip", r: 0, thr: 0, hue: [40, 85], minC: 0.03, minL: 0.4, minPx: 2, share: 0.2, mix: 0.8, keep: true, win: (x, y) => x >= 22 && x < 40 && y >= 54 && y < 70 },
      { kind: 'dark', what: 'the near-black outlines of his ninja and his kunai', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },"""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
print('ok')
