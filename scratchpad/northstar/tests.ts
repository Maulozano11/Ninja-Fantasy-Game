describe('Northstar: Aura of Sovereignty, Command, Natural Submission', () => {
  const northstar = (over: Partial<ShinobiCharacter> = {}) => hero({ id: 'n', name: 'Shiori', clan: 'Northstar', ...over });
  /** A Northstar at (8.25, 10.25) on its turn, the enemies 6 m away or as given. */
  const northstarTurn = (over: Partial<BattleSetup> = {}): BattleState => turnOf(createBattle(setup({ party: [{ character: northstar(), pos: { x: 8, z: 10 } }], ...over })).state, 'n');
  const cast = (s: BattleState, target: string, o: { jutsu?: string; target2?: string } = {}) =>
    applyAction(s, { type: 'jutsu', unit: 'n', jutsu: o.jutsu ?? 'northstar_command', at: { ...s.units[target].pos }, target, ...(o.target2 ? { target2: o.target2 } : {}) });
  /** The first seed whose outcome passes `want`. */
  function seeded(s: BattleState, act: (t: BattleState) => ReturnType<typeof applyAction>, want: (out: ReturnType<typeof applyAction>) => boolean): ReturnType<typeof applyAction> {
    for (let seed = 1; seed < 80; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const out = ok(act(t));
      if (want(out)) return out;
    }
    throw new Error('no seed gives it');
  }
  const failed = (out: ReturnType<typeof applyAction>) => out.events.some((e) => e.t === 'save' && !e.roll.success);
  const allFailed = (out: ReturnType<typeof applyAction>) => out.events.filter((e) => e.t === 'save').every((e) => e.t === 'save' && !e.roll.success);

  it('the aura: a foe inside it (4.5 m) attacks with plain disadvantage; outside it, or a friend, does not', () => {
    const s = turnOf(createBattle(setup({ party: [
      { character: northstar(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 8, z: 13 } },
    ] })).state, 'rogue_0');
    assert.deepEqual(s.units.n.jutsus.slice(0, 2), ['northstar_command', 'northstar_submission']);
    place(s, 'rogue_0', { x: 9.75, z: 10.25 });
    const r = s.units.rogue_0;
    for (const kind of ['melee', 'ranged', 'jutsu'] as const) {
      const pv = attackPreview(s, r, s.units.n, kind);
      assert.ok(pv.reasons.includes('aura'), kind);
      assert.equal(pv.adv, 'disadvantage');
    }
    // On the Northstar's ally too, and on a structure: the roll is two d20, keeping the lower.
    assert.ok(attackPreview(s, r, s.units.b, 'melee').reasons.includes('aura'));
    const block: Wall = { id: 'b1', kind: 'metalBlock', a: { x: 9.75, z: 11.75 }, b: { x: 9.75, z: 11.75 }, hp: 20, maxHp: 20, owner: 'b' };
    assert.ok(structureAttack({ ...s, walls: [block] }, r, block, false).reasons.includes('aura'));
    const atk = ok(applyAction(s, { type: 'attack', unit: 'rogue_0', target: 'n' })).events.find((e) => e.t === 'attack');
    assert.ok(atk?.t === 'attack');
    assert.equal(atk.roll.rolls.length, 2);
    assert.equal(atk.roll.d20, Math.min(...atk.roll.rolls));
    // Two Northstars: still plain disadvantage, two dice.
    const two = structuredClone(s);
    two.units.b.character = { ...two.units.b.character!, clan: 'Northstar' };
    const pv2 = attackPreview(two, two.units.rogue_0, two.units.n, 'melee');
    assert.equal(pv2.adv, 'disadvantage');
    assert.equal(pv2.reasons.filter((x) => x === 'aura').length, 1);
    // Out at 5 m it's gone.
    const far = structuredClone(s);
    far.units.rogue_0.pos = { x: 13.25, z: 10.25 };
    assert.equal(dist(far.units.rogue_0.pos, far.units.n.pos), 5);
    assert.ok(!attackPreview(far, far.units.rogue_0, far.units.n, 'ranged').reasons.includes('aura'));
    // The Northstar and its friends inside strike as usual.
    assert.ok(!attackPreview(s, s.units.n, r, 'melee').reasons.includes('aura'));
    place(s, 'b', { x: 11.25, z: 10.25 });
    assert.ok(!attackPreview(s, s.units.b, r, 'melee').reasons.includes('aura'));
  });

  it('the aura: whoever dashes or warps into it on their own turn loses half the movement left', () => {
    /** Aki (a Ryusei with Body Flicker) at (8.25, 10.25); a Northstar ally at (18.25, 12.25), its aura from x ≈ 14.2 on Aki's row. */
    const start = (): BattleState => {
      const s = turnOf(createBattle(setup({ party: [
        { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
        { character: northstar(), pos: { x: 18, z: 12 } },
      ], enemies: [{ kind: 'rogue', pos: { x: 6, z: 18 } }] })).state, 'a');
      assert.deepEqual([s.units.a.pos, s.units.n.pos], [{ x: 8.25, z: 10.25 }, { x: 18.25, z: 12.25 }]);
      return s;
    };
    const slowed = (out: ReturnType<typeof applyAction>) => out.events.find((e) => e.t === 'slowed');
    // A plain walk in: nothing lost.
    const walk = ok(applyAction(start(), { type: 'move', unit: 'a', to: cellOf({ x: 16.25, z: 10.25 }) }));
    assert.equal(slowed(walk), undefined);
    assert.equal(walk.state.units.a.turn.move, 1);
    // After a Dash: half of what is left goes at the edge, and the walk ends where the rest runs out.
    const dashed = ok(applyAction(start(), { type: 'dash', unit: 'a' })).state;
    assert.equal(dashed.units.a.turn.move, 18);
    const to = cellOf({ x: 25.75, z: 10.25 });
    const run = ok(applyAction(dashed, { type: 'move', unit: 'a', to }));
    const sl = slowed(run);
    assert.ok(sl?.t === 'slowed' && sl.unit === 'a' && sl.by === 'n');
    const a = run.state.units.a;
    // What is left, plus what it walked, plus what the aura took: the 18 m of the dash.
    assert.ok(Math.abs(a.turn.move + a.turn.moved + sl.move - 18) < 1e-6);
    assert.ok(sl.move > 4);
    assert.notDeepEqual(cellOf(a.pos), to);
    assert.ok(a.turn.move < 0.71);
    // The move event comes before the slow, so the screen shows it at the edge.
    assert.ok(kinds(run.events).indexOf('move') < kinds(run.events).indexOf('slowed'));
    // Warp Strike into it: from 9 m of movement to 4.5.
    const warp = start();
    warp.nodes.push({ id: 'n1', owner: 'a', pos: { x: 17.25, z: 10.25 } });
    const warped = ok(applyAction(warp, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { x: 17.25, z: 10.25 } }));
    assert.equal(warped.state.units.a.turn.move, 4.5);
    assert.ok(slowed(warped));
    // Body Flicker into it: the same.
    const flick = ok(applyAction(start(), { type: 'jutsu', unit: 'a', jutsu: 'body_flicker', at: { x: 14.75, z: 10.25 } }));
    assert.equal(flick.state.units.a.turn.move, 4.5);
    assert.ok(slowed(flick));
    // Already inside, a flicker within it costs nothing more.
    const inside = start();
    inside.units.a.pos = { x: 15.25, z: 10.25 };
    assert.equal(slowed(ok(applyAction(inside, { type: 'jutsu', unit: 'a', jutsu: 'body_flicker', at: { x: 17.25, z: 10.25 } }))), undefined);
  });

  it('Command: a Minion that fails a WIS save fights for the Northstar until the end of its next turn', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 17, z: 13 } }] });
    const out = seeded(s, (t) => cast(t, 'raider_0'), failed);
    const r = out.state.units.raider_0;
    assert.equal(r.team, 'party');
    assert.deepEqual(r.commanded, { by: 'n', team: 'enemy', rounds: 1 });
    assert.equal(r.intent, undefined);
    const save = out.events.find((e) => e.t === 'save');
    assert.ok(save?.t === 'save' && save.unit === 'raider_0' && save.what === 'northstar_command' && save.roll.dc === s.units.n.saveDC);
    assert.ok(out.events.some((e) => e.t === 'command' && e.on && e.unit === 'raider_0'));
    assert.equal(out.state.units.n.chakra, s.units.n.chakra - 4);
    assert.equal(out.state.units.n.turn.action, false);
    // A bloodline ability: no seals, so the blade stays drawn.
    assert.equal(out.state.units.n.armed, s.units.n.armed);
    // A save that holds: nothing changes but the chakra and the action.
    const held = seeded(s, (t) => cast(t, 'raider_0'), (o) => !failed(o));
    assert.equal(held.state.units.raider_0.team, 'enemy');
    assert.equal(held.state.units.n.chakra, s.units.n.chakra - 4);
    // On its turn it goes for its old friend.
    const turn = turnOf(out.state, 'raider_0');
    assert.equal(planIntent(turn, turn.units.raider_0)?.target, 'rogue_0');
    const a = aiAction(turn);
    assert.ok(a && a.type !== 'endTurn', JSON.stringify(a));
    ok(applyAction(turn, a));
    // When its turn ends, it is back with the enemies and has a plan against the party.
    const back = ok(applyAction(turn, { type: 'endTurn', unit: 'raider_0' }));
    const rb = back.state.units.raider_0;
    assert.equal(rb.team, 'enemy');
    assert.equal(rb.commanded, undefined);
    assert.equal(rb.intent?.target, 'n');
    assert.ok(back.events.some((e) => e.t === 'command' && !e.on && e.unit === 'raider_0'));
  });

  it('Command is refused before paying: a Captain below level 5, a boss, a Mirai, the party, one already taken', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 }, rank: 'captain' }, { kind: 'rogue', pos: { x: 14, z: 13 } }, { kind: 'jonin', pos: { x: 13, z: 7 } }] });
    const low = structuredClone(s);
    low.units.n.level = 4;
    assert.equal(cast(low, 'raider_0').reason, 'notMinion');
    low.units.n.level = 5;
    ok(cast(low, 'raider_0'));
    // Mirai are immune: the rogues, and Kagero the Captain too.
    assert.equal(cast(s, 'rogue_0').reason, 'mindImmune');
    assert.equal(cast(s, 'jonin_0').reason, 'mindImmune');
    const lair = turnOf(createBattle(setup({ party: [{ character: northstar(), pos: { x: 11, z: 13 } }], enemies: [{ kind: 'hydra', pos: { x: 16, z: 8 } }] })).state, 'n');
    const head = Object.values(lair.units).find((u) => u.kind === 'hydra_head' && dist(u.pos, lair.units.n.pos) < 9 && lineOfSight(lair, lair.units.n.pos, u.pos))!;
    assert.equal(cast(lair, head.id).reason, 'cantControl');
    const pair = northstarTurn({ party: [
      { character: northstar(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 10, z: 12 } },
    ] });
    assert.equal(cast(pair, 'b').reason, 'cantCommand');
    // One already under command; a second target before level 9; a beast; before the fighting.
    const taken = seeded(s, (t) => cast(t, 'raider_0'), failed).state;
    taken.units.n.turn.action = true;
    assert.equal(cast(taken, 'raider_0').reason, 'alreadyCommanded');
    const two = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 12 } }] });
    assert.equal(cast(two, 'raider_0', { target2: 'raider_1' }).reason, 'oneTarget');
    const beast = structuredClone(two);
    beast.units.raider_0.creature = 'beast';
    assert.equal(cast(beast, 'raider_0').reason, 'notNinja');
    const sneaking = createBattle(setup({ stealth: true, party: [{ character: northstar(), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'raider', pos: { x: 14, z: 10 }, route: [{ x: 14, z: 10 }] }] })).state;
    assert.equal(cast(sneaking, 'raider_0').reason, 'combatOnly');
    // Too far, or out of sight.
    const far = structuredClone(two);
    far.units.raider_0.pos = { x: 17.75, z: 10.25 };
    assert.equal(cast(far, 'raider_0').reason, 'outOfRange');
  });

  it('a commanded enemy is still an enemy: no victory while it stands, and the result counts it as one', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }] });
    const out = seeded(s, (t) => cast(t, 'raider_0'), failed);
    assert.equal(out.state.phase, 'combat');
    const r = battleResult(out.state);
    assert.deepEqual(r.members.map((m) => m.id), ['n']);
    assert.deepEqual(r.enemies.map((e) => e.id), ['raider_0']);
    // Struck down while under command, it falls as an enemy (and the fight is won).
    const t = structuredClone(out.state);
    const ev: BattleEvent[] = [];
    damage(t, t.units.raider_0, 999, 'Force', { source: 'n' }, ev);
    assert.equal(t.units.raider_0.team, 'enemy');
    assert.equal(t.units.raider_0.commanded, undefined);
    assert.equal(t.units.raider_0.down, 'dead');
    assert.deepEqual(kinds(ev).slice(1), ['command', 'down']);
    assert.equal(ok(applyAction(t, { type: 'endTurn', unit: 'n' })).state.outcome, 'victory');
    // Nobody in the party takes its reins, nor opens the backpack for it.
    assert.equal(applyAction(out.state, { type: 'setController', unit: 'raider_0', controller: 'player' }).reason, 'noUnit');
  });

  it('from level 9 Command takes two Minions, each with its own save, for two of their turns', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 12 } }] });
    s.units.n.level = 9;
    const out = seeded(s, (t) => cast(t, 'raider_0', { target2: 'raider_1' }), (o) => o.events.filter((e) => e.t === 'save').length === 2 && allFailed(o));
    for (const id of ['raider_0', 'raider_1']) assert.deepEqual(out.state.units[id].commanded, { by: 'n', team: 'enemy', rounds: 2 });
    assert.equal(out.state.units.n.chakra, s.units.n.chakra - 4);
    // Its first turn ends still under command; the second sends it back.
    const once = ok(applyAction(turnOf(out.state, 'raider_0'), { type: 'endTurn', unit: 'raider_0' })).state;
    assert.equal(once.units.raider_0.team, 'party');
    assert.equal(once.units.raider_0.commanded?.rounds, 1);
    const twice = ok(applyAction(turnOf(once, 'raider_0'), { type: 'endTurn', unit: 'raider_0' })).state;
    assert.equal(twice.units.raider_0.team, 'enemy');
  });

  it('Natural Submission: a beast or summon that fails a WIS save joins for the rest of the battle; never a boss', () => {
    const s = northstarTurn({ enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 13 } }] });
    s.units.rogue_0.creature = 'beast';
    const sub = (t: BattleState, target: string) => cast(t, target, { jutsu: 'northstar_submission' });
    const out = seeded(s, (t) => sub(t, 'rogue_0'), failed);
    const b = out.state.units.rogue_0;
    assert.equal(b.team, 'party');
    assert.deepEqual(b.joined, { by: 'n', team: 'enemy' });
    assert.ok(out.events.some((e) => e.t === 'joined' && e.unit === 'rogue_0'));
    assert.equal(out.state.units.n.chakra, s.units.n.chakra - 5);
    // It stays: its turn ends and it is still with the party, which doesn't count it as a member.
    const later = ok(applyAction(turnOf(out.state, 'rogue_0'), { type: 'endTurn', unit: 'rogue_0' })).state;
    assert.equal(later.units.rogue_0.team, 'party');
    assert.ok(!battleResult(later).members.some((m) => m.id === 'rogue_0'));
    // A ninja isn't a beast; a boss isn't taken.
    assert.equal(sub(s, 'raider_0').reason, 'notBeast');
    const boss = structuredClone(s);
    boss.units.rogue_0.rank = 'boss';
    assert.equal(sub(boss, 'rogue_0').reason, 'cantControl');
  });

  it('the AI: a Northstar facing a lone Minion of weak will commands it', () => {
    const { state } = createBattle(setup({ party: [{ character: northstar(), pos: { x: 8, z: 10 }, controller: 'ai' }], enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }] }));
    const s = turnOf(state, 'n');
    s.units.n.jutsus = ['northstar_command', 'northstar_submission'];
    s.units.raider_0.stats = { ...s.units.raider_0.stats, wis: 3 };
    const a = aiAction(s);
    assert.deepEqual(a, { type: 'jutsu', unit: 'n', jutsu: 'northstar_command', at: s.units.raider_0.pos, target: 'raider_0' });
    ok(applyAction(s, a!));
    // Out of reach, it walks in first.
    const far = structuredClone(s);
    far.units.raider_0.pos = { x: 20.25, z: 10.25 };
    assert.equal(aiAction(far)?.type, 'move');
  });
});

describe('the counter cycle (docs/CLANS_DESIGN.md)', () => {
  const node = (id: string, pos: Pt, owner: string): WeaponNode => ({ id, owner, pos: { ...pos } });

  it('Mirai beats Northstar: a Mirai\'s mind can\'t be commanded', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'n', clan: 'Northstar' }), pos: { x: 8, z: 10 } }] })).state, 'n');
    assert.equal(s.units.rogue_0.character?.clan, 'Mirai');
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'n', jutsu: 'northstar_command', at: { ...s.units.rogue_0.pos }, target: 'rogue_0' }).reason, 'mindImmune');
  });

  it('Kōton beats Mirai: a metal wall hides the enemy\'s next move from the Eye of Tomorrow', () => {
    const s = turnOf(createBattle(setup({ party: [
      { character: hero({ id: 'm', clan: 'Mirai' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'k', clan: 'Koton' }), pos: { x: 8, z: 12 } },
    ] })).state, 'k');
    assert.ok(foreseen(s).rogue_0);
    const walled = ok(applyAction(s, { type: 'jutsu', unit: 'k', jutsu: 'koton_wall', at: { x: 11.25, z: 10.25 } })).state;
    assert.equal(foreseen(walled).rogue_0, undefined);
  });

  it('Ryusei beats Kōton: Warp Strike goes through a metal wall', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    assert.equal(s.units.a.character?.clan, 'Ryusei');
    s.walls.push({ id: 'w1', kind: 'metal', a: { x: 10.5, z: 11 }, b: { x: 10.5, z: 15.5 }, hp: 20, maxHp: 20, owner: 'rogue_0' });
    s.nodes.push(node('n1', { x: 12.25, z: 13.25 }, 'a'));
    assert.equal(lineOfSight(s, s.units.a.pos, { x: 12.25, z: 13.25 }), false);
    assert.deepEqual(ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { x: 12.25, z: 13.25 } })).state.units.a.pos, { x: 12.25, z: 13.25 });
  });

  it('Northstar beats Ryusei: warping into its aura costs half the movement, and the blow from behind loses its edge', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const r = s.units.rogue_0;
    r.character = { ...r.character!, clan: 'Northstar' };
    s.nodes.push(node('n1', r.pos, 'a'));
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { ...r.pos } }));
    const a = out.state.units.a;
    assert.equal(a.turn.move, s.units.a.turn.move / 2);
    assert.ok(out.events.some((e) => e.t === 'slowed' && e.unit === 'a' && e.by === 'rogue_0'));
    assert.equal(a.cond.warpEdge, true);
    const pv = attackPreview(out.state, a, out.state.units.rogue_0, 'melee');
    assert.ok(pv.reasons.includes('behind') && pv.reasons.includes('aura'));
    assert.equal(pv.adv, 'none');
  });

  it('and Warp Strike\'s blow can\'t be evaded by a Mirai', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    s.nodes.push(node('n1', s.units.rogue_0.pos, 'a'));
    const warped = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { ...s.units.rogue_0.pos } })).state;
    warped.units.rogue_0.hp = 1;
    let struck = false;
    for (let seed = 1; seed < 60 && !struck; seed++) {
      const t = structuredClone(warped);
      t.seed = seed;
      const out = ok(applyAction(t, { type: 'attack', unit: 'a', target: 'rogue_0' }));
      if (!out.events.some((e) => e.t === 'attack' && e.roll.success)) continue;
      struck = true;
      assert.ok(!out.events.some((e) => e.t === 'evade'));
      assert.ok(out.state.units.rogue_0.down);
    }
    assert.ok(struck, 'some seed lands the blow');
  });
});

