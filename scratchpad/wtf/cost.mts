const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src';
const { LEGENDARY_PRESETS } = await import(`${R}/data/shinobiData`);
const { renderSprite } = await import(`${R}/sprite/compose`);
const { getAppearance, defaultAppearance } = await import(`${R}/sprite/legacy`);
const { renderThrown, releaseClear, thrownItem } = await import(`${R}/sprite/thrown`);
const { throwRelease } = await import(`${R}/sprite/grip`);
const { phaseBody, phaseFrame } = await import(`${R}/sprite/phase`);
const { GRID } = await import(`${R}/sprite/raster`);
const ids = LEGENDARY_PRESETS.map((p: any) => p.character.id);
console.log(ids.join(' '));
for (const id of ['preset_reference_aiden', ...ids.slice(0, 3)]) {
  const c = LEGENDARY_PRESETS.find((p: any) => p.character.id === id)!.character;
  const look = c.appearance ?? getAppearance(c);
  const t = (name: string, fn: () => unknown, n = 3) => {
    fn();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    console.log(id, name, ((performance.now() - t0) / n).toFixed(1), 'ms');
  };
  t('renderSprite throw 2', () => renderSprite(look, 'throw', 2));
  t('renderSprite pierce 1', () => renderSprite(look, 'pierce', 1));
  t('renderThrown 10', () => renderThrown(look, 10));
  const th = renderThrown(look, 10);
  t('phaseBody thrown', () => phaseBody(th.rgba, GRID, GRID));
  const fr = renderSprite(look, 'throw', 3);
  t('phaseFrame', () => phaseFrame(fr));
  const rel = throwRelease(look.body, thrownItem(look));
  t('releaseClear', () => releaseClear(fr.rgba, renderThrown(look, rel.weaponAngle), rel.lastHeld, rel.weaponAngle));
  console.log(id, thrownItem(look), 'clear', releaseClear(fr.rgba, renderThrown(look, rel.weaponAngle), rel.lastHeld, rel.weaponAngle), 'angle', rel.weaponAngle, 'lastHeld', rel.lastHeld);
}
