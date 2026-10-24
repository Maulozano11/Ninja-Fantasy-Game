// Strings for MissionMode.tsx: the village board, the road, battle prep and the mission's end.
// (The legacy one-fighter battle screen stays in English: a new battle screen replaces it.)

import type { WeatherType } from '../../types/shinobi';
import { strings } from '../../i18n';

export const T = strings({
  // difficulties
  diffStory: { en: 'Story', es: 'Historia' },
  diffStoryText: {
    en: 'To enjoy the story: lighter battles once the new battle engine arrives. A lost battle starts over; nobody dies.',
    es: 'Para disfrutar la historia: batallas más ligeras cuando llegue el nuevo motor de batalla. Una batalla perdida se repite; nadie muere.',
  },
  diffNormal: { en: 'Normal', es: 'Normal' },
  diffNormalText: {
    en: 'The intended challenge. A lost battle starts over from the road; nobody dies.',
    es: 'El reto pensado para el juego. Una batalla perdida se repite desde el camino; nadie muere.',
  },
  diffLegend: { en: 'Legend', es: 'Leyenda' },
  diffLegendText: {
    en: 'Death is permanent and there is one save. If the whole party dies, the campaign starts over.',
    es: 'La muerte es permanente y hay una sola partida guardada. Si muere todo el grupo, la campaña empieza de nuevo.',
  },
  chipStory: { en: 'story', es: 'historia' },
  chipNormal: { en: 'normal', es: 'normal' },
  chipLegend: { en: 'legend', es: 'leyenda' },

  // log headings
  logDinner: { en: 'Dinner', es: 'Cena' },
  logNight: { en: 'Night', es: 'Noche' },
  logMorning: { en: 'Morning', es: 'Mañana' },
  logShortStop: { en: 'Short stop', es: 'Parada corta' },
  logCampAt: { en: 'Camp at {node}', es: 'Campamento en {node}' },
  logCampBroken: { en: 'Camp broken', es: 'Campamento levantado' },
  logPushOn: { en: 'The party pushes on without camping.', es: 'El grupo sigue adelante sin acampar.' },

  // the road
  endOf: { en: 'End of {zone}', es: 'Fin de {zone}' },
  before: { en: 'Before {zone}', es: 'Antes de {zone}' },
  stopOffer: {
    en: 'You can take a short stop here: an hour to spend Hit Dice and Chakra Dice and patch each other up. Only one per zone, and every hour on the road makes the next camp more dangerous.',
    es: 'Aquí pueden hacer una parada corta: una hora para gastar Dados de golpe y Dados de chakra y curarse entre ustedes. Solo una por zona, y cada hora de camino hace más peligroso el siguiente campamento.',
  },
  takeStop: { en: 'Take a short stop (1 h)', es: 'Hacer una parada corta (1 h)' },
  pushOn: { en: 'Push on', es: 'Seguir adelante' },
  leaveZone: { en: 'Leave {zone} ({hours} h)', es: 'Salir de {zone} ({hours} h)' },
  goOnTo: { en: 'Go on to {node} ({hours} h)', es: 'Seguir hacia {node} ({hours} h)' },
  finish: { en: 'Finish the mission', es: 'Terminar la misión' },

  // header
  rankMission: { en: 'Rank {rank} mission', es: 'Misión de rango {rank}' },
  noRandomness: { en: 'no randomness', es: 'sin azar' },
  hours: { en: '{spent} h spent · {since} h since camp', es: '{spent} h de misión · {since} h desde el campamento' },
  abandonAsk: { en: 'Abandon the mission? Progress is lost.', es: '¿Abandonar la misión? Se pierde el progreso.' },
  abandon: { en: 'Abandon', es: 'Abandonar' },
  keepGoing: { en: 'Keep going', es: 'Seguir' },
  abandonMission: { en: 'Abandon mission', es: 'Abandonar misión' },

  // road map
  stopTitle: { en: 'Short stop between zones (one per zone)', es: 'Parada corta entre zonas (una por zona)' },
  stop: { en: 'stop', es: 'parada' },
  dangerTitle: { en: 'Base night danger in this zone', es: 'Peligro nocturno base de esta zona' },
  zoneLine: { en: '{terrain} · moon {danger}%', es: '{terrain} · luna {danger}%' },

  // node panel
  campsite: { en: 'Campsite', es: 'Lugar para acampar' },
  objective: { en: 'Objective', es: 'Objetivo' },
  battle: { en: 'Battle', es: 'Batalla' },
  makeCamp: { en: 'Make camp (1 camp kit · {n} left)', es: 'Acampar (1 equipo de campamento · quedan {n})' },
  skipCamp: { en: 'Push on without camping', es: 'Seguir sin acampar' },

  // battle prep
  nightRaid: { en: 'Night raid', es: 'Asalto nocturno' },
  objectiveBattle: { en: 'Objective battle', es: 'Batalla del objetivo' },
  partyFights: { en: 'The party fights together', es: 'El grupo pelea unido' },
  partyHelp: {
    en: 'You control all four on the battle map; any of them can be handed to the AI with an order (Aggressive, Defensive, Support). Soldier pills, bandages, antidotes, explosive tags, weapon poison and healing potions are used in battle.',
    es: 'Controlas a los cuatro en el mapa de batalla; puedes pasar cualquiera a la IA con una orden (Agresivo, Defensivo, Apoyo). Las píldoras, vendas, antídotos, sellos explosivos, el veneno para armas y las pociones curativas se usan en la batalla.',
  },
  raidBells: { en: 'The bells on the perimeter woke everyone: nobody starts surprised. Traps set at camp wait on the raiders’ paths.', es: 'Las campanas del perímetro despertaron a todos: nadie empieza sorprendido. Las trampas del campamento esperan en el camino de los asaltantes.' },
  raidNoBells: { en: 'No bells on the perimeter: whoever wasn’t on watch is caught asleep and loses the first turn. Traps set at camp wait on the raiders’ paths.', es: 'Sin campanas en el perímetro: quien no hacía guardia despierta tarde y pierde el primer turno. Las trampas del campamento esperan en el camino de los asaltantes.' },
  fight: { en: 'Fight', es: 'Pelear' },

  // log and end
  missionLog: { en: 'Mission log ({n})', es: 'Bitácora de la misión ({n})' },
  complete: { en: 'Mission complete', es: 'Misión cumplida' },
  failed: { en: 'Mission failed', es: 'Misión fallida' },
  gameOver: { en: 'The whole party has died', es: 'Todo el grupo ha muerto' },
  completeText: {
    en: 'The hydra is dead and the ford is safe again. Back at the village everyone is restored; scars stay, and every Breakdown or Awakening leaves a small trait.',
    es: 'La hidra está muerta y el vado vuelve a ser seguro. De vuelta en la aldea todos se recuperan; las cicatrices se quedan, y cada Quiebre o Despertar deja un pequeño rasgo.',
  },
  failedText: { en: 'The objective is lost. The survivors return to the village.', es: 'El objetivo se perdió. Los sobrevivientes regresan a la aldea.' },
  gameOverText: { en: 'In Legend, death is permanent. If the whole party dies, the campaign starts over.', es: 'En Leyenda, la muerte es permanente. Si muere todo el grupo, la campaña empieza de nuevo.' },
  endRank: { en: '{mission} · Rank {rank}', es: '{mission} · Rango {rank}' },
  statHours: { en: 'Hours', es: 'Horas' },
  statWon: { en: 'Battles won', es: 'Batallas ganadas' },
  statFalls: { en: 'Falls', es: 'Caídas' },
  statCamps: { en: 'Camps', es: 'Campamentos' },
  statAmbushes: { en: 'Ambushes', es: 'Emboscadas' },
  startOver: { en: 'Start over', es: 'Empezar de nuevo' },
  returnHome: { en: 'Return to the village', es: 'Volver a la aldea' },
  chronicle: { en: 'Chronicle', es: 'Crónica' },

  // village
  board: { en: 'Village · mission board', es: 'Aldea · tablón de misiones' },
  missions: { en: 'Missions', es: 'Misiones' },
  villageIntro: {
    en: 'HP, chakra and effects now carry over from battle to battle. Rest on the road with short stops and camps, and get home before the party breaks.',
    es: 'Los PV, el chakra y los efectos ahora se conservan de una batalla a otra. Descansen en el camino con paradas cortas y campamentos, y vuelvan a casa antes de que el grupo se quiebre.',
  },
  yourParty: { en: 'Your party', es: 'Tu grupo' },
  partyRules: {
    en: 'Your ninja goes, plus up to 3 companions. The mission leader breaks ties when the party votes.',
    es: 'Va tu ninja y hasta 3 compañeros. El líder de la misión desempata cuando el grupo vota.',
  },
  you: { en: 'You', es: 'Tú' },
  levelLine: { en: 'Lv {level} · {clan} · {cls}', es: 'Nv {level} · {clan} · {cls}' },
  statsLine: { en: '{hp} HP · {chakra} chakra · AC {ac}', es: '{hp} PV · {chakra} chakra · CA {ac}' },
  leaveBehind: { en: 'Leave behind', es: 'Dejar' },
  bring: { en: 'Bring', es: 'Llevar' },
  leader: { en: 'Leader', es: 'Líder' },
  difficulty: { en: 'Difficulty', es: 'Dificultad' },
  noRandomnessMode: { en: 'No-randomness mode', es: 'Modo sin azar' },
  noRandomnessText: {
    en: " (outside battle): checks count the d20 as 10, and the ambush comes when the camps' % add up to 100.",
    es: ' (fuera de batalla): en las pruebas el d20 cuenta como 10, y la emboscada llega cuando los % de los campamentos suman 100.',
  },
  stopsOnRoad: { en: '{n} stops on the road', es: '{n} etapas en el camino' },
  backpack: {
    en: 'Backpack: {rations} rations, {kits} camp kits, {bandages} bandages, {antidotes} antidote, {pills} soldier pills, {tags} explosive tags, {wire} wire roll, {poison} vials of weapon poison, {potions} healing potions.',
    es: 'Mochila: {rations} raciones, {kits} equipos de campamento, {bandages} vendas, {antidotes} antídoto, {pills} píldoras de soldado, {tags} sellos explosivos, {wire} rollo de alambre, {poison} frascos de veneno para armas, {potions} pociones curativas.',
  },
  setOutOne: { en: 'Set out with {n} ninja', es: 'Partir con {n} ninja' },
  setOutMany: { en: 'Set out with {n} ninjas', es: 'Partir con {n} ninjas' },
  notes: { en: 'Prototype notes', es: 'Notas del prototipo' },
  notesSolo: { en: 'Solo play: you choose for every ninja. Local and online votes come later.', es: 'Juego en solitario: tú eliges por cada ninja. Las votaciones locales y en línea llegarán después.' },
  notesBattle: {
    en: 'The current battle screen fights one ninja at a time; the rest of the party holds the flanks off-screen.',
    es: 'La pantalla de batalla actual pelea con un ninja a la vez; el resto del grupo cubre los flancos fuera de pantalla.',
  },
});

export const WEATHER_ES: Record<WeatherType, string> = {
  Clear: 'Despejado',
  Downpour: 'Aguacero',
  'Scorching Drought': 'Sequía abrasadora',
  Sandstorm: 'Tormenta de arena',
};
