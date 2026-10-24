// Spanish for the English text the rules produce (src/rules stays in English): refusal reasons,
// event reasons, check names, notes and the moon's breakdown. Unknown text passes through as is.

import type { ShinobiClassType } from '../types/shinobi';
import { CAMP_ACTIVITIES } from '../data/campActivities';
import { getLang, Lang } from '../i18n';

/** Shinobi classes: full name and the short tag the cards show. */
export const CLASS_ES: Record<ShinobiClassType, { name: string; short: string }> = {
  'Ninjutsu Specialist': { name: 'Especialista en ninjutsu', short: 'Ninjutsu' },
  'Taijutsu Master': { name: 'Maestro de taijutsu', short: 'Taijutsu' },
  'Genjutsu Adept': { name: 'Adepto de genjutsu', short: 'Genjutsu' },
  'Medical Specialist': { name: 'Especialista médico', short: 'Médico' },
  'Bukijutsu Master': { name: 'Maestro de bukijutsu', short: 'Bukijutsu' },
};

/** The five elements (warding seals, elemental meditation). */
export const ELEMENT_ES: Record<string, string> = {
  Fire: 'Fuego',
  Water: 'Agua',
  Earth: 'Tierra',
  Wind: 'Viento',
  Lightning: 'Rayo',
};

const ACTIVITY_ES: Record<string, string> = Object.fromEntries(CAMP_ACTIVITIES.map((a) => [a.name, a.nameEs]));

const EXACT: Record<string, string> = {
  // refusals
  'Unknown ninja': 'Ninja desconocido',
  'Unknown target': 'Objetivo desconocido',
  'Cannot act': 'No puede actuar',
  'Chosen with the fire': 'Se elige con el fuego',
  'Camp only': 'Solo en campamento',
  'Needs a shrine': 'Necesita un santuario',
  'Refused (Breakdown)': 'Se niega (Quiebre)',
  'Already done tonight': 'Ya lo hizo esta noche',
  'Not enough incense': 'No le alcanza el incienso',
  'Too late: dinner is served': 'Muy tarde: la cena ya está servida',
  'Missing supplies': 'Faltan suministros',
  'No healing jutsu': 'Sin jutsu de curación',
  'Not enough chakra': 'No le alcanza el chakra',
  'Chakra sealed': 'Chakra sellado',
  'Choose another ninja': 'Elige a otro ninja',
  'Nothing to give': 'No tiene nada que dar',
  'No camp kit left': 'No queda equipo de campamento',
  'The fire is already chosen': 'El fuego ya está elegido',
  'Only a Mirai can make Katon fire': 'Solo un Mirai puede hacer fuego Katon',
  'A bonfire needs an extra camp kit or a Mirai': 'Una hoguera necesita otro equipo de campamento o un Mirai',
  'Choose the fire first': 'Primero elige el fuego',
  'Dinner is already served': 'La cena ya está servida',
  'Hot food needs a fire': 'La comida caliente necesita fuego',
  'A feast needs a successful hunt': 'El festín necesita una caza exitosa',
  'Not enough rations': 'No alcanzan las raciones',
  'Serve dinner first': 'Primero sirve la cena',
  'The night already passed': 'La noche ya pasó',
  'The night has not passed yet': 'La noche todavía no pasa',
  'It is already morning': 'Ya amaneció',
  'Already stopped in this zone': 'Ya hicieron una parada en esta zona',
  'No Hit Dice left': 'No quedan Dados de golpe',
  'No Chakra Dice left': 'No quedan Dados de chakra',
  'Fever: no HP back from rests': 'Fiebre: los descansos no devuelven PV',
  'Already at full HP': 'Ya tiene los PV al máximo',
  'Already at full chakra': 'Ya tiene el chakra al máximo',
  'Already did an activity at this stop': 'Ya hizo una actividad en esta parada',
  'No soldier pills left': 'No quedan píldoras de soldado',
  // reasons
  'Set up camp': 'Montar el campamento',
  Bonfire: 'Hoguera',
  Dinner: 'Cena',
  'No food': 'Sin comida',
  Ate: 'Comió',
  'Hot meal': 'Comida caliente',
  Feast: 'Festín',
  'A night without fire': 'Una noche sin fuego',
  'Cold night': 'Noche fría',
  Morning: 'Mañana',
  'A camp with food': 'Un campamento con comida',
  'Camped with an untreated wound': 'Acampó con una herida sin tratar',
  'Picked up the perimeter traps': 'Se recogieron las trampas del perímetro',
  'Hit Die': 'Dado de golpe',
  'Chakra Die': 'Dado de chakra',
  'Short stop': 'Parada corta',
  'badly treated: it leaves a scar': 'mal tratada: deja una cicatriz',
  'Bleeding on the road': 'Sangrado en el camino',
  'Left the zone': 'Salió de la zona',
  'Scouted the night before': 'Exploraron la noche anterior',
  'Lost in the ambush': 'Perdido en la emboscada',
  'In battle': 'En batalla',
  'Cut on the flank': 'Corte en el flanco',
  Venom: 'Veneno',
  Battle: 'Batalla',
  'Fell in battle': 'Cayó en batalla',
  'Dropped by a critical hit': 'Derribado por un golpe crítico',
  'Battle won': 'Batalla ganada',
  'Battle lost': 'Batalla perdida',
  'Soldier pill wore off': 'Se pasó el efecto de la píldora de soldado',
  'Too many soldier pills': 'Demasiadas píldoras de soldado',
  'Soldier pill': 'Píldora de soldado',
  'End of battle': 'Fin de la batalla',
  'Gates open closed': 'Se cerraron las puertas',
  'Stabilized by the party': 'Estabilizado por el grupo',
  'A natural 20 on a death save': 'Un 20 natural en una salvación contra la muerte',
  'Stable: wakes up later': 'Estable: despierta más tarde',
  'Woke up after the defeat': 'Despertó tras la derrota',
  'used against Tension': 'usado contra la Tensión',
  'Tension reached 10 again': 'La Tensión volvió a llegar a 10',
  'back to 5': 'vuelve a 5',
  Awakening: 'Despertar',
  Breakdown: 'Quiebre',
  'back at the village': 'de vuelta en la aldea',
  // checks
  'Hunt (Survival)': 'Cazar (Supervivencia)',
  'Field surgery (Medicine)': 'Cirugía de campaña (Medicina)',
  'Great hunt (natural 20)': 'Gran caza (20 natural)',
  'Field surgery (natural 20)': 'Cirugía de campaña (20 natural)',
  'WIS save at 10 Tension': 'Salvación de SAB con 10 de Tensión',
  // the moon's breakdown
  'Zone danger': 'Peligro de la zona',
  'No fire': 'Sin fuego',
  // notes
  'Short stop: 1 hour.': 'Parada corta: 1 hora.',
};

const act = (name: string): string | undefined => ACTIVITY_ES[name];

/** Text with a name or number in it. A function returning null means "not this one". */
const PATTERNS: [RegExp, (...m: string[]) => string | null][] = [
  [/^(.+) by (.+)$/, (a, who) => (act(a) ? `${act(a)}, por ${who}` : null)],
  [/^(.+) from (.+)$/, (a, who) => (act(a) ? `${act(a)}, por ${who}` : null)],
  [/^(.+) with (.+)$/, (a, who) => (act(a) ? `${act(a)} con ${who}` : null)],
  [/^Soldier pill for (.+)$/, (who) => `Píldora de soldado para ${who}`],
  [/^(\d+) h on the road$/, (h) => `${h} h de camino`],
  [/^(.+) refuses help \(Paranoia\)$/, (who) => `${who} rechaza la ayuda (Paranoia)`],
  [/^(.+) cannot act$/, (who) => `${who} no puede actuar`],
  [/^(.+) only$/, (x) => (x in CLASS_ES ? `Solo ${CLASS_ES[x as ShinobiClassType].name}` : `Solo ${x}`)],
  [/^(.+) scouted ahead: the traps of the next zone are revealed\.$/, (who) => `${who} exploró más adelante: las trampas de la siguiente zona quedan a la vista.`],
  [/^Bond between (.+) and (.+): (\d+)$/, (a, b, n) => `Lazo entre ${a} y ${b}: ${n}`],
  [/^(.+)'s Sharingan reveals genjutsu traps and disguised strangers nearby\.$/, (who) => `El Sharingan de ${who} revela trampas de genjutsu y desconocidos disfrazados cerca.`],
  [/^(.+) is in Breakdown and refuses to do (.+) tonight\.$/, (who, a) => `${who} está en Quiebre y esta noche se niega a una actividad: ${act(a) ?? a}.`],
  [/^(.+) lights the bonfire with Katon fire\.$/, (who) => `${who} enciende la hoguera con fuego Katon.`],
];

function toSpanish(s: string): string {
  const exact = EXACT[s] ?? act(s);
  if (exact) return exact;
  for (const [re, f] of PATTERNS) {
    const m = s.match(re);
    const out = m ? f(...m.slice(1)) : null;
    if (out) return out;
  }
  return s;
}

/** A string from the rules in the given language (the current one by default). */
export const ruleText = (s: string, lang: Lang = getLang()): string => (lang === 'es' && s ? toSpanish(s) : s);
