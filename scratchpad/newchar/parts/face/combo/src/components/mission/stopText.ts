// Strings for ShortStop.tsx.

import { strings } from '../../i18n';

export const T = strings({
  header: { en: 'Short stop · 1 hour', es: 'Parada corta · 1 hora' },
  intro: {
    en: 'Each ninja can spend Hit Dice (HP) and Chakra Dice, and do one healing activity that spends something. Nothing here restores Tension or Exhaustion, and there is no ambush.',
    es: 'Cada ninja puede gastar Dados de golpe (PV) y Dados de chakra, y hacer una actividad de curación que gaste algo. Aquí nada baja la Tensión ni el Agotamiento, y no hay emboscada.',
  },
  backOnRoad: { en: 'Back on the road', es: 'Volver al camino' },
  noHitDice: { en: 'No Hit Dice left', es: 'No quedan Dados de golpe' },
  fever: { en: 'Fever: no HP back from rests', es: 'Fiebre: los descansos no devuelven PV' },
  fullHp: { en: 'Already at full HP', es: 'Ya tiene los PV al máximo' },
  noChakraDice: { en: 'No Chakra Dice left', es: 'No quedan Dados de chakra' },
  fullChakra: { en: 'Already at full chakra', es: 'Ya tiene el chakra al máximo' },
  hitTitle: { en: 'Heals d{die} {sign} {con} (CON)', es: 'Cura d{die} {sign} {con} (CON)' },
  hitDie: { en: 'Hit Die d{die} · {n} left', es: 'Dado de golpe d{die} · quedan {n}' },
  chakraTitle: { en: 'Restores d{die} chakra', es: 'Recupera d{die} de chakra' },
  chakraDie: { en: 'Chakra Die d{die} · {n} left', es: 'Dado de chakra d{die} · quedan {n}' },
  acted: { en: 'Healing activity done at this stop.', es: 'Ya hizo su actividad de curación en esta parada.' },
  whoTreats: { en: 'Who {name} treats', es: 'A quién atiende {name}' },
  patient: { en: '{name} · {hp}/{max} HP', es: '{name} · {hp}/{max} PV' },
  self: { en: '{name} (self)', es: '{name} (uno mismo)' },
  costBandage: { en: '1 bandage', es: '1 venda' },
  costChakra: { en: '{n} chakra', es: '{n} de chakra' },
  costs: { en: '{description} Costs {cost}.', es: '{description} Cuesta {cost}.' },
});
