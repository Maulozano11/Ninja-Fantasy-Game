"""The owner's torn black cloak from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg), for the
Rogue Storm Cloak (`cape_rogue`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour:

  the back       the cloak behind the body: both wings falling from the shoulders to the torn hem, their
                 dark red lining showing along the near edge and between the legs, the bright red tatters
                 at the hem. It hangs from the base of the neck. Behind the body it is continued down to
                 the legs (from his lining below it, else his cloth beside it), so it shows his cloth
                 when an arm or a leg swings away.
  the collar     the high scarf wound round the neck and the collar of the cloak over the shoulders, in
                 front of the kimono and under the chin. It hangs from the base of the neck.
  the shoulders  the cloak lying over each shoulder, above the sleeve: over the near arm, and over the far
                 one in front of the torso. Each hangs from its shoulder.
  the front      the cloak's front edge falling from the near shoulder between the arm and the kimono and
                 in front of the near leg to its torn hem. It hangs from the near shoulder; behind the arm
                 it is continued from his cloth below it.

His black follows Cloak, his bright red tatters Flame Trim and his dark red lining Lining; his line stays.

It writes src/sprite/items/rogueCloakArt.ts and, in <study>, the pieces at 10x (continued cells crossed).
The same picture always gives the same bytes:

  python3 -I tools/refs/ascended-cloak-from-ref.py src/sprite/items/rogueCloakArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's torn black cloak on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-cloak-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
NAMES = ['cloak', 'collar', 'mantle_f', 'panel', 'mantle_n']
# His bright red tatters are lighter than this (luma); his dark red lining darker.
TRIM_LUMA = 58


def kind_of(_n, h):
    c = A.rgb(h)
    L = A.luma(A.np.array(c, float))
    if L <= 12:
        return 'line'
    if A.kind(c) == 'red':
        return 'trim' if L >= TRIM_LUMA else 'lining'
    return 'cloth'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    J = A.JOINTS
    is_ = lambda want: lambda c: kind_of('', A.hexc(c)) == want
    names = ['cloak', 'collar', 'mantle_n', 'mantle_f', 'panel']
    bases = {
        'CLOAK_CLOTH': A.middle(a, masks, cols, names, is_('cloth')),
        'CLOAK_TRIM': A.middle(a, masks, cols, names, is_('trim')),
        'CLOAK_LINING': A.middle(a, masks, cols, names, is_('lining')),
        # His commonest black: the line drawn along the cloak where it is cut (laid on the ground).
        'CLOAK_LINE': A.commonest(a, masks, names, is_('line')),
    }
    specs = [
        ('CLOAK_BACK', 'cloak', 'The cloak behind the body, both wings to the torn hem: it hangs from the base of the neck.', J['neck'], 0),
        ('CLOAK_COLLAR', 'collar', 'The scarf round the neck and the collar over the shoulders, under the chin: it hangs from the base of the neck.', J['neck'], 0),
        ('CLOAK_SHOULDER_N', 'mantle_n', 'The cloak over the near shoulder, above the sleeve: it hangs from the near shoulder.', J['shoulderN'], 0),
        ('CLOAK_SHOULDER_F', 'mantle_f', 'The cloak over the far shoulder, above the sleeve: it hangs from the far shoulder.', J['shoulderF'], 0),
        ('CLOAK_FRONT', 'panel', 'The front edge falling from the near shoulder in front of the near leg to its torn hem: it hangs from the near shoulder.', J['shoulderN'], 0),
    ]
    text = A.emit(masks, cols, specs, bases, kind_of, 'CLOAK', "'line' | 'cloth' | 'trim' | 'lining'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, NAMES, os.path.join(study, 'cloak@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
