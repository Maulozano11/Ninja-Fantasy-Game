// Plays three rounds as the player, using each clan's abilities from the HUD.
import { open, helpers, out } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const tag = process.argv[3] ?? 'r';
const { browser, page, errs } = await open(locale);
const h = helpers(page);
const es = L === 'es';
let n = 0;
const shot = async (name) => { n++; await page.screenshot({ path: `${out}/${tag}-${String(n).padStart(2, '0')}-${name}-${L}.png` }); };
const S = () => page.evaluate(() => window.__battle.state());
const btn = (re) => page.locator('button', { hasText: re }).first();
const settle = async () => { await page.waitForTimeout(250); await h.idle(); await page.waitForTimeout(1100); };
const hoverUnit = async (id, dy = -30) => { const p = await page.evaluate((id) => window.__battle.state().units[id].pos, id); const q = await h.at(p.x, p.z); await page.mouse.move(q.x, q.y + dy); await page.waitForTimeout(550); return { x: q.x, y: q.y + dy }; };
const hoverPt = async (x, z) => { const q = await h.at(x, z); await page.mouse.move(q.x, q.y); await page.waitForTimeout(550); return q; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const nearestFoe = (s, u, max = 99) => Object.values(s.units).filter((f) => f.team !== u.team && !f.down && f.kind === 'ninja').map((f) => ({ f, d: dist(f.pos, u.pos) })).filter((x) => x.d <= max).sort((a, b) => a.d - b.d)[0]?.f;
const logTail = async (k = 8) => page.evaluate((k) => (window.__battle.state().log ?? []).slice(-k).map((l) => typeof l === 'string' ? l : JSON.stringify(l)), k);
const summary = [];

await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();

async function solen(s, u) {
  const foe = nearestFoe(s, u);
  const nodes = s.nodes.filter((x) => x.owner === u.id);
  if (nodes.length && s.round >= 2) {
    // Warp to the own node nearest a foe
    const best = nodes.map((nd) => ({ nd, d: Math.min(...Object.values(s.units).filter((f) => f.team === 'enemy' && !f.down).map((f) => dist(f.pos, nd.pos))) })).sort((a, b) => a.d - b.d)[0].nd;
    await btn(/^.*Warp/).click(); await page.waitForTimeout(300);
    await hoverPt(best.pos.x, best.pos.z); await shot('solen-warp-aim');
    const q = await h.at(best.pos.x, best.pos.z);
    await page.mouse.click(q.x, q.y);
    await page.waitForTimeout(600); await shot('solen-warp-mid');
    await settle(); await shot('solen-warp-landed');
    const s2 = await S(); const me = s2.units[u.id];
    summary.push({ warp: { from: u.pos, to: me.pos, node: best.pos, edge: me.cond.warpEdge, chakra: [u.chakra, me.chakra], bonus: me.turn.bonus } });
    const tgt = nearestFoe(s2, me, 2.5);
    if (tgt) {
      await btn(es ? 'Atacar' : 'Attack').click(); await page.waitForTimeout(300);
      const p = await hoverUnit(tgt.id); await shot('solen-attack-aim-edge');
      const hp0 = tgt.hp;
      await page.mouse.click(p.x, p.y); await page.waitForTimeout(500);
      await settle(); await shot('solen-attack-done');
      const s3 = await S();
      summary.push({ edgeAttack: { target: tgt.id, hp: [hp0, s3.units[tgt.id].hp], pending: !!s3.pending, edgeAfter: s3.units[u.id].cond.warpEdge, log: await logTail(6) } });
    }
    return;
  }
  if (!foe) return;
  // Kunai at the nearest foe (Node)
  await btn('Kunai').click(); await page.waitForTimeout(300);
  const p = await hoverUnit(foe.id); await shot('solen-kunai-aim');
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(400);
  await settle(); await shot('solen-kunai-node');
  const s2 = await S();
  summary.push({ kunai: { foe: foe.id, foePos: foe.pos, nodes: s2.nodes, log: await logTail(4) } });
  // Warp preview (bonus still there): hover the new node
  const nd = s2.nodes.filter((x) => x.owner === u.id).at(-1);
  if (nd) {
    await btn(/Warp/).hover(); await page.waitForTimeout(500); await shot('solen-warp-help');
    await btn(/Warp/).click(); await page.waitForTimeout(300);
    await hoverPt(nd.pos.x, nd.pos.z); await shot('solen-warp-preview');
    await hoverPt(u.pos.x - 2, u.pos.z); await shot('solen-warp-nonode');
    await page.keyboard.press('Escape');
  }
}

async function kenji(s, u) {
  const nodes = s.nodes.filter((x) => x.owner === u.id);
  const onNode = Object.values(s.units).filter((o) => o.id !== u.id && !o.down && nodes.some((nd) => dist(nd.pos, o.pos) <= 0.75));
  if (nodes.length && s.round >= 2) {
    await btn(es ? 'Intercam' : 'Swap').hover(); await page.waitForTimeout(500); await shot('kenji-swap-help');
    await btn(es ? 'Intercam' : 'Swap').click(); await page.waitForTimeout(300);
    // hover a foe NOT on a node (refusal) and one on a node (if any)
    const off = Object.values(s.units).find((o) => o.team === 'enemy' && !o.down && !onNode.includes(o));
    if (off) { await hoverUnit(off.id); await shot('kenji-swap-notonnode'); }
    const al = Object.values(s.units).find((o) => o.team === 'party' && o.id !== u.id && !o.down);
    if (al) { await hoverUnit(al.id); await shot('kenji-swap-ally'); }
    summary.push({ kenjiNodes: nodes, onNode: onNode.map((o) => o.id) });
    if (onNode.length) {
      const t = onNode[0];
      const p = await hoverUnit(t.id); await shot('kenji-swap-target');
      const before = { me: u.pos, t: t.pos };
      await page.mouse.click(p.x, p.y); await page.waitForTimeout(500); await shot('kenji-swap-mid');
      await settle(); await shot('kenji-swap-done');
      const s2 = await S();
      summary.push({ swap: { t: t.id, before, after: { me: s2.units[u.id].pos, t: s2.units[t.id].pos }, log: await logTail(5) } });
    }
    await page.keyboard.press('Escape');
    return;
  }
  const foe = nearestFoe(s, u);
  if (!foe) return;
  await btn('Kunai').click(); await page.waitForTimeout(300);
  const p = await hoverUnit(foe.id); await shot('kenji-kunai-aim');
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(400);
  await settle(); await shot('kenji-kunai-node');
  summary.push({ kenjiKunai: { foe: foe.id, nodes: (await S()).nodes } });
}

async function akira(s, u) {
  let foe = nearestFoe(s, u);
  if (!foe) return;
  if (dist(foe.pos, u.pos) > 11.5) {
    // walk toward the foe
    const d = dist(foe.pos, u.pos); const k = Math.min(u.turn.move - 0.5, d - 9) / d;
    const q = await h.at(u.pos.x + (foe.pos.x - u.pos.x) * k, u.pos.z + (foe.pos.z - u.pos.z) * k);
    await page.mouse.move(q.x, q.y); await page.waitForTimeout(300); await page.mouse.click(q.x, q.y);
    await settle();
  }
  const s2 = await S(); const me = s2.units[u.id]; foe = nearestFoe(s2, me);
  await btn(es ? 'Persecut' : 'Pursuing').click(); await page.waitForTimeout(300);
  const p = await hoverUnit(foe.id); await shot('akira-flame-aim');
  const hp0 = foe.hp;
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(700); await shot('akira-flame-mid');
  await settle(); await shot('akira-flame-done');
  const s3 = await S();
  summary.push({ flame: { foe: foe.id, d: dist(foe.pos, me.pos), hp: [hp0, s3.units[foe.id].hp], chakra: [me.chakra, s3.units[u.id].chakra], log: await logTail(5) } });
}

async function hana(s, u) {
  const foe = nearestFoe(s, u);
  if (!foe || s.round > 1) return;
  const d = dist(foe.pos, u.pos); const ux = (foe.pos.x - u.pos.x) / d, uz = (foe.pos.z - u.pos.z) / d;
  await btn(es ? 'Bloque' : 'Block').click(); await page.waitForTimeout(300);
  const q = await hoverPt(u.pos.x + ux * 1.6, u.pos.z + uz * 1.6); await shot('hana-block-aim');
  await page.mouse.click(q.x, q.y); await settle(); await shot('hana-block-done');
}

const handlers = { preset_founder: solen, companion_kenji: kenji, preset_ember: akira, companion_hana: hana };
let evasions = 0;
for (let i = 0; i < 3000; i++) {
  await page.waitForTimeout(120);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, ctrl: u?.controller, busy: window.__battle.busy(), pending: s.pending ? { kind: s.pending.kind, reactor: s.pending.reactor, dmg: s.pending.hit?.amount, src: s.pending.hit?.source } : null, phase: s.phase, round: s.round }; });
  if (st.phase === 'ended' || st.round > 3) break;
  if (st.busy) continue;
  if (st.pending) {
    const rc = await page.evaluate((r) => window.__battle.state().units[r].controller, st.pending.reactor);
    if (rc !== 'player') continue;
    await page.waitForTimeout(300);
    await shot(`prompt-${st.pending.kind}`);
    if (st.pending.kind === 'evasion') {
      evasions++;
      const before = await page.evaluate((r) => { const u = window.__battle.state().units[r]; return { pos: u.pos, hp: u.hp, ch: u.chakra }; }, st.pending.reactor);
      await page.keyboard.press('y'); await page.waitForTimeout(500); await shot('evade-mid');
      await h.idle(); await page.waitForTimeout(400); await shot('evade-done');
      const after = await page.evaluate((r) => { const u = window.__battle.state().units[r]; return { pos: u.pos, hp: u.hp, ch: u.chakra }; }, st.pending.reactor);
      summary.push({ evasion: { ...st.pending, before, after, log: await logTail(4) } });
    } else { summary.push({ prompt: st.pending }); await page.keyboard.press('n'); }
    continue;
  }
  if (st.team === 'party' && st.ctrl === 'player') {
    await page.waitForTimeout(1100);
    const s = await S();
    const u = s.units[st.cur];
    try { if (handlers[st.cur]) await handlers[st.cur](s, u); } catch (e) { summary.push({ err: st.cur, msg: String(e).slice(0, 200) }); }
    await page.keyboard.press('Escape');
    const s2 = await S();
    if (s2.order[s2.turn] === st.cur && !s2.pending) await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
  }
}
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('log');
console.log(JSON.stringify(summary, null, 1));
console.log('errors', JSON.stringify(errs));
await browser.close();
