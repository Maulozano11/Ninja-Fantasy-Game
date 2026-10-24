"""The owner's royal cape on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the cape
'Royal Cape', black outside, crimson lining, gold trim, a very high stand-up collar lined in red and gold studs
at the collar's foot, sweeping to the ground; his pixels at our scale (tools/refs/noble_ref.py).

  back      the cloth behind the body, from the shoulders to the ground: his crimson lining and the black
            outside with its gold trim on both sides; what the body, the legs and the arms hide of it is his
            lining continued up and down each column inside its outline, down to his hem (it hangs from the
            neck)
  mantles   the black over each shoulder to its gold edge, over the upper arm (each rides its shoulder)
  collar    the high collar's two wings round the neck and the gold studs at its foot (it rides the neck)

It writes src/sprite/items/royalCapeArt.ts:

  python3 -I tools/refs/noble-cape-from-ref.py src/sprite/items/royalCapeArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


def kind_of(rgb, const):
    k = N.kind(rgb)
    if k in ('line', 'gold', 'red'):
        return k
    if k in ('white', 'brown'):
        return 'gold'
    return 'black'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    collar = P['collar_n'][0] | P['collar_f'][0] | P['stud_n'][0] | P['stud_f'][0]
    col = P['collar_n'][1].copy()
    for n in ('collar_f', 'stud_n', 'stud_f'):
        m, c = P[n]
        col[m] = c[m]
    torso = N.angle_of(J['pelvis'], J['neck'])
    consts = [
        ('ROYAL_CAPE_BACK', *P['cape'], 'The cloth behind the body to the ground: it hangs from the base of the neck.', J['neck'], torso),
        ('ROYAL_CAPE_MANTLE_F', *P['mantle_f'], 'The black over the far shoulder: it rides the far shoulder.', J['shoulderF'], 0),
        ('ROYAL_CAPE_COLLAR', collar, col, 'The high collar and its gold studs: it rides the neck.', J['neck'], torso),
        ('ROYAL_CAPE_MANTLE_N', *P['mantle_n'], 'The black over the near shoulder: it rides the near shoulder.', J['shoulderN'], 0),
    ]
    PP = {**P, 'collar': (collar, col)}
    names = ['cape', 'mantle_f', 'collar', 'mantle_n']
    bases = {
        'ROYAL_CAPE_BLACK': N.middle(names, PP, ('dark',)),
        'ROYAL_CAPE_LINING': N.middle(names, PP, ('red',)),
        'ROYAL_CAPE_GOLD': N.middle(names, PP, ('gold',)),
    }
    N.run_part('noble-cape-from-ref.py', "The owner's royal cape on his noble swordsman", out_ts, study, consts, bases, 'ROYAL_CAPE', kind_of)


if __name__ == '__main__':
    main()
