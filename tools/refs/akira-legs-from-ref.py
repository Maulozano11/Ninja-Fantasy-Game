"""The owner's layered leather legs (Ember Leather Leggings) from his Akira picture
(docs/reference/akira-owner-reference.jpg).

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  near thigh   the near thigh's leather down to the middle of his knee plate. His katana's guard and
               blade cross it and his tassets cover its top: there it is his thigh continued (cloned
               across the blade, then up to the hip), closed by his line.
  near shin    from the knee plate's lower half down to the boot, with its gold stud.
  far leg      the far leg from under the tassets to the sandal: in our rig all of it hangs below our
               far knee, so it rides the far shin. The blade crosses it: there his leg goes on.
  far thigh    under his tassets, hidden all over: the top of his far leg continued up to the hip.

His legs stand wider than ours (akira_ref.LEG_SHIFT): each leg's pieces are moved whole onto our leg,
so they bend at our knee and stand on our ground. It writes the pieces as TypeScript
(src/sprite/items/emberLegsArt.ts) and, in <study>, his figure beside the pieces at 8x, each where it
lands on our figure. The same picture always gives the same bytes:

  python3 -I tools/refs/akira-legs-from-ref.py src/sprite/items/emberLegsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's layered leather legs, his pixels (tools/refs/akira-legs-from-ref.py from\n"
    '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(h):
    k = R.kind(R.rgb(h))
    if k == 'line':
        return 'line'
    return 'stud' if k == 'gold' else 'leather'


def main():
    a = R.native()
    masks, cols, _ = R.pieces(a)
    J = R.JOINTS
    N, F = R.LEG_SHIFT['N'], R.LEG_SHIFT['F']
    pairs = [(masks[n], cols[n]) for n in ('thigh_n', 'shin_n', 'leg_f')]
    bases = {
        'LEG_LEATHER': R.middle(a, pairs, ('leather', 'skin')),
        'LEG_STUD': R.middle(a, pairs, ('gold',)),
    }
    consts = [
        ('LEG_THIGH_F', masks['thigh_f'], cols['thigh_f'], 'The far thigh (under the tassets, his far leg continued up): it rides the far thigh about the knee.', R.pivot_cell(J['kneeF'], F), R.angle('hipF', 'kneeF'), F),
        ('LEG_SHIN_F', masks['leg_f'], cols['leg_f'], 'The far leg from under the tassets to the sandal: it rides the far shin about the knee.', R.pivot_cell(J['kneeF'], F), R.angle('kneeF', 'ankleF'), F),
        ('LEG_THIGH_N', masks['thigh_n'], cols['thigh_n'], 'The near thigh down to the middle of the knee plate: it rides the near thigh about the knee.', R.pivot_cell(J['kneeN'], N), R.angle('hipN', 'kneeN'), N),
        ('LEG_SHIN_N', masks['shin_n'], cols['shin_n'], 'The near shin from the knee plate to the boot, its gold stud: it rides the near shin about the knee.', R.pivot_cell(J['kneeN'], N), R.angle('kneeN', 'ankleN'), N),
    ]
    extra = (
        '/** How far each leg of his is moved onto ours (fine pixels): at rest, his whole set stands this far back from it, where he drew it. */\n'
        f"export const LEG_SHIFT: Record<'N' | 'F', [number, number]> = {{ N: [{N[0]}, {N[1]}], F: [{F[0]}, {F[1]}] }};"
    )
    R.run(DOC, 'LEG', consts, bases, kind_of, extra)


if __name__ == '__main__':
    main()
