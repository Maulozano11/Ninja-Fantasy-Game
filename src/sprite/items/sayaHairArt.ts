// The owner's hair on his Saya, brought down to our scale in her colours
// (tools/refs/saya-hair-from-ref.py from docs/reference/saya-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { PaintedPart } from './capeArt';

/** One character per colour of hers (all three parts share them). */
const SAYA_HAIR_COLORS: Record<string, string> = {
  k: '#02010d',
  q: '#704336',
  t: '#7d4c37',
  y: '#85543e',
  E: '#9d6e44',
  J: '#b6834e',
  P: '#c69151',
  S: '#d4a35d',
  X: '#e2b668',
  o: '#e6c486',
  h: '#f6d886',
  H: '#fbe499',
  W: '#feeeb5',
  g: '#302525',
  M: '#c48e42',
  T: '#d8a84c',
  Y: '#e8ba58',
  '1': '#f7c962',
};

/** Over the head: the crown, the bangs, the ornament, the near side hair round the ear, the side lock down over the chest and the far lock. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const SAYA_HAIR_FRONT: PaintedPart = {
  pivot: [17, 15],
  rows: [
    '..............kkkkkkkk...........',
    '...........kkkhhhSSyPhkkk........',
    '.........kkHHhhhhhhhhPPhhkk......',
    '........kSWHhhhhhhhhhhhSSShk.....',
    '.......kJhWWhhhhhhhhhhhhhSShk....',
    '......kXhhhhWhhhhhhhhhhhhhXhhq...',
    '......kXhhhhhhhWhhShhhhhhWHhhhq..',
    '......khShhShhWWWHShhhhWhWHShHq..',
    '.....khShgghhhhhhyhWyhWhyWhyhHHq.',
    '.....kShg1YgTghhhyhhyhhyhhyqShHq.',
    '.....kShgYTMYTgShyhSyhhyShyyShSq.',
    '.....kShhgMgMMgSyhSyhhySJySSPhSq.',
    '.....kShhSgSgghJySJ..SS.J.JSPSPq.',
    '.....kShhShSEhhhy.....E......ShPq',
    '.....kShhSS.EhSy.............ShPq',
    '.....kShhhS.EhSy..............hPq',
    '....kSShShJ.EhSy.............ShPq',
    '....kSShSHytyhhXy...........JSt..',
    '...kPSShSoyyyhhXt...........JSt..',
    '...kShSSHyPyyhhSt...........JSt..',
    '..qSShSSHtJtyhhSt...........JSt..',
    '..qShShhhtJtyhhXt..........JSt...',
    '.qSShSWHXtJqyyHSt..........JSt...',
    '.qShhSWWyJqtytHSt..........JSt...',
    'qSyhSWhPyJqttqhWt..........JPSt..',
    '..............tHSt...............',
    '..............tWSt...............',
    '..............qHSt...............',
    '..............qhSq...............',
    '..............qSSq...............',
    '...............qSq...............',
    '................q................',
  ],
  colors: SAYA_HAIR_COLORS,
};

/** Behind the head: the front's outline filled in (her strands run on behind the forehead, her shade below the eyes) and her hair behind the far shoulder; also the head's outline at the top. Pivot on the face anchor. */
export const SAYA_HAIR_BACK: PaintedPart = {
  pivot: [17, 15],
  rows: [
    '..............kkkkkkkk...........',
    '...........kkkhhhSSyPhkkk........',
    '.........kkHHhhhhhhhhPPhhkk......',
    '........kSWHhhhhhhhhhhhSSShk.....',
    '.......kJhWWhhhhhhhhhhhhhSShk....',
    '......kXhhhhWhhhhhhhhhhhhhXhhq...',
    '......kXhhhhhhhWhhShhhhhhWHhhhq..',
    '......khShhShhWWWHShhhhWhWHShHq..',
    '.....khShgghhhhhhyhWyhWhyWhyhHHq.',
    '.....kShg1YgTghhhyhhyhhyhhyqShHq.',
    '.....kShgYTMYTgShyhSyhhyShyyShSq.',
    '.....kShhgMgMMgSyhSyhhySJySSPhSq.',
    '.....kShhSgSgghJySJyhSSSJyJSPSPq.',
    '.....kShhShSEhhhyJJJJJEJJJJJJShPq',
    '.....kShhSSJEhSyJJJJJJJJJJJJJShPq',
    '.....kShhhSJEhSyJJJJJJJJJJJJJJhPq',
    '....kSShShJJEhSyJJJJJJJJJJJJJShPq',
    '....kSShSHytyhhXyJJJJJJJJJJJJSt..',
    '...kPSShSoyyyhhXtJJJJJJJJJJJJSt..',
    '...kShSSHyPyyhhStJJJJJJJJJJJJSt..',
    '..qSShSSHtJtyhhStJJJJJJJJJJJJSt..',
    '..qShShhhtJtyhhXtJJJJJJJJJJJSt...',
    '.qSShSWHXtJqyyHStJJJJJJJJJJJSt...',
    '.qShhSWWyJqtytHStJJJJJJJJJJJSt...',
    'qSyhSWhPyJqttqhWtJJJJJJJJJJJPSt..',
    '..............tHSt........yPhSq..',
    '..............tWSt.........PhSq..',
    '..............qHSt.........JSPq..',
    '..............qhSq.........JSq...',
    '..............qSSq.........tPq...',
    '...............qSq..........Jq...',
    '................q...........q....',
  ],
  colors: SAYA_HAIR_COLORS,
};

/** Down the back from the near side of the head to the waist, behind the body: its pivot is the cell on the neck, its angle the torso's (neck to pelvis) at idle. */
export const SAYA_HAIR_LONG: PaintedPiece = {
  pivot: [29, 11],
  angle: 90.50,
  rows: [
    '..............qShhShSEhh',
    '..............qShhShSEhh',
    '..............qShhSSJEhS',
    '..............qShhhSJEhS',
    '.............qSShShJEyhS',
    '.............qSShSHyEyhS',
    '............qPSShSoyEyhh',
    '............qShSSHyPyyhh',
    '...........qSShSSHtJtyhh',
    '...........qShShhhtJtyhh',
    '..........qSShSWHXtJqyyh',
    '.........qShhSWWyJqtyhSt',
    '........qSyhSWhPyJqtEtJt',
    '......qXSPhhSHHyhSEtJEtt',
    '....tXXtqhhShhHhSyhJEtEt',
    '..qhSq.qhhSSWhhShyhJEtEt',
    '.qhq..qXhShhhWhShyhJEtEt',
    'qht...qohPhhhWhShyhJEtEt',
    'qX..qXhShhXhhShhyhJEtEtt',
    'qS.qXWShhSyhhShhyhJEyEtt',
    'qSqXhSPhhtShhPShyhJEyEtt',
    '.qShSPhhtShSPShyPJJEyEtt',
    '.qPShtPhPyJPJEyJJEyEEtyt',
    '.qPSStPSPyJPJEyJJEyEEtyt',
    '.qPSStPSPyJPJEyJJEyEEtyt',
    '.qPSq.qSPyJPJEyJJEyEEtyt',
    '.qPSq.qPPyJPJEyJEEyEEtyt',
    '.qPPq.qSPyJPJEyJEEyEEtyt',
    '..qPq.qSPyJPJEyJEEyEEtyt',
    '..qJq.qPPyJPJEyJEEyEEtyt',
    '...q..qPPyJPJEyJEEyEEtyt',
    '......qPJyJPJEyJEEyEEtyt',
    '......qJJyJPJEyJEEyEEtyt',
    '......qJqyJPJEyJEEyEEtyt',
    '.......q.qJPJEyJEEyEEtyt',
    '.........qJPJEyJEEyEEtyq',
    '..........qPJqyJEEyEEtq.',
    '..........qJq.qJEEyEEtq.',
    '...........q..qJEyqEEq..',
    '..............qJEq.qEq..',
    '..............qJq..qq...',
    '...............q........',
  ],
  colors: SAYA_HAIR_COLORS,
};

/** Her black line: kept as she has it when the hair is recoloured. */
export const SAYA_HAIR_LINE = 'k';

/** Her gold ornament's characters: they take the ornament's colour, not the hair's (its dark line stays). */
export const SAYA_HAIR_ORNAMENT = 'gnMTY1';
export const SAYA_HAIR_ORNAMENT_LINE = 'g';

/** Her hair's lit face, most of the crown: the hair slot's default; her other hair colours follow it. */
export const SAYA_HAIR_BASE = '#f6d886';

/** Her ornament's gold: the ornament slot's default. */
export const SAYA_HAIR_ORNAMENT_BASE = '#d8a84c';
