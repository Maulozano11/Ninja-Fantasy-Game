// The shinobi pack's origins (docs/WORLD_DESIGN.md, section 3): where a new ninja starts in the
// world. The "child of two clans" is not here on purpose: mixed blood is earned by playing (the
// owner's limit, 2026-10-27), it is what a mixed child has when it takes over (step 7).

import type { Origin, OriginId } from '../../campaign/state';

export const SHINOBI_ORIGINS: Origin[] = [
  {
    id: 'clan_heir',
    name: 'Heir of the clan',
    nameEs: 'Heredero del clan',
    blurb: 'Living, powerful parents and the main house of your clan. Its rival of the cycle already dislikes you.',
    blurbEs: 'Padres vivos y poderosos y la casa principal de tu clan. El clan rival del ciclo ya te mira mal.',
    wealth: 5,
    reputation: { own: 4, rival: -2 },
    fame: 2,
    family: [
      { id: 'father', name: 'Your father', nameEs: 'Tu padre', role: 'head of the clan', roleEs: 'cabeza del clan' },
      { id: 'mother', name: 'Your mother', nameEs: 'Tu madre', role: 'the clan\'s strategist', roleEs: 'la estratega del clan' },
    ],
    baseTier: 2,
    hook: { id: 'heir_exam', line: 'Your father sends you to prove yourself: the first mission is an exam.', lineEs: 'Tu padre te manda a probarte: la primera misión es un examen.' },
    traits: ['proud'],
  },
  {
    id: 'war_orphan',
    name: 'War orphan',
    nameEs: 'Huérfano de la guerra',
    blurb: 'Nobody waits for you; a bunk in the genin barracks. The village took you in.',
    blurbEs: 'Nadie te espera; un cuarto en el barracón de genin. La aldea te recogió.',
    wealth: 0,
    reputation: { village: 2 },
    fame: 0,
    family: [],
    baseTier: 1,
    hook: { id: 'orphan_killers', line: 'Someone knows who killed your parents.', lineEs: 'Alguien sabe quién mató a tus padres.' },
    traits: ['wary'],
  },
  {
    id: 'merchant_child',
    name: 'Merchant\'s child',
    nameEs: 'Hijo del mercader',
    blurb: 'A merchant father, a younger sister and a house in the market. Your clan does not think you pure.',
    blurbEs: 'Padre mercader, hermana menor y una casa en el mercado. Tu clan no te cree "puro".',
    wealth: 4,
    reputation: { village: 2, own: -1 },
    fame: 1,
    family: [
      { id: 'father', name: 'Your father', nameEs: 'Tu padre', role: 'merchant of the market', roleEs: 'mercader del mercado' },
      { id: 'sister', name: 'Your younger sister', nameEs: 'Tu hermana menor', role: 'keeps the shop', roleEs: 'lleva la tienda' },
    ],
    baseTier: 1,
    hook: { id: 'merchant_debt', line: 'Your father owes money to someone he should not.', lineEs: 'Tu padre debe dinero a quien no debía.' },
    traits: ['shrewd'],
  },
  {
    id: 'pardoned_renegade',
    name: 'Pardoned renegade',
    nameEs: 'Renegado perdonado',
    blurb: 'A hut outside the wall and an old comrade who has not forgiven you. The village watches.',
    blurbEs: 'Una cabaña fuera de la muralla y un antiguo compañero que no te perdona. La aldea te vigila.',
    wealth: 1,
    reputation: { own: -4, renegades: 1 },
    fame: 1,
    family: [{ id: 'old_comrade', name: 'Your old comrade', nameEs: 'Tu antiguo compañero', role: 'has not forgiven you', roleEs: 'no te perdona' }],
    baseTier: 1,
    hook: { id: 'renegade_loyalty', line: 'The village watches you: a mission to prove your loyalty.', lineEs: 'La aldea te vigila: una misión para demostrar lealtad.' },
    traits: ['guarded'],
  },
  {
    id: 'hermit_disciple',
    name: 'Hermit\'s disciple',
    nameEs: 'Discípulo del ermitaño',
    blurb: 'Your old, ailing master and the sanctuary in the forest.',
    blurbEs: 'Tu maestro, viejo y enfermo, y el santuario del bosque.',
    wealth: 2,
    reputation: { sanctuary: 3 },
    fame: 0,
    family: [{ id: 'master', name: 'Your master', nameEs: 'Tu maestro', role: 'old and ailing', roleEs: 'viejo y enfermo' }],
    baseTier: 1,
    hook: { id: 'hermit_last_favour', line: 'Your master asks one last favour before he dies.', lineEs: 'Tu maestro te pide un último favor antes de morir.' },
    traits: ['patient'],
  },
];

export const originDef = (id: OriginId | undefined): Origin | undefined => SHINOBI_ORIGINS.find((o) => o.id === id);

/** The origin each legend comes with (section 3: "cada una trae su origen ya elegido"). */
export const LEGEND_ORIGINS: Record<string, OriginId> = {
  preset_founder: 'clan_heir',
  preset_reference_aiden: 'clan_heir',
  preset_night: 'pardoned_renegade',
  preset_lyra: 'hermit_disciple',
  preset_aurelia: 'merchant_child',
};

/** A new ninja's origin when none was chosen. */
export const DEFAULT_ORIGIN: OriginId = 'war_orphan';
