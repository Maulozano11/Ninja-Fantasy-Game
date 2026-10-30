"""The owner's heroine knights: the arms of each set (upper arm, forearm and hand on each side), from
docs/reference/heroine-knights-owner-reference.jpg shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  ivory and gold rerebraces and vambraces, her near gauntlet round the sword's grip, her far hand
           in a dark glove
  rogue    mail sleeves (his mail a clean checker), leather wraps on the forearms, dark gloves
  dragon   copper scale sleeves and gauntlets

Each upper arm rides about the shoulder, each forearm about the elbow, each hand about the wrist (the near
fist wrapped round the grip as he drew it).

  python3 -I tools/refs/hk-arms-from-ref.py src/sprite/items/heroineKnightArmsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

WHAT = {'paladin': ('rerebrace', 'vambrace', 'gauntlet'), 'rogue': ('mail sleeve', 'leather-wrapped forearm', 'dark glove'),
        'dragon': ('scale sleeve', 'scale forearm', 'scale gauntlet')}
BASES = {
    'paladin': {'ARM_PLATE': (('foreN', 'upperN'), ('ivory', 'steel', 'warm')), 'ARM_TRIM': (('foreN', 'upperN'), ('gold',))},
    'rogue': {'ARM_MAIL': (('upperN', 'upperF'), ('steel',)), 'ARM_LEATHER': (('foreN', 'handN'), ('warm', 'plum', 'red'))},
    'dragon': {'ARM_SCALES': (('foreN', 'upperN'), ('warm', 'red'))},
}


def build():
    parts = ('upperN', 'foreN', 'handN', 'upperF', 'foreF', 'handF')
    docs = {}
    for f in R.SETS:
        u, fo, h = WHAT[f]
        docs[f] = {}
        for s, side in (('N', 'near'), ('F', 'far')):
            docs[f]['upper' + s] = f"The {f}'s {side} {u}. It rides the upper arm about the shoulder."
            docs[f]['fore' + s] = f"The {f}'s {side} {fo}. It rides the forearm about the elbow."
            docs[f]['hand' + s] = f"The {f}'s {side} {h}" + (', wrapped round the sword\'s grip as he drew it' if s == 'N' else '') + '. It rides the hand about the wrist.'
    return R.set_module('hk-arms-from-ref.py', "The owner's heroine knights' arms", 'HK_ARMS', parts, docs, BASES)


if __name__ == '__main__':
    R.run(sys.argv, build)
