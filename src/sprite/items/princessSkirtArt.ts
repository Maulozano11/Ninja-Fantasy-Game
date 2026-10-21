// The princess's gown skirt, the owner's pixels at our scale (tools/refs/princess-skirt-from-ref.py from
// docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.

/** A piece of his as drawn on our female body at idle frame 0: rows of his colours from fine pixel (x, y) of the frame. */
export interface GownPiece {
  x: number;
  y: number;
  /** One character per colour of his; '.' is empty, 'k' his line. */
  rows: string[];
  colors: Record<string, string>;
}

/** His line. */
export const PRINCESS_SKIRT_LINE = '#060317';

/** The open pink overskirt with its lilac and gold embroidered hems, the lilac underskirt with its gold hem band and the
 * dark purple petticoat, from the waistband to the floor; what the rest of her hides of it is his pixels carried on. */
export const PRINCESS_SKIRT: GownPiece = {
  x: 84,
  y: 171,
  rows: [
    '.............................kkkkkkkkkkkkkkkkkkkkkkkk.................',
    '...........................kktoxfqxxfyeLRGGGGRDdftutk.................',
    '........................kkktttoxtxyyfyeLRGGGGTDdwjytk.................',
    '......................kktmttttoxxxxiuyeLRGGGGGDFgyixuk................',
    '....................kkattmtttoxxxxxiyyeLRGGGGGRFdxxuxtk...............',
    '...................kmattmttttoxxxynxxyeLRGGGGGTFJbyyyxk...............',
    '.................kkmaatmmttttxyyxtyxxb3LRGGGGGkXK3gyxxtk..............',
    '................kmmmattmuttxyxxyxxxyd2JLRGGGMGkXKL2bxyuuk.............',
    '...............kmmmamtmmmtyxyyyxxyxb3LJ2RGGGNGkkXJJ1dyytmk............',
    '...............kmmmattmumxyyytyxxyd2J22kRkGGNGGkkJ1Jdyyxtk............',
    '..............kmmmamttmuyxxttyyyxb2L1J2kRkNGNNGkkWJK3dxytmk...........',
    '.............kkmmmmttttyytttxyyyd2J2L2kTkGNGNNGkRkXKJ1byytk...........',
    '.............kmmmmtttttyuutxxxdd2KJ1J2kRkGNGNNGGkTkJ1Jdyytmk..........',
    '............knnmmmuuutwttuyxbb122KKJ1kDRkGNGNNGGkTk1JK2dxmnk..........',
    '...........kbdnmmtuuuummmxdd111JJ2K3kCDTkGNGNNGGkRCk2LKJbdnnk.........',
    '..........kDRSemnuttunmdbb12L1J11J1kDHSkGGNGNNMGGkRBkWJJJYgek.........',
    '........kkESDDSedcaaadd211JJK2KJ22kBIJ1kGNNGNNNGGk1KDk1J2DDSbk........',
    '........kDDDSDDCSSSRRR2LJJ1JKLL2kkdFMJ2kGNNGNNNGGk2LJbk2LDSDSk........',
    '........kSRDDDDSDCSDDDI2K2J1J22kieD2EJ2kGNNGNNNGGk22DDdk2RDDSDk.......',
    '.........kkRRDUDDSCUDD1JJL322kkmmbGEJ2kGGNNGNNNGGGk1JDgjkkRDDDDk......',
    '.........kmkkSDDDDCCD2KJ12kkkmmyeF1KK2kGNNNGNNNNGGk1KLgtomkSRDDk......',
    '........kmmmmkSRSSSRVW21kkmmnyxxgKJ1J2kGNNNGNNNNMGk2L2JdxnnkkSSk......',
    '........kmnmnmkkkkkkkkkknmmtxyyxeKJ1J1kGNNNGNNNNNGGk2J1eyummmkkk......',
    '.......kmmmnmmmnmamnnmmnnnmxxxygJJ2K1kGGNNNGNNNNNGGk2J2gxxmmnmk.......',
    '......kkmmmnummmmmmmnuttncyxyxxe2JJK2kGNNNNGNNNNNGGk2KKLexmnummk......',
    '......knmmmuunmanuutxyynmmxxxxeJJ2JK2kGNNNGNNNNNNGGHk2K2eyymttmk......',
    '.....kmnnmuuunmauuuuxxyqcxxxxygJJ1JK2kGNNNGNNNNNNGGGk2J2eyyamunk......',
    '....kkmmnuuummauutuyxxrouyxxxgKKJ1J2kGGNNNGNNHNNNNGGk1J2Lgxtauunk.....',
    '....kmmmmuuumauuutxyyrrfxyyxxeKK2KJ1kGGNNNGNNGNNNNGGGk2LKexxcnumk.....',
    '...kmmmmuuumamuuuuxxysitxxyyeJJK2K2kGGNNNNGNGGJNNNGGGk22Jexycnuumk....',
    '..kenmmuuummauuuuyxxrsiyxxxgKJJ1KK3kGGNNNNGNl2lNNNGGGk2J1exyyamtmk....',
    '.kDDmnuuummauuuuuyyxrftyxxeQKv2JJ2keGGNNNNll2K2llNHGGGk1J2gyxamuunk...',
    'kDUDbuuummcuuuuuxxysscxxyygJZJK2J1kDllNNNIFJJ2JJKONBGekSJ2hxxammuuk...',
    'kRDDUeummamuuuuuxyytcuxxxgKKZJKK2kCDR1QQplG2J1J2KPlReDkRKKKexxanuunk..',
    'kRCSDDbmamtuuutxxxttcxxxxeJK21JK2kCDSJ211DKKJJJKKJ1DUDkSL2Jexycmmtek..',
    'kSDSRDDaauuuuuuxxxtftxxygJJ1KK1XkUSSJJvK2DRX12111JKDDCUkUJJJgyxameDSk.',
    '.kUCCUDaRhuuuuxxxsscxxxeQLKJ1K1XkkkRZ1JJLSSLJJCJ22JCURkkRJJKhyxabDSCk.',
    '..kRDDaDDLeuuuxxxtcxxghJJ22LJJ2k555kkk112k55k215kkRRkk5kRK1LhxhaCCUCRk',
    '...kUkCSC1Khehxxstdee1LL2J1L2K1k555555kkk5555kkkk555555kSKL2QeKLaCCSSk',
    '....kBCSKK2KKKehhaL2KKKK2KK1J2k5555555555555555555555555kSL2JJK2cCRRk.',
    '....kSDCJ2LLL1AFzK2L2KJ1J22L1Rk5555555555555555555555555kRL1K21KcUkk..',
    '....kkRRLLL2LCRzzJ1KL2KLJJ43Uk555555555555kk5555kkkkkkkkkSJK2L2KKk....',
    '......kkS1JJKDRzRJJLJJ22110kk555555kkkkkkk.kkkkkkkkk.....kRLLKLLRk....',
    '........kkRRRSAzzRU22Ukkkkkk.kkkkkk.......................kSZZSSk.....',
    '..........kkkkSSRkkkkkk....................................kkkkk......',
    '..............kkkk....................................................',
  ],
  colors: {
    k: '#060317',
    a: '#723c55',
    b: '#7c4244',
    c: '#7b4059',
    d: '#804447',
    e: '#814644',
    f: '#82455d',
    g: '#864b46',
    h: '#864c44',
    i: '#8b4962',
    j: '#944e67',
    l: '#905a41',
    m: '#a9566d',
    n: '#ab586f',
    o: '#b66173',
    p: '#ae647d',
    q: '#ba6577',
    r: '#c86e7f',
    s: '#c8758a',
    t: '#d07988',
    u: '#d17d8c',
    v: '#e09d84',
    w: '#f19faa',
    x: '#f5a2a9',
    y: '#f5a6ad',
    z: '#7d588c',
    A: '#816192',
    B: '#856699',
    C: '#88699a',
    D: '#8b6d9e',
    E: '#9172a3',
    F: '#9a79a8',
    G: '#a884b4',
    H: '#ac8cb9',
    I: '#ac8fba',
    J: '#b294c0',
    K: '#b497c1',
    L: '#b599c2',
    M: '#cca6cc',
    N: '#e9c4e3',
    O: '#ebcae6',
    P: '#9a663b',
    Q: '#a36a4e',
    R: '#ca9245',
    S: '#cb9446',
    T: '#cc9743',
    U: '#ce9749',
    V: '#d7a24e',
    W: '#daaa58',
    X: '#e2b25b',
    Y: '#ecc062',
    Z: '#f2c76e',
    '0': '#f4ca6a',
    '1': '#fad383',
    '2': '#fad586',
    '3': '#fddc8d',
    '4': '#fdecbb',
    '5': '#7d588c',
  },
};

/** The overskirt's pinks: its characters and the colour of his it recolours from. */
export const PRINCESS_SKIRT_CLOTH = 'abcdefghijlmnopqrstuvwxy';
export const PRINCESS_SKIRT_CLOTH_BASE = '#f5a2a9';
/** The underskirt's and the embroidered bands' lilacs: its characters and the colour of his it recolours from. */
export const PRINCESS_SKIRT_LILAC = 'zABCDEFGHIJKLMNO';
export const PRINCESS_SKIRT_LILAC_BASE = '#a884b4';
/** The embroidery and hem golds (and their browns): its characters and the colour of his it recolours from. */
export const PRINCESS_SKIRT_GOLD = 'PQRSTUVWXYZ01234';
export const PRINCESS_SKIRT_GOLD_BASE = '#fad586';
/** The petticoat's purples: its characters and the colour of his it recolours from. */
export const PRINCESS_SKIRT_PETTICOAT = '5';
export const PRINCESS_SKIRT_PETTICOAT_BASE = '#7d588c';
