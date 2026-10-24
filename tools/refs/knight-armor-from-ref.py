"""The owner's three knights: their armour (the chest with its gorget, and the two pauldrons), from
docs/reference/three-knights-owner-reference.jpg: the paladin's polished silver plate with gold trim and the
gold cross, the dark knight's blackened plate over mail, the dragon knight's copper scales with the dragon's
head and spikes on the near shoulder and the glowing gems.

His picture shrunk and cleaned to our scale (tools/refs/knights_ref.py game()), cut into the chest (riding
the torso about the neck; where the near arm hides it, his plates carried out to the near shoulder) and the
two pauldrons (each about its shoulder). It also writes his joints (KNIGHT_HIS: where the game stands our
rig's joints at rest in his sets, src/sprite/knightRig.ts).

  python3 -I tools/refs/knight-armor-from-ref.py src/sprite/items/knightArmorArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402

WHAT = {
    'paladin': ('the silver plate with its gold trim and the gold cross on the chest', 'the gold-trimmed silver pauldron'),
    'dark': ('the blackened plate over mail, its worn bronze edges', 'the blackened pauldron'),
    'dragon': ('the copper dragon scales and the glowing gems', 'the horned pauldron: the dragon\'s head and spikes'),
}
# The kinds each slot recolours: the plate (or scales) and the trim (or the glow).
TRIM = {'paladin': ('gold',), 'dark': ('gold', 'brown'), 'dragon': ('flame', 'gold')}


def build():
    consts = []
    bases = {}
    for f in K.FIGURES:
        P = K.pieces(f)
        chest, pauldron = WHAT[f]
        consts += [
            K.entry(f, 'chest', f"The {f} knight's chest: {chest}, from the gorget to the belt. It rides the torso about the neck.", P),
            K.entry(f, 'pauldron_f', f"The {f} knight's far pauldron, behind the chest. It rides the far shoulder.", P),
            K.entry(f, 'pauldron_n', f"The {f} knight's near pauldron: {pauldron}. It rides the near shoulder.", P),
        ]
        rest = tuple(k for k in ('steel', 'dark', 'warm', 'white', 'brown', 'red') if k not in TRIM[f])
        bases[f'KNIGHT_{K.SET_NAME[f]}_PLATE'] = K.base(f, ['chest'], rest, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_TRIM'] = K.base(f, ['chest'], TRIM[f], 0.6, P=P)
    text = K.module(K.header('knight-armor-from-ref.py', "The owner's three knights' armour"), consts, bases, 'KNIGHT_ARMOR')
    joints = ['', "/** His joints in our frame (fine pixels): where the game stands our rig's joints at rest in his sets (knightRig.ts). */",
              'export const KNIGHT_HIS: Record<string, [number, number]> = {']
    for n in K.HIS_NATIVE:
        x, y = K.his_joint(n)
        joints.append(f'  {n}: [{x:.3f}, {y:.3f}],')
    joints += ['};', '']
    return text + '\n'.join(joints)


if __name__ == '__main__':
    K.run(sys.argv, build)
