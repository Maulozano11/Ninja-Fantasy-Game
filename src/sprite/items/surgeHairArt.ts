// The owner's golden spiky hair on his Trunks 3, his pixels (tools/refs/trunks-surge-hair-from-ref.py from
// docs/reference/trunks3-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const SURGE_HAIR_COLORS: Record<string, string> = {
  a: '#2b1009',
  b: '#a35905',
  c: '#27100a',
  d: '#c1720a',
  e: '#faae18',
  f: '#c77a0b',
  h: '#ffde75',
  i: '#230f08',
  j: '#b96b07',
  k: '#ffdc70',
  l: '#9b5506',
  m: '#33150a',
  n: '#b06508',
  p: '#a75e06',
  q: '#fec63e',
  r: '#fedf79',
  s: '#fbae14',
  t: '#f3a715',
  u: '#8b4702',
  v: '#b56b09',
  w: '#9f5604',
  x: '#c27609',
  y: '#fcb21a',
  z: '#f0a311',
  A: '#bc730a',
  B: '#904b02',
  C: '#803f06',
  D: '#874305',
  E: '#b86f08',
  F: '#c2750e',
  G: '#ad6108',
  H: '#ce7e0a',
  I: '#dc8f0f',
  J: '#ffe071',
  K: '#8b4608',
  L: '#ed9d11',
  M: '#bd6f0a',
  N: '#230b08',
  O: '#984f04',
  P: '#000000',
};

/** Every pixel of his hair, over the head: his colours and his line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const SURGE_HAIR_FRONT: PaintedPart = {
  pivot: [12, 20],
  rows: [
    '........aa....aa................',
    '........abc...ada...............',
    '........cda...aec.........aa....',
    '........cfhi..cejca......cja....',
    '....aa..afkhaafeela......mkc....',
    '....anc.apeqreesetuca...arhc....',
    '....cspavwxeyhkketzpuaaakkfa....',
    '....aeedhsdfeskhhetppehkkAba....',
    'ac..cjeeekhhseeehebBeehfdACa....',
    'aa..apfeeehhheedkebxeedxxDDDa...',
    'ahccdxbdfeshhkeeEtxddfdseeeAlaac',
    'aekheysxfdedeeeeefddfdAdsyseedFa',
    'iEshrhkhhheeeeheeeeedeefdDCjdic.',
    '.aGHeeeeheeshhhHehyIuIJhGxCKa...',
    '..aDjdLkexehhhHaeksEcbehpdfa....',
    '..iCCdyyEehhhdc.ureu.aMeeCFa....',
    '.aDDsseaxskypi..DhdD..cAyuDi....',
    'cDKeyei.aefia...uhu...NDyKa.....',
    'aciaea..iAa...........cusi......',
    '....ac..ci...........uaBei......',
    '....ii..cc..............Oc......',
    '....aBa.i...............ua......',
    '.....aui................ci......',
    '.....iuc........................',
    '......iaa.......................',
    '........P.......................',
  ],
  colors: SURGE_HAIR_COLORS,
};

/** His hair with what his face hides filled in, drawn behind the head; also his head's outline at the top. */
export const SURGE_HAIR_BACK: PaintedPart = {
  pivot: [12, 20],
  rows: [
    '........aa....aa................',
    '........abc...ada...............',
    '........cda...aec.........aa....',
    '........cfhi..cejca......cja....',
    '....aa..afkhaafeela......mkc....',
    '....anc.apeqreesetuca...arhc....',
    '....cspavwxeyhkketzpuaaakkfa....',
    '....aeedhsdfeskhhetppehkkAba....',
    'ac..cjeeekhhseeehebBeehfdACa....',
    'aa..apfeeehhheedkebxeedxxDDDa...',
    'ahccdxbdfeshhkeeEtxddfdseeeAlaac',
    'aekheysxfdedeeeeefddfdAdsyseedFa',
    'iEshrhkhhheeeeheeeeedeefdDCjdic.',
    '.aGHeeeeheeshhhHehyIuIJhGxCKa...',
    '..aDjdLkexehhhHaeksEcbehpdfa....',
    '..iCCdyyEehhhdcaureucaMeeCFa....',
    '.aDDsseaxskypicaDhdDcacAyuDi....',
    'cDKeyeiaaefiaicauhuDcaNDyKa.....',
    'aciaeaiaiAaiaicauhuDcacusi......',
    '....aciaciaiaicauhuDcuaBei......',
    '....iiiaccaiaicauhuDcuaBOc......',
    '....aBaaic..............ua......',
    '.....auiic..............ci......',
    '.....iucic......................',
    '......iaac......................',
    '........P.......................',
  ],
  colors: SURGE_HAIR_COLORS,
};

/** His line's characters (his darkest colours): they keep their colour when the hair is recoloured. */
export const SURGE_HAIR_LINE = 'NPacim';

/** His colour of middle lightness: the colour slot's default; his other colours follow it. */
export const SURGE_HAIR_BASE = '#fbae14';
