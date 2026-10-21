
{
  const out = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/earth-r6/mhl';
  mkdirSync(out, { recursive: true });
  (globalThis as any).__dbg = (o: any) => {
    if (o.i !== 1) return null;
    for (const nm of ['d', 'hl', 'fl', 'dl', 'r']) o[nm].render().save(`${out}/${(globalThis as any).__nm}-f1-${nm}.png`);
    return null;
  };
  const K = key('multi_hit');
  (globalThis as any).__nm = 'mh';
  const plan = HIT_PLAN.map((p) => ({ ...p, sy: 1 + (p.s - 1) * 0.6 }));
  const heart = (x: number) => 1 - Math.min(1, Math.abs(x - K.ax) / 50);
  impact(K, 7800, plan, [-1.2, 0], heart, 100, [26, 10], 1.8, [0.6, 0.8, 0.93, 1]);
  console.log('K', K.w, K.h, K.ax, K.ay);
}
