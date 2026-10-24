// Every ability that needs a skill icon, with the names the game shows, for the owner's icon
// template (tools/ui/ui-icons-template.ts). It reads the game's own tables (read only) so the
// list can't drift from them, and refuses to build when they disagree with it:
//
//   jutsu          src/data/shinobiData.ts (JUTSUS_DATA, every jutsu a ninja can learn) and
//                  src/battle/jutsu.ts (their element on the battle map); the Spanish name is the
//                  button's (SHORT in src/components/battle/BattleScreen.tsx): jutsu have no other
//                  Spanish name, their tooltip shows the English data name
//   clan abilities src/battle/jutsu.ts (CLAN_SPECS: name, nameEs) and the three passives of
//                  docs/CLANS_DESIGN.md phase 1, named as the clan tips in battleText.ts name them
//   actions/items  the HUD's buttons (BattleScreen.tsx) and their labels (act_* in
//                  src/components/battle/battleText.ts)
//
// The hydra's attacks (hydra_spit, hydra_roar) are left out: no ninja uses them.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JUTSU } from '../../src/battle/jutsu';
import { JUTSUS_DATA } from '../../src/data/shinobiData';
import { T } from '../../src/components/battle/battleText';

const ROOT = join(import.meta.dirname, '..', '..');

export type Group = 'basic' | 'items' | 'jutsu' | 'clans';

export interface IconEntry {
  /** The icon's id (its file will be <id>.png); the game's id where it has one. */
  id: string;
  /** What the slot shows under the icon in the template: the Spanish name the game shows. */
  es: string;
  /** The button's own short Spanish label, when it differs from `es`. */
  esButton?: string;
  en: string;
  group: Group;
  /** The row it sits in (Spanish, shown in the template's left column). */
  row: string;
  /** How it is used, in English (action, bonus action, reaction, passive, button). */
  use: string;
  /** A short Spanish tag the template shows under the name (passives and reactions only). */
  tag?: string;
  note?: string;
}

export const GROUPS: { id: Group; es: string; en: string }[] = [
  { id: 'basic', es: 'Básicas', en: 'Basic actions' },
  { id: 'items', es: 'Objetos', en: 'Items' },
  { id: 'jutsu', es: 'Jutsu por elemento', en: 'Jutsu by element' },
  { id: 'clans', es: 'Clanes', en: 'Clan abilities' },
];

const es = (key: Parameters<typeof T>[0]): string => T(key, undefined, 'es');
const en = (key: Parameters<typeof T>[0]): string => T(key, undefined, 'en');

/** The jutsu buttons' short labels, [en, es], read from BattleScreen.tsx. */
function shortLabels(): Record<string, [string, string]> {
  const src = readFileSync(join(ROOT, 'src/components/battle/BattleScreen.tsx'), 'utf8');
  const at = src.indexOf('const SHORT');
  const end = src.indexOf('};', at);
  if (at < 0 || end < 0) throw new Error('ui-icons-list: SHORT table not found in BattleScreen.tsx');
  const out: Record<string, [string, string]> = {};
  for (const m of src.slice(at, end).matchAll(/^\s*(\w+): \['([^']*)', '([^']*)'\],?$/gm)) out[m[1]] = [m[2], m[3]];
  return out;
}

/** The HUD's buttons that need an icon, in the order the bar and its "Más" menu show them. */
const ACTIONS: { id: string; key: Parameters<typeof T>[0]; group: Group; row: string; use: string; note?: string }[] = [
  { id: 'attack', key: 'act_attack', group: 'basic', row: 'Barra', use: 'action' },
  { id: 'throw', key: 'act_throw', group: 'basic', row: 'Barra', use: 'action', note: 'Throws a kunai (button id "throw").' },
  { id: 'dash', key: 'act_dash', group: 'basic', row: 'Barra', use: 'action' },
  { id: 'dodge', key: 'act_dodge', group: 'basic', row: 'Barra', use: 'action' },
  { id: 'hide', key: 'act_hide', group: 'basic', row: 'Barra', use: 'action' },
  { id: 'draw', key: 'act_draw', group: 'basic', row: 'Barra', use: 'free once a turn, then bonus action', note: 'The "draw" button while the weapon is stowed.' },
  { id: 'stow', key: 'act_stow', group: 'basic', row: 'Barra', use: 'free once a turn, then bonus action', note: 'The same "draw" button while the weapon is drawn.' },
  { id: 'end', key: 'act_end', group: 'basic', row: 'Barra', use: 'button', note: 'Ends the turn; in the stealth phase it reads "Listo" (Done).' },
  { id: 'disengage', key: 'act_disengage', group: 'basic', row: 'Menú Más', use: 'action' },
  { id: 'crouch', key: 'act_crouch', group: 'basic', row: 'Menú Más', use: 'bonus action' },
  { id: 'stand', key: 'act_stand', group: 'basic', row: 'Menú Más', use: 'free', note: 'The same "crouch" button while crouched.' },
  { id: 'jump', key: 'act_jump', group: 'basic', row: 'Menú Más', use: 'bonus action' },
  { id: 'shove', key: 'act_shove', group: 'basic', row: 'Menú Más', use: 'action' },
  { id: 'trip', key: 'act_trip', group: 'basic', row: 'Menú Más', use: 'action' },
  { id: 'focus', key: 'act_focus', group: 'basic', row: 'Menú Más', use: 'action', note: 'The button shows "Concentr..." (truncated).' },
  { id: 'stabilize', key: 'act_stabilize', group: 'basic', row: 'Menú Más', use: 'action', note: 'Only with a downed ally next to you.' },
  { id: 'stone', key: 'act_stone', group: 'basic', row: 'Sigilo, borde y menú', use: 'action', note: 'Stealth phase only.' },
  { id: 'drag', key: 'act_drag', group: 'basic', row: 'Sigilo, borde y menú', use: 'movement', note: 'Stealth phase only, next to a body (button id "drag:<unit>").' },
  { id: 'flee', key: 'act_flee', group: 'basic', row: 'Sigilo, borde y menú', use: 'action in combat', note: 'Only at an exit edge of the map.' },
  { id: 'more', key: 'act_more', group: 'basic', row: 'Sigilo, borde y menú', use: 'button', note: 'Opens the "Más" menu.' },
  { id: 'back', key: 'act_more', group: 'basic', row: 'Sigilo, borde y menú', use: 'button', note: 'Closes the "Más" menu (the game shows "←" on the same "more" button).' },
  { id: 'pill', key: 'act_pill', group: 'items', row: 'Menú Más', use: 'bonus action', note: 'Consumable with a count badge; the button shows "Píldora d..." (truncated).' },
  { id: 'bandage', key: 'act_bandage', group: 'items', row: 'Menú Más', use: 'action', note: 'Consumable with a count badge.' },
  { id: 'antidote', key: 'act_antidote', group: 'items', row: 'Menú Más', use: 'action', note: 'Consumable with a count badge.' },
  { id: 'tag', key: 'act_tag', group: 'items', row: 'Menú Más', use: 'action', note: 'Consumable with a count badge; the button shows "Sello expl..." (truncated).' },
];

/** The jutsu rows: the game's battle elements in this order, with their Spanish row names. */
const ELEMENTS: [string, string][] = [
  ['fire', 'Fuego'],
  ['water', 'Agua'],
  ['wind', 'Viento'],
  ['lightning', 'Rayo'],
  ['earth', 'Tierra'],
  ['genjutsu', 'Genjutsu'],
  ['chakra', 'Chakra (taijutsu y sellos)'],
];
const RANK_ORDER = ['D', 'C', 'B', 'A', 'S'];
const USE: Record<string, string> = { action: 'action', bonus: 'bonus action', reaction: 'reaction' };

/** Phase 1 of docs/CLANS_DESIGN.md: the clan rows and their abilities in the clan's order. */
const CLANS: { row: string; tip: Parameters<typeof T>[0]; items: ({ id: string } | { id: string; es: string; en: string; note: string })[] }[] = [
  {
    row: 'Mirai',
    tip: 'tip_mirai',
    items: [
      {
        id: 'mirai_eye_of_tomorrow',
        es: 'Ojo del Mañana',
        en: 'Eye of Tomorrow',
        note: 'Passive, no button (proposed id). The current screenshots still show it as the "Visión del Futuro" (Future Foresight) button; phase 1 makes it passive, so one icon serves both.',
      },
      { id: 'mirai_evasion' },
      { id: 'katon_pursuing_flame' },
    ],
  },
  { row: 'Kōton', tip: 'tip_koton', items: [{ id: 'koton_block' }, { id: 'koton_wall' }] },
  {
    row: 'Ryusei',
    tip: 'tip_ryusei',
    items: [
      { id: 'ryusei_weapon_nodes', es: 'Nodos de Armas', en: 'Weapon Nodes', note: 'Passive, no button (proposed id): kunai and missed blows leave a Node.' },
      { id: 'ryusei_warp' },
      { id: 'ryusei_swap' },
    ],
  },
  {
    row: 'Northstar',
    tip: 'tip_northstar',
    items: [
      { id: 'northstar_aura', es: 'Aura de Soberanía', en: 'Aura of Sovereignty', note: 'Passive, no button (proposed id): 4.5 m around the Northstar.' },
      { id: 'northstar_command' },
      { id: 'northstar_submission' },
    ],
  },
];

/** The owner's six painted icons in docs/reference/ui-battle-owner-reference.jpg, left to right. */
export interface OwnerIcon {
  pos: number;
  /** The number on its tag in his picture. */
  tag: string;
  /** The ability it most likely is (an IconEntry id). */
  likely: string;
  /** Other abilities it could be. */
  alt: string[];
  /** What he painted, and why that ability. */
  why: string;
}
export const OWNER_ICONS: OwnerIcon[] = [
  { pos: 1, tag: '1', likely: 'dash', alt: ['body_flicker'], why: 'A ninja silhouette sprinting over an orange burst: running.' },
  { pos: 2, tag: '2', likely: 'hide', alt: ['crouch'], why: 'A dark ninja silhouette low in a wide crouch on gold, the usual "hide" pose.' },
  { pos: 3, tag: '3', likely: 'attack', alt: [], why: 'A long sword on a golden starburst: the weapon attack.' },
  { pos: 4, tag: '5', likely: 'jump', alt: ['disengage', 'dash'], why: 'A pair of boots in a green glow: a movement action that is not the sprint of icon 1.' },
  { pos: 5, tag: '4', likely: 'throw', alt: ['dodge', 'crescent_moon_dance'], why: 'Crossed blades with cyan motion streaks, one with a fletched tail: a thrown weapon (the kunai).' },
  {
    pos: 6,
    tag: '9',
    likely: 'temple_of_nirvana',
    alt: ['northstar_command', 'northstar_submission'],
    why: 'A magenta pillar of light (the game\'s genjutsu colour, like the genjutsu blast) with a figure slumping at its foot: the genjutsu that drops its targets.',
  },
];

/** Builds the list from the game's tables; throws if they and this list disagree. */
export function buildList(): IconEntry[] {
  const short = shortLabels();
  const out: IconEntry[] = [];
  const errors: string[] = [];

  for (const a of ACTIONS) {
    const name = es(a.key);
    if (!name || name === a.key) errors.push(`no Spanish label for ${a.key}`);
    const back = a.id === 'back';
    out.push({ id: a.id, es: back ? 'Volver' : name, en: back ? 'Back' : en(a.key), group: a.group, row: a.row, use: a.use, note: a.note });
  }

  const learnable = new Set(JUTSUS_DATA.map((j) => j.id));
  const used = new Set<string>();
  for (const [el, row] of ELEMENTS) {
    const ids = JUTSUS_DATA.filter((j) => JUTSU[j.id]?.element === el)
      .map((j) => j.id)
      .sort((a, b) => RANK_ORDER.indexOf(JUTSU[a].rank) - RANK_ORDER.indexOf(JUTSU[b].rank));
    for (const id of ids) {
      const spec = JUTSU[id];
      const data = JUTSUS_DATA.find((j) => j.id === id)!;
      const s = short[id];
      if (!s) errors.push(`no button label for jutsu ${id}`);
      used.add(id);
      out.push({
        id,
        es: s ? s[1] : data.name,
        en: data.name,
        group: 'jutsu',
        row,
        use: `rank ${spec.rank}, ${USE[spec.cast]}, ${spec.cost} chakra`,
        tag: spec.cast === 'reaction' ? 'reacción' : undefined,
        note: `Button "${s?.[1]}" (EN "${s?.[0]}"); no Spanish full name in the game, the tooltip shows the English one.${spec.cast === 'reaction' ? ' A reaction: not on the bar, offered when it can be used.' : ''}`,
      });
    }
  }
  for (const id of learnable) if (!used.has(id)) errors.push(`jutsu ${id} has an element (${JUTSU[id]?.element}) with no row`);

  const clanIds = new Set(Object.values(JUTSU).filter((j) => j.clan).map((j) => j.id));
  const listed = new Set<string>();
  for (const c of CLANS) {
    const tip = es(c.tip);
    for (const it of c.items) {
      if ('es' in it) {
        if (!tip.includes(it.es)) errors.push(`${it.es} is not named in ${c.tip}`);
        const tag = it.id === 'mirai_eye_of_tomorrow' ? 'pasiva (antes Visión del Futuro)' : 'pasiva, sin botón';
        out.push({ id: it.id, es: it.es, en: it.en, group: 'clans', row: c.row, use: 'passive', tag, note: it.note });
        continue;
      }
      const spec = JUTSU[it.id];
      if (!spec?.clan) {
        errors.push(`clan ability ${it.id} missing from src/battle/jutsu.ts`);
        continue;
      }
      listed.add(it.id);
      const s = short[it.id];
      out.push({
        id: it.id,
        es: spec.nameEs ?? spec.name,
        esButton: s && s[1] !== (spec.nameEs ?? spec.name) ? s[1] : undefined,
        en: spec.name,
        group: 'clans',
        row: c.row,
        use: `${USE[spec.cast]}, ${spec.cost} chakra`,
        tag: spec.cast === 'reaction' ? 'reacción' : undefined,
        note: spec.cast === 'reaction' ? 'A reaction: not on the bar, offered when it can be used.' : undefined,
      });
    }
  }
  for (const id of clanIds) if (!listed.has(id)) errors.push(`clan ability ${id} in src/battle/jutsu.ts is not in the list`);

  const ids = new Set<string>();
  for (const e of out) {
    if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
    ids.add(e.id);
  }
  for (const o of OWNER_ICONS) for (const id of [o.likely, ...o.alt]) if (!ids.has(id)) errors.push(`owner icon ${o.pos}: unknown ability ${id}`);
  if (errors.length) throw new Error(`ui-icons-list: the list disagrees with the game:\n  ${errors.join('\n  ')}`);
  return out;
}
