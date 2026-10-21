"""The owner's leather arm guards (Leather Bracers) from his Akira picture
(docs/reference/akira-owner-reference.jpg).

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the near guard   the brown leather guard over the near forearm, from under the elbow to the cuff
                   at the wrist, its lit lames on the outer side. His near arm stands where ours does:
                   it rides our forearm about the elbow, where he drew it.
  the far guard    the far forearm's guard, down to the cuff over the back of his far fist. He drew
                   the far forearm hanging straighter than ours (his fist nearer the body and lower,
                   FAR_FIST): the guard keeps his angle and his place near rest, pinned at our
                   elbow (src/sprite/items/ember.ts), and turns onto our forearm as the arm moves.

  the fists      his far fist under its cuff and his near fist round the katana's grip, in his skin
                 (it follows the character's skin from our Akira's, PAINTED_SKIN). The game draws them
                 in place of our hands in every pose, turned whole with the guards about our elbows
                 (his far fist also on the near arm when that hand is empty). It writes the pieces as
                 TypeScript (src/sprite/items/emberBracersArt.ts) and, in <study>, his figure beside the pieces at 8x. The same
picture always gives the same bytes:

  python3 -I tools/refs/akira-bracers-from-ref.py src/sprite/items/emberBracersArt.ts [study]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's leather arm guards, his pixels (tools/refs/akira-bracers-from-ref.py from\n"
    '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# His darkest browns, the seams and bands between the lames: the Straps slot recolours them.
STRAP_LUMA = 34


SKIN = set()


def kind_of(h):
    k = R.kind(R.rgb(h))
    if k == 'line':
        return 'line'
    if h in SKIN:
        return 'skin'
    return 'strap' if R.hex_luma(h) < STRAP_LUMA else 'leather'


def main():
    a = R.native()
    masks, cols, _ = R.pieces(a)
    J = R.JOINTS
    pairs = [(masks[n], cols[n]) for n in ('bracer_n', 'bracer_f')]
    lit = [(m & (R.luma(c) >= STRAP_LUMA), c) for m, c in pairs]
    dark = [(m & (R.luma(c) < STRAP_LUMA), c) for m, c in pairs]
    bases = {
        'EMBER_BRACER_LEATHER': R.middle(a, lit, ('leather', 'skin')),
        'EMBER_BRACER_STRAP': R.middle(a, dark, ('leather',)),
    }
    # his fists' colours (the skin and its shadows) follow the character's skin
    for n in ('fist_n', 'fist_f'):
        for y, x in zip(*R.np.nonzero(masks[n])):
            h = R.hexc(cols[n][y, x])
            if R.kind(R.rgb(h)) != 'line':
                SKIN.add(h)
    bases['EMBER_BRACER_SKIN'] = R.PAINTED_SKIN
    far = math.degrees(math.atan2(R.FAR_FIST[1] - J['elbowF'][1], R.FAR_FIST[0] - J['elbowF'][0]))
    fist = [int(math.floor(R.FAR_FIST[i] + R.OFFSET[i])) for i in (0, 1)]
    extra = (
        '/** The middle of his far fist in our male idle frame 0 (fine pixels). */\n'
        f'export const EMBER_BRACER_FIST: [number, number] = [{fist[0]}, {fist[1]}];'
    )
    consts = [
        ('EMBER_BRACER_F', masks['bracer_f'], cols['bracer_f'], 'The far forearm guard down to the cuff over the back of the fist, at his angle: it rides the forearm about our elbow.', J['elbowF'], far, (0, 0)),
        ('EMBER_BRACER_N', masks['bracer_n'], cols['bracer_n'], 'The near forearm guard, elbow to cuff: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN'), (0, 0)),
        ('EMBER_FIST_F', masks['fist_f'], cols['fist_f'], 'His far fist under the cuff, at the guard\'s angle: it rides the forearm about our elbow with the guard.', J['elbowF'], far, (0, 0)),
        ('EMBER_FIST_N', masks['fist_n'], cols['fist_n'], 'His near fist round the katana\'s grip: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN'), (0, 0)),
    ]
    R.run(DOC, 'EMBER_BRACER', consts, bases, kind_of, extra)


if __name__ == '__main__':
    main()
