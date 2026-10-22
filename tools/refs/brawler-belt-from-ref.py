"""The owner's broad man's belt (docs/reference/bulky-owner-reference.jpg), lifted out on its own (his
words: "aisla el cinturon"): a brown leather belt with a round silver buckle and a second strap slanting
down to the near hip, a tan pouch with hanging straps on that hip, and a sheathed knife hanging between
the legs.

His picture is in his own pixels, one of them one fine pixel of ours, his figure on our bulky rig at
idle frame 0 (tools/refs/bulky_ref.py). This script lifts out of it, every pixel in his exact colour:

  belt    both straps and the buckle; where his near fist lies over the slanting strap, the strap goes
          on under it (each hidden pixel takes his leather met first along the strap).
  pouch   the tan pouch, its flap and the straps hanging from it; under his near fist its top goes on
          (his pouch met first below).
  knife   the dark sheath and the grey tip of the blade, seen between his legs (the pixels of the near
          leg's inseam at its top are the jeans', bulky_ref.KNIFE_INSEAM); its top passes behind his
          far leg, and there it goes on up to the waistband, slanting as he drew it (each hidden pixel
          takes his sheath met first down along it), so wherever the legs go it hangs from the belt.

All three ride the pelvis: the belt leans with the body, the pouch and the knife hang straight down from
it (items/brawler.ts), the knife behind both legs. Every piece marks its open edge (bulky_ref.seal_rows).
Each kind of his colours ('line', 'leather', 'metal', 'tan') is exported, so the item follows its colour
slots, his black line staying. It writes src/sprite/items/brawlerBeltArt.ts and, with a second argument,
a folder for his belt beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/brawler-belt-from-ref.py src/sprite/items/brawlerBeltArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's belt, pouch and knife, his pixels (tools/refs/brawler-belt-from-ref.py from\n"
    '// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# Where the slanting strap runs on under his near fist (a polygon in his pixel corners), and its way.
STRAP_UNDER_FIST = [(35, 64.5), (44, 61.5), (44, 67.5), (35, 70.5)]
STRAP_WAY = np.array([0.9, -0.44])
# Where the pouch's top runs on under his near fist.
POUCH_UNDER_FIST = [(33, 65), (45, 65), (45, 71), (33, 71)]
# The sheath's top behind his far leg, up to the waistband (his edges of the sheath continued up), and
# the way down along it.
SHEATH_UP = [(57, 64), (63.5, 64), (56.5, 77), (52, 77)]
SHEATH_WAY = np.array([-0.5, 0.866])


def kind_of(h, piece):
    c = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
    k = R.kind(c)
    if k == 'line':
        return 'line'
    if k == 'cool':
        return 'metal'
    if piece == 'BELT_POUCH' and k in ('tan', 'skin', 'hair'):
        return 'tan'
    return 'leather'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    black = R.his_line(a, K)
    H, W, _ = a.shape
    J = R.JOINTS
    fist = masks['steel_n']
    belt = masks['belt'] | masks['buckle']
    want = belt | (R.inside(STRAP_UNDER_FIST, H, W) & fist)
    bcol, bm = R.fill_hidden(a, K, belt, want, -STRAP_WAY, black)
    # Only the fill along the strap under the fist, not a cap all round the belt's edge (his own line).
    bm = belt | (bm & ~belt & R.inside(STRAP_UNDER_FIST, H, W))
    pouch = masks['pouch']
    want = pouch | (R.inside(POUCH_UNDER_FIST, H, W) & fist & ~bm)
    pcol, pm = R.fill_hidden(a, K, pouch, want, np.array([0.0, 1.0]), black)
    knife = masks['knife']
    # Only behind his far leg: the gap he left between his legs stays open.
    want = knife | (R.inside(SHEATH_UP, H, W) & ~R.his_outside())
    # Its edges going up are closed with the sheath's own line as he drew it at its top.
    ys, xs = np.nonzero(knife & (K == 'line'))
    kcol, km = R.fill_hidden(a, K, knife, want, SHEATH_WAY, a[ys[0], xs[0]], open_edge=np.arange(H)[:, None] < 65)
    torso = R.joint_angle('pelvis', 'neck')
    made = [
        R.piece('BELT_STRAPS', 'The belt: both straps and the round buckle (the slanting strap runs on under the near fist). It hangs from the pelvis and leans with the body.', bcol, bm, J['pelvis'], torso, seal=True),
        R.piece('BELT_POUCH', 'The tan pouch on the near hip, its flap and hanging straps. It hangs from the pelvis and leans with the body.', pcol, pm, J['pelvis'], torso, seal=True),
        R.piece('BELT_KNIFE', 'The sheathed knife hanging between the legs, the grey tip of its blade showing, its sheath going on up behind the far leg to the waistband. It hangs from the pelvis and leans with the body, behind both legs.', kcol, km, J['pelvis'], torso, seal=True, drop=R.cells(R.KNIFE_INSEAM, (H, W))),
    ]
    kinds = {}
    for n, _, _, pal in made:
        for h in pal.values():
            kinds.setdefault(h, kind_of(h, n))
    count = {}
    for col, m in ((bcol, bm), (pcol, pm), (a, knife)):
        for y, x in zip(*np.nonzero(m)):
            h = R.hexc(col[y, x])
            count[h] = count.get(h, 0) + 1
    pick = lambda k: max((h for h in kinds if kinds[h] == k), key=lambda h: (count.get(h, 0), h))
    header = [
        "/** His commonest colour of each kind: the colour slots' defaults (at these, every pixel is his). */",
        f"export const BELT_LEATHER = '{pick('leather')}';",
        f"export const BELT_METAL = '{pick('metal')}';",
        f"export const BELT_TAN = '{pick('tan')}';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from '../painted';", header, made, kinds=('BELT_KIND', kinds), rest_name='BELT_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [(a, knife), (pcol, pm), (bcol, bm)], os.path.join(study, 'belt@8.png'), box=(28, 52, 72, 90))
    print('leather', pick('leather'), 'metal', pick('metal'), 'tan', pick('tan'))


if __name__ == '__main__':
    main()
