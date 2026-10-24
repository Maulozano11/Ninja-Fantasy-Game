"""The owner's trousers on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the bottom
'Noble Trousers', black-navy trousers with a gold seam, tucked into the boots.

At our scale (tools/refs/noble_ref.py) his legs stand wider than our rig's and his far foot lower (his joints:
noble_ref.HIS_JOINTS). Each leg is his band of cloth about his leg's line, what the coat's tails, the belt and
the sword hide of it continued up each column from his pixels, its sides on his line, cut at his knee: the thigh
turns about his hip, the shin about his knee. It writes src/sprite/items/nobleTrousersArt.ts, with his joints
(NOBLE_LEG_JOINTS, where the game stands his legs at rest: items/noble.ts):

  python3 -I tools/refs/noble-trousers-from-ref.py src/sprite/items/nobleTrousersArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


def kind_of(rgb, const):
    k = N.kind(rgb)
    return k if k in ('line', 'gold') else 'cloth'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    consts = []
    for s in ('N', 'F'):
        m, c = P['trousers_' + s.lower()]
        th, sh = N.split(m, J['hip' + s], J['knee' + s], J['ankle' + s])
        consts.append((f'NOBLE_THIGH_{s}', th, c, 'The thigh: it turns about his hip.', J['hip' + s], N.angle_of(J['hip' + s], J['knee' + s])))
        consts.append((f'NOBLE_SHIN_{s}', sh, c, 'The shin: it turns about his knee.', J['knee' + s], N.angle_of(J['knee' + s], J['ankle' + s])))
    consts.append(('NOBLE_SEAT', *P['seat'], "The seat between his hips, up to the belt: it rides the pelvis (hidden by the coat's tails at rest).", J['pelvis'], N.angle_of(J['pelvis'], J['neck'])))
    consts.append(('NOBLE_SEAT_WHOLE', *P['seat_whole'], 'The whole seat, worn without the cape (where his lining shows between his legs at rest too): it rides the pelvis.', J['pelvis'], N.angle_of(J['pelvis'], J['neck'])))
    bases = {'NOBLE_TROUSERS': N.middle(['trousers_n', 'trousers_f'], P, ('dark',)), 'NOBLE_TROUSERS_GOLD': N.middle(['trousers_n', 'trousers_f'], P, ('gold',))}
    extra = N.joints_ts('NOBLE_LEG_JOINTS', ['hipN', 'kneeN', 'ankleN', 'hipF', 'kneeF', 'ankleF'])
    N.run_part('noble-trousers-from-ref.py', "The owner's trousers on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_TROUSERS', kind_of, extra)


if __name__ == '__main__':
    main()
