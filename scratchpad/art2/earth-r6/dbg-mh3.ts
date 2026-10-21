
{
  (globalThis as any).__dbg = (o: any) => {
    if (o.i !== 1) return null;
    o.rockPcs.forEach((pc: number[], k: number) => {
      const [cx, cy] = centre(o.rocks, pc);
      const off = o.kindOf[k] === 'chunk' ? o.burstChunk(k, 1) : [(cx - 95) * (o.p.d - 1), (cy - 79) * (o.p.d - 1)];
      console.log(k, o.kindOf[k], 'n', pc.length, 'c', cx.toFixed(0), cy.toFixed(0), 'off', off.map((v: number) => v.toFixed(1)).join(','));
    });
    return null;
  };
  const K = key('multi_hit');
  const plan = HIT_PLAN.map((p) => ({ ...p, sy: 1 + (p.s - 1) * 0.6 }));
  const heart = (x: number) => 1 - Math.min(1, Math.abs(x - K.ax) / 50);
  impact(K, 7800, plan, [-1.2, 0], heart, 100, [26, 10], 1.8, [0.6, 0.8, 0.93, 1]);
}
