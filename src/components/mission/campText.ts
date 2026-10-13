// Strings for the camp: RestCamp.tsx and CampScene.tsx.

import type { SupplyId } from '../../types/mission';
import { strings } from '../../i18n';
import { ELEMENT_ES } from '../../game/ruleText';

export const T = strings({
  // steps
  stepFire: { en: 'Fire', es: 'Fuego' },
  stepActivities: { en: 'Activities', es: 'Actividades' },
  stepDinner: { en: 'Dinner', es: 'Cena' },
  stepNight: { en: 'Night', es: 'Noche' },
  stepMorning: { en: 'Morning', es: 'Mañana' },

  // activity options and costs
  optTag: { en: 'Explosive tag ({n})', es: 'Sello explosivo ({n})' },
  optWire: { en: 'Wire ({n})', es: 'Alambre ({n})' },
  optHp: { en: 'HP', es: 'PV' },
  optChakra: { en: 'Chakra', es: 'Chakra' },
  optPill: { en: 'Soldier pill', es: 'Píldora de soldado' },
  optAntidote: { en: 'Antidote', es: 'Antídoto' },
  optTagOne: { en: 'Explosive tag', es: 'Sello explosivo' },
  optWireRoll: { en: 'Wire roll', es: 'Rollo de alambre' },
  costOne: { en: '1 {item}', es: '1 {item}' },
  costOr: { en: ' or ', es: ' o ' },
  costJutsu: { en: '{n} chakra ({jutsu})', es: '{n} de chakra ({jutsu})' },
  costAnyJutsu: { en: 'a healing jutsu', es: 'un jutsu de curación' },
  costChakra: { en: '{n} chakra', es: '{n} de chakra' },
  chanceHunt: { en: 'Survival DC 12: {pct}', es: 'Supervivencia CD 12: {pct}' },
  chanceSurgery: { en: 'Medicine DC 13: {pct}', es: 'Medicina CD 13: {pct}' },
  needsAnother: { en: 'Needs another ninja', es: 'Necesita otro ninja' },

  // header and scene
  campHeader: { en: 'Camp {n} · {zone}', es: 'Campamento {n} · {zone}' },
  dangerAmbush: { en: 'Ambush!', es: '¡Emboscada!' },
  dangerQuiet: { en: 'A quiet night', es: 'Una noche tranquila' },
  dangerZone: { en: '{n} % in this zone', es: '{n} % en esta zona' },
  nightDanger: { en: 'Night danger', es: 'Peligro nocturno' },
  moonTitle: { en: 'Chance of an ambush tonight', es: 'Probabilidad de emboscada esta noche' },
  sticksLeft: { en: '{left} of {total} incense sticks left', es: 'Quedan {left} de {total} varitas de incienso' },
  select: { en: 'Select {name}', es: 'Elegir a {name}' },

  // activities
  sticksTonight: { en: 'Each ninja has {n} incense sticks tonight.', es: 'Cada ninja tiene {n} varitas de incienso esta noche.' },
  stick1: { en: '{n} incense stick', es: '{n} varita de incienso' },
  stickN: { en: '{n} incense sticks', es: '{n} varitas de incienso' },
  moonAfter: { en: 'Moon {now}% → {after}%', es: 'Luna {now}% → {after}%' },
  target: { en: 'Target', es: 'Objetivo' },
  self: { en: '{name} (self)', es: '{name} (uno mismo)' },
  option: { en: 'Option', es: 'Opción' },
  amount: { en: 'Amount', es: 'Cantidad' },
  keeps1Hp: { en: '(keeps at least 1 HP)', es: '(conserva al menos 1 PV)' },
  doIt1: { en: 'Do it · {n} stick', es: 'Hacerlo · {n} varita' },
  doItN: { en: 'Do it · {n} sticks', es: 'Hacerlo · {n} varitas' },
  activitiesEnd: {
    en: 'Activities end when dinner is served. Ninjas with sticks left can still act.',
    es: 'Las actividades terminan cuando se sirve la cena. Los ninjas a los que les quedan varitas todavía pueden actuar.',
  },
  goToDinner: { en: 'Go to dinner', es: 'Ir a cenar' },

  // ambush, morning
  ambush: { en: 'Ambush! Raiders come out of the dark.', es: '¡Emboscada! Unos asaltantes salen de la oscuridad.' },
  awake: { en: 'awake and ready', es: 'despierto y listo' },
  surprised: { en: 'surprised', es: 'sorprendido' },
  bellsRang: { en: 'The bells rang: nobody starts surprised.', es: 'Sonaron las campanas: nadie empieza sorprendido.' },
  trapsSet: { en: 'Perimeter traps set: {list}.', es: 'Trampas en el perímetro: {list}.' },
  trapTag: { en: 'explosive tag', es: 'sello explosivo' },
  trapWire: { en: 'wire', es: 'alambre' },
  ambushPrototype: {
    en: "Prototype: the current battle screen doesn't play surprise or the perimeter traps yet; they arrive with the new battle engine. The night is interrupted, so the morning gives half.",
    es: 'Prototipo: la pantalla de batalla actual todavía no aplica la sorpresa ni las trampas del perímetro; llegarán con el nuevo motor de batalla. La noche queda interrumpida, así que la mañana da la mitad.',
  },
  defend: { en: 'Defend the camp', es: 'Defender el campamento' },
  quietNight: { en: 'The night passed quietly. The fire is down to embers and the sky turns grey.', es: 'La noche pasó tranquila. El fuego quedó en brasas y el cielo empieza a clarear.' },
  wakeUp: { en: 'Wake up', es: 'Despertar' },
  morning: { en: 'Morning', es: 'Mañana' },
  morningText: {
    en: 'Half of max HP and chakra came back{interrupted}, plus half of the spent dice. Effects gained before this camp that last until a camp are gone.',
    es: 'Volvió la mitad de los PV y del chakra máximos{interrupted}, más la mitad de los dados gastados. Los efectos obtenidos antes de este campamento que duraban hasta un campamento se terminaron.',
  },
  morningHalved: { en: ' (halved again by the interrupted night)', es: ' (otra vez a la mitad por la noche interrumpida)' },
  breakCamp: { en: 'Break camp and go on', es: 'Levantar el campamento y seguir' },
  tonight: { en: 'Tonight', es: 'Esta noche' },

  // fire
  fireFirst: { en: 'The fire comes first.', es: 'Primero, el fuego.' },
  fireWhy: { en: ' It decides what dinner can be and how far the camp can be seen.', es: ' Decide qué se puede cenar y desde qué tan lejos se ve el campamento.' },
  noFire: { en: 'No fire', es: 'Sin fuego' },
  coldFood: { en: 'Cold food only', es: 'Solo comida fría' },
  tensionUpAll: { en: '+1 Tension to everyone', es: '+1 de Tensión para todos' },
  coldZone: { en: 'Cold zone: Numb', es: 'Zona fría: Entumecido' },
  moonPreview: { en: 'Moon → {n}%', es: 'Luna → {n}%' },
  stayDark: { en: 'Stay dark', es: 'Quedarse a oscuras' },
  lowFire: { en: 'Low fire', es: 'Fuego bajo' },
  inKit: { en: 'Included in the camp kit', es: 'Incluido en el equipo de campamento' },
  hotMealOk: { en: 'Allows a hot meal', es: 'Permite una comida caliente' },
  lightLow: { en: 'Light a low fire', es: 'Encender un fuego bajo' },
  bonfire: { en: 'Bonfire', es: 'Hoguera' },
  tensionDownAll: { en: '−1 Tension to everyone', es: '−1 de Tensión para todos' },
  bonfireNeeds: { en: "Needs an extra camp kit, or a Mirai's Katon fire (1 stick)", es: 'Necesita otro equipo de campamento, o el fuego Katon de un Mirai (1 varita)' },
  useKit: { en: 'Use a camp kit ({n} left)', es: 'Usar un equipo de campamento (quedan {n})' },
  katonBy: { en: 'Katon fire by {name}', es: 'Fuego Katon de {name}' },

  // food
  foodNone: { en: 'No food', es: 'Sin comida' },
  foodNone1: { en: '+1 Exhaustion', es: '+1 de Agotamiento' },
  foodNone2: { en: '+2 Tension', es: '+2 de Tensión' },
  foodNone3: { en: 'Hungry', es: 'Hambriento' },
  foodDry: { en: 'Dry ration', es: 'Ración seca' },
  foodDry1: { en: '1 ration each', es: '1 ración por cabeza' },
  foodDry2: { en: 'No effect', es: 'Sin efecto' },
  foodHot: { en: 'Hot meal', es: 'Comida caliente' },
  foodHot1: { en: '1 ration each, needs fire', es: '1 ración por cabeza, necesita fuego' },
  foodHot2: { en: '−1 Tension', es: '−1 de Tensión' },
  foodHot3: { en: '1 more Hit Die back in the morning', es: '1 Dado de golpe más de vuelta en la mañana' },
  foodFeast: { en: 'Feast', es: 'Festín' },
  foodFeast1: { en: '1 ration each, needs fire and a good hunt', es: '1 ración por cabeza, necesita fuego y una buena caza' },
  foodFeast2: { en: '−2 Tension', es: '−2 de Tensión' },
  foodFeast3: { en: 'Well fed', es: 'Bien alimentado' },
  dinner: { en: 'Dinner', es: 'La cena' },
  dinnerText: { en: ' is one choice for the whole party. {rations} rations left for {n} ninjas.', es: ' es una sola elección para todo el grupo. Quedan {rations} raciones para {n} ninjas.' },
  backToActivities: { en: 'Back to activities', es: 'Volver a las actividades' },

  // night
  night: { en: 'Night', es: 'Noche' },
  onWatch: { en: 'On watch: {list}', es: 'De guardia: {list}' },
  nobody: { en: 'nobody', es: 'nadie' },
  bells: { en: 'Bells: {bells} · Perimeter traps: {traps}', es: 'Campanas: {bells} · Trampas en el perímetro: {traps}' },
  yes: { en: 'yes', es: 'sí' },
  no: { en: 'no', es: 'no' },
  none: { en: 'none', es: 'ninguna' },
  noRandomness: {
    en: "No-randomness mode: the ambush comes when the camps' % add up to 100 ({counter} so far, +{chance} tonight).",
    es: 'Modo sin azar: la emboscada llega cuando los % de los campamentos suman 100 (van {counter}, +{chance} esta noche).',
  },
  sleep: { en: 'Sleep', es: 'Dormir' },
});

/** One of a supply, for costs ("1 bandage"). */
export const ONE: Record<SupplyId, { en: string; es: string }> = {
  rations: { en: 'ration', es: 'ración' },
  campKits: { en: 'camp kit', es: 'equipo de campamento' },
  bandages: { en: 'bandage', es: 'venda' },
  antidotes: { en: 'antidote', es: 'antídoto' },
  soldierPills: { en: 'soldier pill', es: 'píldora de soldado' },
  explosiveTags: { en: 'explosive tag', es: 'sello explosivo' },
  wireRolls: { en: 'wire roll', es: 'rollo de alambre' },
};

/** Spanish for the option keys a done activity keeps (the English screen shows the key itself). */
export const OPTION_ES: Record<string, string> = {
  tag: 'sello explosivo',
  wire: 'alambre',
  hp: 'PV',
  chakra: 'chakra',
  pill: 'píldora de soldado',
  antidote: 'antídoto',
  ...ELEMENT_ES,
};
