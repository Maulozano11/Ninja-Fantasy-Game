import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI, RIVER_FOREST_PATROL } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { ACTIVITY } from '/home/user/Ninja-Fantasy-Game/src/data/campActivities';
import { activityBlocker, ambushParts, chooseFire, doActivity, morning, rollNight, serveFood, spendChakraDie, spendHitDie, startCamp, startShortStop, stopActivity } from '/home/user/Ninja-Fantasy-Game/src/rules/rest';
import { takeSoldierPill } from '/home/user/Ninja-Fantasy-Game/src/rules/mission';
import { applyOutcome, continueRoad, intoNextZone, MissionRun, resolveBattle, startRun } from '/home/user/Ninja-Fantasy-Game/src/game/missionRun';
import { ruleText } from '/home/user/Ninja-Fantasy-Game/src/game/ruleText';

const hero = { ...DEFAULT_CHARACTER, id: 'hero', name: 'Solen' };
const ok = (o: any) => { if (!o.ok) throw new Error(o.reason); return o; };
const rep = (r: MissionRun, victory: boolean, hp: number): MissionRun => ({ ...r, battle: { ...r.battle!, phase: 'fighting', report: { victory, members: [{ id: r.battle!.fighterId, hp, chakra: 3 }] } } });
let r = startRun(RIVER_FOREST_PATROL, 'hero', [hero, HANA, KENJI], { seed: 11, leaderId: 'hero', difficulty: 'normal', noRandomness: false });
r = { ...r, party: { ...r.party, members: r.party.members.map((m) => m.id === 'hero' ? { ...m, currentChakra: 2 } : m) } };
r = applyOutcome(r, ok(takeSoldierPill(r.party, 'hero', r.battle!.id)), (x) => x);
r = { ...r, battle: { ...r.battle!, pills: { hero: 1 } } };
r = resolveBattle(rep(r, false, 0));
r = resolveBattle(rep(r, true, 20));
r = continueRoad(r);
r = applyOutcome(r, ok(startShortStop(r.party)), (x, stop) => ({ ...x, stop }));
r = applyOutcome(r, ok(spendHitDie(r.party, 'hero')), (x) => x);
try { r = applyOutcome(r, ok(spendChakraDie(r.party, 'hero')), (x) => x); } catch {}
r = applyOutcome(r, ok(stopActivity(r.party, r.stop!, HANA.id, 'heal_jutsu', { target: 'hero' })), (x, stop) => ({ ...x, stop }));
r = intoNextZone(r);
r = continueRoad(resolveBattle(rep(r, true, 25)));
r = applyOutcome(r, ok(startCamp(r.party, { nodeId: 'shrine_clearing', zoneDanger: 30, shrine: true })), (x, camp) => ({ ...x, camp }));
r = applyOutcome(r, ok(chooseFire(r.party, r.camp!, 'bonfire')), (x, camp) => ({ ...x, camp }));
for (const [who, a, opts] of [[HANA.id, 'pray', {}], ['hero', 'hunt', {}], [KENJI.id, 'fireside_talk', { target: 'hero' }], [HANA.id, 'bandage', { target: KENJI.id }], [KENJI.id, 'wood_skin', { target: HANA.id }], ['hero', 'keep_watch', {}], [HANA.id, 'field_surgery', { target: 'hero' }], [KENJI.id, 'peaceful_sleep', { target: 'hero' }]] as const) {
  const o = doActivity(r.party, r.camp!, who, a as any, opts as any);
  if (o.ok) r = applyOutcome(r, o, (x, camp) => ({ ...x, camp }));
  else console.log('BLOCK', a, '→', ruleText(o.reason, 'es'));
}
for (const p of ambushParts(r.party, r.camp!)) console.log('PART', p.label, '→', ruleText(p.label, 'es'));
console.log('BLOCKER', ruleText(activityBlocker(r.party, r.camp!, 'hero', ACTIVITY.sharingan_reading) ?? '', 'es'));
console.log('BLOCKER', ruleText(activityBlocker(r.party, r.camp!, 'hero', ACTIVITY.field_surgery) ?? '', 'es'));
r = applyOutcome(r, ok(serveFood(r.party, r.camp!, 'hot')), (x, camp) => ({ ...x, camp }), { en: 'Dinner', es: 'Cena' });
r = applyOutcome(r, ok(rollNight(r.party, r.camp!)), (x, camp) => ({ ...x, camp }));
if (!r.camp!.night!.ambush) r = applyOutcome(r, ok(morning(r.party, r.camp!)), (x, camp) => ({ ...x, camp }));
for (const l of r.log) console.log(l.tone.padEnd(5), l.es ?? '(no es) ' + l.text);
const english = /\b(the|by|from|with|recovers|loses|gains|left|camp|Morning|Battle|Hit Die|only)\b/;
const bad = r.log.filter((l) => !l.es || english.test(l.es.replace(/Solen|Hana|Kenji|Mystical Palm Healing/g, '')));
console.log('\nSUSPECT:', bad.length); for (const l of bad) console.log('  ', l.es);
