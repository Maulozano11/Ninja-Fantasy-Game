// Missions for the road prototype (docs/MISSION_DESIGN.md, Mission flow): zones of road nodes,
// the battles they hold, where the party can camp, and the companions who can join.

import type { ArmorStyleType, ShinobiCharacter, WeatherType } from '../types/shinobi';
import type { Supplies } from '../types/mission';
import type { CampSite } from '../rules/rest';
import type { SpriteAppearance } from '../sprite/types';
import { getItem } from '../sprite/catalog';
import { deriveStats } from '../rules/derived';
import { LEGENDARY_PRESETS } from './shinobiData';
import type { EncounterId } from '../battle/encounters';

/** Enemy groups the current battle screen knows. */
export type LegacyEnemyType = 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';

export interface MissionBattle {
  title: string;
  titleEs?: string;
  description: string;
  descriptionEs?: string;
  enemyType: LegacyEnemyType;
  weather: WeatherType;
  /** How hard the fight is on the ninjas holding the flanks off-screen (prototype; 1 = a squad). */
  threat: number;
  /** A venomous enemy: the flanks may come back Poisoned. */
  venom?: boolean;
  /** The party battle on the map (src/battle/encounters.ts). */
  encounter: EncounterId;
}

interface NodeBase {
  id: string;
  name: string;
  nameEs?: string;
  /** Hours the leg to this node takes. */
  hours: number;
  /** What the party finds, shown when it arrives. */
  text: string;
  textEs?: string;
}

export type RoadNode =
  | (NodeBase & { kind: 'battle'; battle: MissionBattle; objective?: boolean })
  | (NodeBase & { kind: 'camp'; site: Omit<CampSite, 'nodeId' | 'zoneDanger'> });

export interface MissionZone {
  name: string;
  nameEs?: string;
  terrain: string;
  terrainEs?: string;
  /** Base night danger in %, shown as the moon. */
  danger: number;
  nodes: RoadNode[];
}

export interface MissionDef {
  id: string;
  name: string;
  nameEs?: string;
  rank: 'D' | 'C' | 'B' | 'A' | 'S';
  brief: string;
  briefEs?: string;
  zones: MissionZone[];
  /** The night ambush on this mission's camps. */
  ambush: MissionBattle;
  deadlineHours?: number;
  supplies?: Partial<Supplies>;
}

export const RIVER_FOREST_PATROL: MissionDef = {
  id: 'river_forest_patrol',
  name: 'River Forest Patrol',
  nameEs: 'Patrulla del bosque del río',
  rank: 'C',
  brief:
    'Boats keep vanishing at the river ford and the villagers have stopped crossing. Walk the cedar road to the ford, clear whatever waits there and find out what is taking the boats.',
  briefEs:
    'Las barcas siguen desapareciendo en el vado del río y los aldeanos ya no se atreven a cruzar. Recorran el camino de los cedros hasta el vado, despejen lo que los espere allí y descubran qué se está llevando las barcas.',
  zones: [
    {
      name: 'Cedar Road',
      nameEs: 'Camino de los cedros',
      terrain: 'Forest',
      terrainEs: 'Bosque',
      danger: 25,
      nodes: [
        {
          id: 'cedar_rogues',
          kind: 'battle',
          name: 'Rogues on the Cedar Road',
          nameEs: 'Renegados en el camino de los cedros',
          hours: 3,
          text: 'Two rogue ninja drop from the cedars and block the road. They have been robbing travellers for weeks.',
          textEs: 'Dos ninjas renegados saltan de los cedros y cierran el paso. Llevan semanas asaltando a los viajeros.',
          battle: {
            title: 'Rogues on the Cedar Road',
            titleEs: 'Renegados en el camino de los cedros',
            description: 'Drive them off before they call for more.',
            descriptionEs: 'Ahuyéntenlos antes de que llamen a más.',
            enemyType: 'rogue_squad',
            weather: 'Clear',
            threat: 1,
            encounter: 'cedar_rogues',
          },
        },
      ],
    },
    {
      name: 'River Ford',
      nameEs: 'Vado del río',
      terrain: 'River',
      terrainEs: 'Río',
      danger: 30,
      nodes: [
        {
          id: 'ford_skirmish',
          kind: 'battle',
          name: 'Fight at the Ford',
          nameEs: 'Pelea en el vado',
          hours: 2,
          text: 'Rain hammers the gorge. A hunter-nin and his partner guard the stepping stones, and they are not fishermen.',
          textEs: 'La lluvia azota el desfiladero. Un ninja cazador y su compañero vigilan las piedras del paso, y no son pescadores.',
          battle: {
            title: 'Valley Ford Skirmish',
            titleEs: 'Escaramuza en el vado del valle',
            description: 'Break through to the far bank.',
            descriptionEs: 'Ábranse paso hasta la otra orilla.',
            enemyType: 'skirmish',
            weather: 'Downpour',
            threat: 1.1,
            encounter: 'river_patrol',
          },
        },
        {
          id: 'shrine_clearing',
          kind: 'camp',
          name: 'Shrine Clearing',
          nameEs: 'Claro del santuario',
          hours: 2,
          text: 'A quiet clearing above the river with a small roadside shrine and an old stone lantern. Something big moves in the water below.',
          textEs: 'Un claro tranquilo sobre el río, con un pequeño santuario junto al camino y una vieja linterna de piedra. Algo grande se mueve en el agua, allá abajo.',
          site: { shrine: true },
        },
        {
          id: 'hydra_den',
          kind: 'battle',
          name: 'The Hydra of the Ford',
          nameEs: 'La hidra del vado',
          hours: 2,
          objective: true,
          text: 'The boats lie smashed in a cave by the water. Their wood is crushed by teeth. The hydra wakes.',
          textEs: 'Las barcas yacen destrozadas en una cueva junto al agua, con la madera triturada a dentelladas. La hidra despierta.',
          battle: {
            title: 'The Hydra of the Ford',
            titleEs: 'La hidra del vado',
            description: 'Kill the hydra and the river is safe again. Its bite is venomous.',
            descriptionEs: 'Maten a la hidra y el río volverá a ser seguro. Su mordida es venenosa.',
            enemyType: 'giant_beast',
            weather: 'Clear',
            threat: 1.3,
            venom: true,
            encounter: 'hydra',
          },
        },
      ],
    },
  ],
  ambush: {
    title: 'Night Raid on the Camp',
    titleEs: 'Asalto nocturno al campamento',
    description: 'Raiders come out of the dark from the edges of the clearing. Hold the camp.',
    descriptionEs: 'Los asaltantes salen de la oscuridad desde los bordes del claro. Defiendan el campamento.',
    enemyType: 'rogue_squad',
    weather: 'Clear',
    threat: 1,
    encounter: 'night_raid',
  },
};

export const MISSIONS: MissionDef[] = [RIVER_FOREST_PATROL];

/** Where a road node is: its zone and its place in the zone. */
export interface RoadPos {
  zone: number;
  node: number;
}

export const nodeAt = (m: MissionDef, pos: RoadPos): RoadNode | undefined => m.zones[pos.zone]?.nodes[pos.node];

/** The node after `pos`, or null at the end of the road. */
export function nextPos(m: MissionDef, pos: RoadPos): RoadPos | null {
  if (pos.node + 1 < (m.zones[pos.zone]?.nodes.length ?? 0)) return { zone: pos.zone, node: pos.node + 1 };
  if (pos.zone + 1 < m.zones.length) return { zone: pos.zone + 1, node: 0 };
  return null;
}

// --- companions ----------------------------------------------------------------------------

const look = (o: Partial<SpriteAppearance>): SpriteAppearance => ({
  version: 1,
  body: 'male',
  skin: '#f2c7a0',
  eyeShape: 'standard',
  eyeColor: '#3b82f6',
  slots: {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
  pixelEdits: [],
  ...o,
});

const item = (id: string, ...colors: string[]) => ({ id, colors });

/** A full sheet from a build: legacy look fields from a preset, derived stats from the build. */
function companion(base: ShinobiCharacter, c: Pick<ShinobiCharacter, 'id' | 'name' | 'title' | 'level' | 'clan' | 'shinobiClass' | 'stats' | 'selectedFeats' | 'selectedJutsus' | 'appearance'>): ShinobiCharacter {
  const armorStyle = ((c.appearance?.slots.armor && getItem(c.appearance.slots.armor.id)?.statsArmor) || 'Ronin Wanderer Cloak') as ArmorStyleType;
  const d = deriveStats({ level: c.level, stats: c.stats, clan: c.clan, shinobiClass: c.shinobiClass, armor: armorStyle, feats: c.selectedFeats });
  return { ...base, ...c, dojutsu: 'None', armorStyle, ...d, currentHp: d.maxHp, currentChakra: d.maxChakra };
}

const presetById = (id: string): ShinobiCharacter => (LEGENDARY_PRESETS.find((p) => p.character.id === id) ?? LEGENDARY_PRESETS[0]).character;

/** A field medic, so camps can heal with jutsu and operate. */
export const HANA: ShinobiCharacter = companion(presetById('preset_gentle'), {
  id: 'companion_hana',
  name: 'Hana',
  title: 'The Field Medic',
  level: 4,
  clan: 'Akkai',
  shinobiClass: 'Medical Specialist',
  stats: { str: 10, dex: 14, con: 14, int: 13, wis: 17, cha: 12 },
  selectedFeats: ['chakra_prodigy'],
  selectedJutsus: {
    slot1Utility: 'mystical_palm',
    slot2Elemental: 'water_shield_suijinheki',
    slot3Elemental: 'water_dragon_suiryuudan',
    slot4Clan: 'adamantine_sealing_chains',
    slot5Ultimate: 'yasaka_magatama',
  },
  appearance: look({
    body: 'female',
    skin: '#f6d3b8',
    eyeShape: 'calm',
    eyeColor: '#2f8f6a',
    slots: {
      hair: item('hair_pony', '#4a2f22'),
      top: item('top_kimono', '#e8eee8', '#2f7d5b'),
      bottom: item('bottom_leggings', '#26323a', '#2f7d5b'),
      waist: item('waist_pouches', '#6b4f2e', '#3b2c1c', '#c9a46c'),
      feet: item('feet_sandals', '#26323a', '#c9a46c'),
      held: item('held_palm', '#7ef0b8'),
    },
    headband: { position: 'forehead', slashed: false, tails: true, emblem: 'wave', cloth: '#2f7d5b', plate: '#cbd5e1' },
    chakra: { color: 'green', onCharge: true, onCast: true, onVictory: false },
  }),
});

/** A genjutsu adept from the Uddo, for calm nights and wood shelters. */
export const KENJI: ShinobiCharacter = companion(presetById('preset_storm'), {
  id: 'companion_kenji',
  name: 'Kenji',
  title: 'The Dream Weaver',
  level: 4,
  clan: 'Uddo',
  shinobiClass: 'Genjutsu Adept',
  stats: { str: 10, dex: 14, con: 13, int: 14, wis: 13, cha: 17 },
  selectedFeats: ['chakra_prodigy'],
  selectedJutsus: {
    slot1Utility: 'substitution_kawarimi',
    slot2Elemental: 'temple_of_nirvana',
    slot3Elemental: 'earth_wall_doryuheki',
    slot4Clan: 'wood_dragon_jutsu',
    slot5Ultimate: 'wood_golem_titan',
  },
  appearance: look({
    body: 'male',
    skin: '#e8b98f',
    eyeShape: 'piercing',
    eyeColor: '#8b5cf6',
    slots: {
      hair: item('hair_lowtail', '#1c1830'),
      top: item('top_highcollar', '#3b2f5c', '#1c1830'),
      bottom: item('bottom_hakama', '#1c1830', '#3b2f5c'),
      waist: item('waist_rope', '#c9a46c', '#8a6a3a'),
      feet: item('feet_shinobi', '#1c1830', '#3b2f5c'),
      cape: item('cape_haori', '#6d4fa3', '#1c1830', '#c9a46c'),
    },
    headband: { position: 'arm', slashed: false, tails: false, emblem: 'spiral', cloth: '#3b2f5c', plate: '#cbd5e1' },
    chakra: { color: 'violet', onCharge: true, onCast: true, onVictory: false },
  }),
});

/** Who can join a mission: the two prototype companions, then the legendary presets. */
export const COMPANIONS: ShinobiCharacter[] = [HANA, KENJI, ...LEGENDARY_PRESETS.map((p) => p.character)];
