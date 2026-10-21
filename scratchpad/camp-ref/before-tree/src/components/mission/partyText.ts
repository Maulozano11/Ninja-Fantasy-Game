// Strings for PartyPanel.tsx (member cards, effects, supplies and the log boxes).

import type { EffectId } from '../../types/mission';
import { strings } from '../../i18n';

export const T = strings({
  hp: { en: 'HP', es: 'PV' },
  ck: { en: 'CK', es: 'CK' },
  rounds1: { en: '{n} round', es: '{n} ronda' },
  roundsN: { en: '{n} rounds', es: '{n} rondas' },
  battles1: { en: '{n} battle', es: '{n} batalla' },
  battlesN: { en: '{n} battles', es: '{n} batallas' },
  thisZone: { en: 'this zone', es: 'esta zona' },
  untilCamp: { en: 'until the next camp', es: 'hasta el siguiente campamento' },
  untilTreated: { en: 'until treated', es: 'hasta que lo traten' },
  thisMission: { en: 'this mission', es: 'esta misión' },
  permanent: { en: 'permanent', es: 'permanente' },
  tensionTitle: {
    en: 'Tension {value}/10: at 10, a WIS save decides between a Breakdown and an Awakening',
    es: 'Tensión {value}/10: al llegar a 10, una salvación de SAB decide entre un Quiebre y un Despertar',
  },
  missionLeader: { en: 'Mission leader', es: 'Líder de la misión' },
  levelLine: { en: 'Lv {level} · {clan} · {cls}', es: 'Nv {level} · {clan} · {cls}' },
  ten: { en: 'TEN', es: 'TEN' },
  exh: { en: 'EXH {n}', es: 'AGO {n}' },
  exhTitle: { en: 'Exhaustion: −2 to every d20 roll per level; 6 knocks the ninja out', es: 'Agotamiento: −2 a cada tirada de d20 por nivel; con 6 el ninja queda inconsciente' },
  diceTitle: { en: 'Hit Dice and Chakra Dice left (spent at a short stop)', es: 'Dados de golpe y Dados de chakra que quedan (se gastan en una parada corta)' },
  dice: { en: 'HD {hd}/{level} · CD {cd}/{level}', es: 'DG {hd}/{level} · DCK {cd}/{level}' },
  died: { en: '{name} died on this mission.', es: '{name} murió en esta misión.' },
  backpack: { en: 'Backpack', es: 'Mochila' },
  whatHappened: { en: 'What happened', es: 'Lo que pasó' },
});

/** Spanish descriptions of the effects (the English ones live in src/rules/effects.ts). */
export const EFFECT_DESC_ES: Record<EffectId, string> = {
  well_fed: '+5 PV temporales al inicio de cada batalla.',
  sharpened: '+2 de daño en ataques con armas cuerpo a cuerpo.',
  centered_chakra: 'El primer jutsu de cada batalla cuesta 3 de chakra menos.',
  watchful: 'No puede ser sorprendido, +2 a la iniciativa.',
  open_eyes: 'Las trampas de esta zona quedan a la vista.',
  hidden_in_mist: 'Ventaja en Sigilo.',
  gates_open: '+1d8 de daño de taijutsu y más movimiento; +1 de Agotamiento al terminar.',
  shrine_blessing: 'Ventaja en la próxima salvación de SAB al llegar a 10 de Tensión.',
  warding_seal: 'Resistencia a un elemento.',
  wood_skin: '+5 PV temporales al inicio de cada batalla.',
  comrades_bond: '+1 a la CA a 3 m o menos del compañero de lazo.',
  encouraged: 'La próxima Tensión que reciba es 1 menos; después se pierde.',
  will_of_fire: 'Despertar: +2 a las salvaciones, inmune al miedo.',
  bleeding: '1d4 de daño por ronda en batalla y por tramo de camino.',
  burning: '1d6 por ronda; el agua o una acción lo apagan.',
  chakra_sealed: 'No puede lanzar jutsus.',
  confused: 'Cada turno, 1 probabilidad entre 4 de perder la acción por la ilusión.',
  marked: 'Visible aunque esté oculto.',
  poisoned: 'Desventaja en ataques y pruebas.',
  wounded_leg: '−3 m de velocidad.',
  numb: '−2 a las tiradas de DES.',
  hungry: 'Desventaja en salvaciones de CON; comer lo quita.',
  crash: '−2 a todas las tiradas (después de una píldora de soldado).',
  fever: 'Los descansos no devuelven PV.',
  fall_aftermath: '−2 a la CA, salvaciones contra la muerte con desventaja.',
  shrine_curse: '−1 a todas las salvaciones.',
  breakdown: 'Pánico, Paranoia, Furia ciega o Desesperación hasta volver a la aldea.',
  grave_wound: '−10 % de PV máximos; si se trata mal, deja una cicatriz.',
};
