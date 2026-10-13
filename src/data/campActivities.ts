// Camp activities from docs/MISSION_DESIGN.md. Each ninja has 3 incense sticks per camp; every
// activity costs sticks and sometimes chakra or supplies. The rules are in src/rules/rest.ts.

import type { ClanType, ShinobiClassType } from '../types/shinobi';
import type { SupplyId } from '../types/mission';

export type ActivityId =
  | 'hunt'
  | 'bandage'
  | 'heal_jutsu'
  | 'meditate'
  | 'sharpen'
  | 'train_jutsu'
  | 'keep_watch'
  | 'perimeter_trap'
  | 'bell_wire'
  | 'scout'
  | 'pray'
  | 'fireside_talk'
  | 'encourage'
  | 'sharingan_reading'
  | 'katon_fire'
  | 'wood_shelter'
  | 'shared_vitality'
  | 'wood_skin'
  | 'seal_barrier'
  | 'seal_poison'
  | 'warding_seal'
  | 'byakugan_watch'
  | 'close_tenketsu'
  | 'field_surgery'
  | 'make_pills'
  | 'stretching'
  | 'peaceful_sleep'
  | 'camp_illusion'
  | 'make_materials'
  | 'elemental_meditation';

export interface CampActivity {
  id: ActivityId;
  name: string;
  nameEs: string;
  sticks: number;
  /** Supplies it uses; with two listed, one of them (chosen when doing it). */
  supplies?: SupplyId[];
  /** Extra chakra: a jutsu's own cost, or a quarter of max chakra. */
  chakra?: 'jutsu' | 'quarterMax';
  requires?: { clan?: ClanType; shinobiClass?: ShinobiClassType; shrine?: boolean };
  /** Who it is done to: nobody in particular, oneself, any party member, or another party member. */
  target: 'none' | 'self' | 'any' | 'other';
  /** Change to the night ambush %; counted once per camp even if several ninjas do it. */
  ambush?: { add?: number; halve?: boolean; zero?: boolean };
  /** Allowed at a short stop too (only activities that heal HP by spending something). */
  atStop?: boolean;
  /** Only through the fire vote (the Mirai's Katon fire). */
  viaFire?: boolean;
  description: string;
  descriptionEs: string;
}

const a = (x: CampActivity): CampActivity => x;

export const CAMP_ACTIVITIES: CampActivity[] = [
  a({ id: 'hunt', name: 'Hunt or fish', nameEs: 'Cazar o pescar', sticks: 2, target: 'none', description: 'Survival check (WIS, DC 12); success allows the feast.', descriptionEs: 'Prueba de Supervivencia (SAB, CD 12): si sale, se puede elegir el festín.' }),
  a({ id: 'bandage', name: 'Bandage', nameEs: 'Vendar', sticks: 1, supplies: ['bandages'], target: 'any', atStop: true, description: 'Heals 1d8 + WIS and removes Bleeding.', descriptionEs: 'Cura 1d8 + SAB y quita Sangrando.' }),
  a({ id: 'heal_jutsu', name: 'Heal with jutsu', nameEs: 'Curar con jutsu', sticks: 1, chakra: 'jutsu', target: 'any', atStop: true, description: 'Casts a healing jutsu out of battle, paying its chakra.', descriptionEs: 'Lanza un jutsu de curación fuera de batalla, pagando su chakra.' }),
  a({ id: 'meditate', name: 'Meditate', nameEs: 'Meditar', sticks: 2, target: 'self', description: '+25 % of max chakra.', descriptionEs: '+25 % del chakra máximo.' }),
  a({ id: 'sharpen', name: 'Sharpen blades', nameEs: 'Afilar hojas', sticks: 1, target: 'self', description: 'Sharpened: +2 melee weapon damage for 3 battles.', descriptionEs: 'Hoja afilada: +2 de daño cuerpo a cuerpo durante 3 batallas.' }),
  a({ id: 'train_jutsu', name: 'Train a jutsu', nameEs: 'Entrenar un jutsu', sticks: 2, target: 'self', description: 'Centered chakra: the first jutsu of each battle costs 3 less.', descriptionEs: 'Chakra centrado: el primer jutsu de cada batalla cuesta 3 menos.' }),
  a({ id: 'keep_watch', name: 'Keep watch', nameEs: 'Hacer guardia', sticks: 2, target: 'self', ambush: { halve: true }, description: 'Halves the ambush %; the guard gets Watchful.', descriptionEs: 'La emboscada baja a la mitad; quien vigila recibe Guardia atenta.' }),
  a({ id: 'perimeter_trap', name: 'Perimeter trap', nameEs: 'Trampa en el perímetro', sticks: 2, supplies: ['explosiveTags', 'wireRolls'], target: 'none', description: 'If ambushed, the trap is on the map.', descriptionEs: 'Si hay emboscada, la trampa está puesta en el mapa.' }),
  a({ id: 'bell_wire', name: 'Wire with bells', nameEs: 'Alambre con campanas', sticks: 1, supplies: ['wireRolls'], target: 'none', description: 'If ambushed, nobody starts surprised.', descriptionEs: 'Si hay emboscada, nadie empieza sorprendido.' }),
  a({ id: 'scout', name: 'Scout', nameEs: 'Explorar', sticks: 2, target: 'none', description: 'Reveals the traps of the next zone.', descriptionEs: 'Revela las trampas de la siguiente zona.' }),
  a({ id: 'pray', name: 'Pray at a shrine', nameEs: 'Rezar en un santuario', sticks: 1, requires: { shrine: true }, target: 'self', description: '−2 Tension (only where there is a shrine).', descriptionEs: '−2 de Tensión (solo si hay santuario).' }),
  a({ id: 'fireside_talk', name: 'Fireside talk', nameEs: 'Charla junto al fuego', sticks: 1, target: 'other', description: '−1 Tension to another ninja and +1 Bond between the two.', descriptionEs: '−1 de Tensión a otro ninja y +1 de Lazo entre los dos.' }),
  a({ id: 'encourage', name: 'Encourage', nameEs: 'Dar ánimo', sticks: 1, target: 'other', description: 'Encouraged: the next Tension gain is 1 lower.', descriptionEs: 'Ánimo: la próxima Tensión que reciba es 1 menos.' }),

  a({ id: 'sharingan_reading', name: 'Sharingan reading', nameEs: 'Lectura del Sharingan', sticks: 1, requires: { clan: 'Mirai' }, target: 'none', description: 'Reveals genjutsu traps and disguised NPCs.', descriptionEs: 'Revela trampas de genjutsu y PNJ disfrazados.' }),
  a({ id: 'katon_fire', name: 'Katon fire', nameEs: 'Fuego Katon', sticks: 1, requires: { clan: 'Mirai' }, target: 'none', viaFire: true, description: 'Makes the bonfire without a kit (committed when the fire is voted).', descriptionEs: 'Hace la hoguera sin gastar kit (se compromete al votar el fuego).' }),
  a({ id: 'wood_shelter', name: 'Wood shelter', nameEs: 'Refugio de madera', sticks: 2, requires: { clan: 'Uddo' }, target: 'none', ambush: { add: -15 }, description: '−15 % ambush, shelter from the weather.', descriptionEs: '−15 % de emboscada y protege del clima.' }),
  a({ id: 'shared_vitality', name: 'Shared vitality', nameEs: 'Vitalidad compartida', sticks: 1, requires: { clan: 'Uddo' }, target: 'other', description: 'Gives own HP or chakra to an ally.', descriptionEs: 'Da PG o chakra propios a un aliado.' }),
  a({ id: 'wood_skin', name: 'Wood skin', nameEs: 'Piel de madera', sticks: 1, requires: { clan: 'Uddo' }, target: 'any', description: 'Wood skin: +5 temporary HP for 2 battles.', descriptionEs: 'Piel de madera: +5 PG temporales durante 2 batallas.' }),
  a({ id: 'seal_barrier', name: 'Seal barrier', nameEs: 'Barrera de sellos', sticks: 1, chakra: 'quarterMax', requires: { clan: 'Akkai' }, target: 'none', ambush: { add: -20 }, description: '−20 % ambush, paid with a quarter of max chakra.', descriptionEs: '−20 % de emboscada, pagando un cuarto del chakra máximo.' }),
  a({ id: 'seal_poison', name: 'Seal poison', nameEs: 'Sellar veneno', sticks: 1, requires: { clan: 'Akkai' }, target: 'any', description: 'Removes Poisoned or a curse.', descriptionEs: 'Quita Envenenado o una maldición.' }),
  a({ id: 'warding_seal', name: 'Warding seal', nameEs: 'Sello protector', sticks: 1, requires: { clan: 'Akkai' }, target: 'any', description: 'Resistance to one element until the next camp.', descriptionEs: 'Resistencia a un elemento hasta el siguiente campamento.' }),
  a({ id: 'byakugan_watch', name: 'Byakugan watch', nameEs: 'Guardia del Byakugan', sticks: 3, requires: { clan: 'Taki' }, target: 'self', ambush: { zero: true }, description: 'Ambush 0 %.', descriptionEs: 'Emboscada al 0 %.' }),
  a({ id: 'close_tenketsu', name: 'Close tenketsu', nameEs: 'Cerrar tenketsu', sticks: 1, requires: { clan: 'Taki' }, target: 'any', description: 'Removes Bleeding.', descriptionEs: 'Quita Sangrando.' }),

  a({ id: 'field_surgery', name: 'Field surgery', nameEs: 'Cirugía de campaña', sticks: 2, requires: { shinobiClass: 'Medical Specialist' }, target: 'any', description: 'Medicine check (DC 13): removes Grave wound and cures Fever; a failed check turns the wound into a scar.', descriptionEs: 'Prueba de Medicina (CD 13): quita Herida grave y cura la Fiebre; si falla, la herida deja una cicatriz.' }),
  a({ id: 'make_pills', name: 'Make pills', nameEs: 'Preparar píldoras', sticks: 2, requires: { shinobiClass: 'Medical Specialist' }, target: 'none', description: '1 soldier pill or 1 antidote.', descriptionEs: '1 píldora de soldado o 1 antídoto.' }),
  a({ id: 'stretching', name: 'Stretching', nameEs: 'Estiramientos', sticks: 1, requires: { shinobiClass: 'Taijutsu Master' }, target: 'self', description: '−1 Exhaustion.', descriptionEs: '−1 de Agotamiento.' }),
  a({ id: 'peaceful_sleep', name: 'Peaceful sleep', nameEs: 'Sueño apacible', sticks: 2, requires: { shinobiClass: 'Genjutsu Adept' }, target: 'any', description: '−3 Tension.', descriptionEs: '−3 de Tensión.' }),
  a({ id: 'camp_illusion', name: 'Camp illusion', nameEs: 'Ilusión de campamento', sticks: 2, requires: { shinobiClass: 'Genjutsu Adept' }, target: 'none', ambush: { add: -15 }, description: '−15 % ambush.', descriptionEs: '−15 % de emboscada.' }),
  a({ id: 'make_materials', name: 'Make materials', nameEs: 'Fabricar material', sticks: 1, requires: { shinobiClass: 'Bukijutsu Master' }, target: 'none', description: '1 explosive tag or 1 wire roll.', descriptionEs: '1 sello explosivo o 1 rollo de alambre.' }),
  a({ id: 'elemental_meditation', name: 'Elemental meditation', nameEs: 'Meditación elemental', sticks: 2, requires: { shinobiClass: 'Ninjutsu Specialist' }, target: 'self', description: 'Like Meditate, plus resistance to one element until the next camp.', descriptionEs: 'Como Meditar, y resistencia a un elemento hasta el siguiente campamento.' }),
];

export const ACTIVITY = Object.fromEntries(CAMP_ACTIVITIES.map((x) => [x.id, x])) as Record<ActivityId, CampActivity>;

/** Incense sticks each ninja has per camp. */
export const STICKS_PER_CAMP = 3;
