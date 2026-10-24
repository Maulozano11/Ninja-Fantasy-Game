"""The owner's officer coats (docs/reference/navy-officer-*-owner-reference.jpg): one creator option per picture
of his, each coat as he drew it in that picture (his words on the first: "copia todos los conjuntos que puedas
sacar de este personaje"; on the others: "dame las 2 opciones", "ahora copia este pecho tambien", "copia pecho
como los otros", "ahora este nuevo pecho y como cambia su faldon").

  high      Officer's Coat (high collar): the high gold-trimmed collar lined in burgundy and the frogged chest;
            under his shoulder pieces (their own option, navy-epaulets-from-ref.py) his plain shoulders from
            his second picture, the same coat in the same pose
  folded    Officer's Coat (folded collar): the folded-down collar open at the throat, plain shoulders
  open      Open Officer's Coat: wide embroidered lapels, no frogging, plain tails
  buttoned  Buttoned Officer's Coat: notched lapels buttoned across with gold frog bars, a flap pocket, the
            embroidered near tail
  dark      Dark Officer's Coat: plum, gold-edged lapels embroidered in gold and red, flame cuffs, red flames
            along the tails

tools/refs/navy_ref.py shrinks each picture to our male rig and cleans it with his palette only (his "Reducir y
limpiar yo"), and cuts the coat out of it (navy_ref.pieces: what the belt, the sash, the fists, the scabbard and
the hilt hide is continued from his own pixels). The module has the body, each sleeve in two (cut at his elbow,
the cuff with the forearm), the tails and their lining, his joints at rest and the colours the slots recolour
from. With a third argument, a folder, it writes the pieces beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-coat-from-ref.py high src/sprite/items/navyCoatHighArt.ts [studyDir]
  python3 -I tools/refs/navy-coat-from-ref.py folded src/sprite/items/navyCoatFoldedArt.ts [studyDir]
  python3 -I tools/refs/navy-coat-from-ref.py open src/sprite/items/navyCoatOpenArt.ts [studyDir]
  python3 -I tools/refs/navy-coat-from-ref.py buttoned src/sprite/items/navyCoatButtonedArt.ts [studyDir]
  python3 -I tools/refs/navy-coat-from-ref.py dark src/sprite/items/navyCoatDarkArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

PREFIX = {'high': 'COAT_HIGH', 'folded': 'COAT_FOLDED', 'open': 'COAT_OPEN', 'buttoned': 'COAT_BUTTONED', 'dark': 'COAT_DARK'}

if __name__ == '__main__':
    pic = sys.argv[1]
    N.coat_module('navy-coat-from-ref.py', pic, sys.argv[2], PREFIX[pic], f"The owner's officer coat ({pic})", sys.argv[3] if len(sys.argv) > 3 else None)
