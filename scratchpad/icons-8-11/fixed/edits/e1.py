p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_6a85ff87-34d-1/tools/ui/ui-icons-23.ts'
s = open(p).read()
old = """    marks: [
      { kind: 'dark', what: 'the dark outlines of his three dragon heads', r: 1, thr: 0.1, maxL: 0.25, minPx: 6, share: 0.3, mix: 0.6 },
      { kind: 'bright', what: 'his fire in the mouths, the teeth and the embers', r: 1, thr: 0.08, minL: 0.8, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],"""
new = """    // The yellow-white cores of his heads' mouths (#fbe832, #ffed3c): at 44 a pixel each, which the
    // palette's orange and the clean-up took; his dark jaw lines round them a little stronger.
    extra: [{ box: [15, 54, 26, 64], lo: 0.6, hi: 1, spare: false, by: 'L', only: { hue: [95, 112] }, why: "the yellow core of his left head's mouth" }],
    marks: [
      { kind: 'colour', what: "the yellow cores of his heads' mouths", r: 0, thr: 0, hue: [95, 112], minC: 0.12, minL: 0.88, minPx: 2, share: 0.2, mix: 1, pick: 'peak', keep: true },
      { kind: 'dark', what: 'the dark outlines of his three dragon heads', r: 1, thr: 0.1, maxL: 0.25, minPx: 6, share: 0.25, mix: 0.6 },
      { kind: 'bright', what: 'his fire in the mouths, the teeth and the embers', r: 1, thr: 0.08, minL: 0.8, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],"""
assert old in s
s = s.replace(old, new)
old = """    marks: [
      { kind: 'dark', what: 'the dark mouth, teeth gaps and outline of his dragon head', r: 1, thr: 0.1, maxL: 0.3, minPx: 6, share: 0.3, mix: 0.6 },"""
new = """    marks: [
      // His teeth: pale yellow (#fffa94) in his dark mouth; at 44 his box makes them tan (#d4974d), where
      // the dark rule darkened them and the palette took them to flame orange. In the jaws (his pixels
      // 95-127, 38-66) a 44 pixel with a fifth of it tooth keeps his box colour and stays.
      { kind: 'colour', what: 'his teeth (his box colour kept)', r: 0, thr: 0, hue: [85, 112], minC: 0.08, minL: 0.85, minPx: 2, share: 0.2, mix: 0, keep: true, win: (x, y) => x >= 95 && y >= 38 && y < 66 },
      { kind: 'dark', what: 'the dark mouth, teeth gaps and outline of his dragon head', r: 1, thr: 0.1, maxL: 0.3, minPx: 6, share: 0.3, mix: 0.6 },"""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
print('ok')
