"""The owner's samurai: his do (the lacquered chest with its gold-patterned top band and red lacing) and
his sode (the big layered shoulder guards), from docs/reference/samurai-owner-reference.jpg.

His picture shrunk and cleaned to our scale (tools/refs/samurai_ref.py game()), cut into the chest (riding
the torso about the neck; where his near arm hides it, his plates continued out to the near shoulder) and
the two shoulder guards (each about its shoulder, following the upper arm part of the way). It also writes
his joints (SAMURAI_HIS: where the game stands our rig's joints at rest in his set, samuraiRig.ts).

  python3 -I tools/refs/samurai-do-from-ref.py src/sprite/items/samuraiDoArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    do, sode_n, sode_f = P['do'], P['sode_n'], P['sode_f']
    torso = S.rest_angle('male', 'pelvis', 'neck')
    consts = [
        ('SAMURAI_DO', *do, 'His do: the chest, its gold-patterned top band, the plates and the red lacing, from his collar to the sash. It rides the torso about the neck.', S.OUR_JOINTS['male']['neck'], torso),
        ('SAMURAI_SODE_N', *sode_n, 'His near shoulder guard: the layered plates with their gold rims and red lacing. It rides the near shoulder.', S.his_joint('shoulderN'), S.angle('shoulderN', 'elbowN')),
        ('SAMURAI_COLLAR', *P['collar'], 'His line between his hair and the far shoulder at rest, beside the chin.', S.OUR_JOINTS['male']['neck'], torso),
        ('SAMURAI_SODE_F', *sode_f, 'His far shoulder guard, behind the chest. It rides the far shoulder.', S.his_joint('shoulderF'), S.angle('shoulderF', 'elbowF')),
    ]
    bases = {
        'SAMURAI_LACQUER': S.middle(do[1], do[0], ('steel', 'dark')),
        'SAMURAI_LACING': S.middle(do[1], do[0], ('red',)),
        'SAMURAI_GOLD': S.middle(do[1], do[0], ('gold',)),
    }
    text = S.module(S.header('samurai-do-from-ref.py', "The owner's samurai do and shoulder guards"), consts, bases, 'SAMURAI_DO')
    joints = ['', "/** His joints in our frame (fine pixels): where the game stands our rig's joints at rest in his set (samuraiRig.ts). */",
              'export const SAMURAI_HIS: Record<string, [number, number]> = {']
    for n in S.HIS_NATIVE:
        x, y = S.his_joint(n)
        joints.append(f'  {n}: [{x:.3f}, {y:.3f}],')
    joints += ['};', '']
    return text + '\n'.join(joints)


if __name__ == '__main__':
    S.run(sys.argv, build)
