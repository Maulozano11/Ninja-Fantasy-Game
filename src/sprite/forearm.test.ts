// The extended forearm (docs/SPRITE_STYLE_GUIDE.md section 5): every arm reaching out has the owner's
// forearm, as thick as Ren's casting forearm (the owner: "su antebrazo izquierdo en el combo se ve aun flaco
// pon como el antebrazo del modelo de lanzar jutsu y haz una regla para que se vea asi todos los lanzar jutsu
// ... y toda pose que tenga el brazo extendido de esa forma se vea asi"). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { armJoints, armRadius, armReaches, type Depth, type DrawCtx, FOREARM_RULE, FOREARM_TAPER, type Side } from './ctx';
import { limbR } from './items/clothes';
import { nightArmStamps } from './items/night';
import { NIGHT_CAST_FORE_F } from './items/nightCastArmsArt';
import { defaultAppearance, dojutsuToEye } from './legacy';
import { GRID, RES } from './raster';
import { BODY_PARAMS, drawRig, frameCount, POSES, rigPoseFor, type Rig, type RigPose } from './rig';
import type { BodyType, EyeSpecial, SpriteAppearance, SpritePose } from './types';

const BODIES: BodyType[] = ['male', 'bulky', 'female'];
/**
 * The bodies that draw our limbs, whose rendered forearm the rule sets. The fitted female body (BodyParams.fit,
 * the owner's bare female body from body/female-v2) draws his own painted arm pieces (femaleBaseArt.ts), his
 * heroines' standard, which the rule does not redraw: its radius follows the rule, its pixels are his.
 */
const DRAWN: BodyType[] = BODIES.filter((b) => !BODY_PARAMS[b].fit);
/** Ren's casting forearm, the rule's model: 8 rows (his picture shrunk evenly is 10, "1-2 pixels less"). */
const HIS_ROWS = NIGHT_CAST_FORE_F.rows.length;

/** Every rig frame of every pose with this arm reaching out. */
function reaching(body: BodyType): [RigPose, number, Side, Rig][] {
  const out: [RigPose, number, Side, Rig][] = [];
  for (const pose of Object.keys(POSES) as RigPose[])
    for (let f = 0; f < frameCount(pose); f++) {
      const r = drawRig(body, pose, f);
      for (const s of ['N', 'F'] as Side[]) if (armReaches(r, s)) out.push([pose, f, s, r]);
    }
  return out;
}

/**
 * How many rows across (fine px, his line included) the arm's own layers are at `t` of the way from the
 * elbow to the wrist: the run of the figure across the bone there, measured square to the bone.
 */
function across(look: SpriteAppearance, pose: SpritePose, frame: number, s: Side, ts: number[], eye: EyeSpecial = 'none'): number[] {
  const pre = s === 'F' ? 'farArm' : 'nearArm';
  const depths = new Set([`${pre}.body`, `${pre}.cloth`, `${pre}.armor`, `${pre}.held`] as Depth[]);
  const fr = renderSprite(look, pose, frame, eye, { depths });
  const r = drawRig(look.body, rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id), frame);
  const j = armJoints(r, s);
  const [ex, ey, wx, wy] = [j.elbow.x * RES, j.elbow.y * RES, j.wrist.x * RES, j.wrist.y * RES];
  const L = Math.hypot(wx - ex, wy - ey);
  const [nx, ny] = [-(wy - ey) / L, (wx - ex) / L];
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && fr.rgba[(y * GRID + x) * 4 + 3] > 0;
  return ts.map((t) => {
    const [px, py] = [ex + (wx - ex) * t, ey + (wy - ey) * t];
    if (!op(Math.floor(px), Math.floor(py))) return 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (const dir of [1, -1])
      for (let d = 0; d < 20; d += 0.25) {
        const x = Math.floor(px + nx * d * dir);
        const y = Math.floor(py + ny * d * dir);
        if (!op(x, y)) break;
        const o = (x + 0.5 - px) * nx + (y + 0.5 - py) * ny;
        lo = Math.min(lo, o);
        hi = Math.max(hi, o);
      }
    return Math.round(hi - lo + 1);
  });
}

const presets = (): [string, SpriteAppearance, EyeSpecial][] => [
  ...LEGENDARY_PRESETS.map((p) => [p.character.id, p.character.appearance!, dojutsuToEye(p.character.dojutsu)] as [string, SpriteAppearance, EyeSpecial]),
  [
    'roman',
    (() => {
      const l = defaultAppearance();
      l.slots.armor = { id: 'armor_bronze', colors: [] };
      l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
      l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
      l.slots.feet = { id: 'feet_gladiator_sandals', colors: [], parts: { paint: 'roman' } };
      delete l.slots.top;
      delete l.slots.bottom;
      return l;
    })(),
    'none',
  ],
];

describe('the extended forearm (the owner\'s rule)', () => {
  it('is measured on his pictures: 8 rows on the male body, 10 on the bulky, 7 on the female, tapering to the wrist', () => {
    assert.equal(HIS_ROWS, 8);
    assert.deepEqual(FOREARM_RULE, { male: { rows: 8, wrist: 6 }, female: { rows: 7, wrist: 5 }, bulky: { rows: 10, wrist: 7 } });
  });

  it('gives every arm reaching out the rule\'s forearm, the skin and the cloth that dresses it alike', () => {
    for (const body of BODIES) {
      const found = reaching(body);
      // the cast, the combo's punches, the attack's follow-through and the pierce all reach out
      for (const [pose, f] of [['cast', 0], ['combo', 1], ['combo', 2], ['attack', 1], ['pierce', 2]] as const) assert.ok(found.some(([p, k]) => p === pose && k === f), `${body} ${pose} ${f} reaches out`);
      // an arm hanging at rest does not (idle is as he drew it)
      assert.ok(!found.some(([p]) => p === 'idle'), `${body}: idle is not reaching`);
      for (const [pose, f, s, rig] of found) {
        const g = { rig, bp: rig.bp } as unknown as DrawCtx;
        const { rows, wrist } = FOREARM_RULE[body];
        for (const [t, want] of [[1.0001, rows], [1 + FOREARM_TAPER, rows], [2, wrist]] as const) {
          assert.ok(Math.abs(armRadius(g, t, s) * 2 * RES - want) < 1e-9, `${body} ${pose} ${f} ${s}: the forearm at ${t}`);
          assert.ok(Math.abs(limbR(g, 'arm', t, s) * 2 * RES - want) < 1e-9, `${body} ${pose} ${f} ${s}: the cloth's forearm at ${t}`);
        }
      }
    }
  });

  it('is never thinner than the rule in the cast and the combo, for every preset and the Roman', () => {
    // Over the middle of the far forearm (a sleeve, bracer or vambrace over it may add to it). His painted
    // forearms keep his 8 rows on every body, so a body's rule counts from the smaller of the two.
    for (const [name, base, eye] of presets()) {
      for (const body of DRAWN) {
        const l = { ...base, body };
        const min = Math.min(FOREARM_RULE[body].rows, HIS_ROWS) - 1;
        for (const [pose, f] of [['cast', 0], ['cast', 1], ['combo', 2]] as const) {
          // (one column may be a row short where a turned piece steps along its slant)
          const got = across(l, pose, f, 'F', [0.4, 0.55, 0.7], eye);
          const mean = got.reduce((a, b) => a + b, 0) / got.length;
          assert.ok(mean >= min && got.every((n) => n >= min - 1), `${name} ${body} ${pose} ${f}: the far forearm ${got.join(', ')} rows across (at least ${min})`);
        }
      }
    }
  });

  it('is the rule\'s forearm on a bare arm reaching out, in every such frame', () => {
    // The default look's forearms are bare (a short-sleeved tee): every reaching arm is the rule's rows, give or take one.
    for (const body of DRAWN) {
      const l = { ...defaultAppearance(), body };
      const { rows } = FOREARM_RULE[body];
      for (const [pose, f, s] of reaching(body)) {
        if (!(pose in POSES) || !(['attack', 'cast', 'combo', 'pierce', 'throw', 'tackle'] as string[]).includes(pose)) continue;
        const got = across(l, pose as SpritePose, f, s, [0.4, 0.55]);
        assert.ok(got.every((n) => Math.abs(n - rows) <= 1), `${body} ${pose} ${f} ${s}: ${got.join(', ')} rows across (the rule ${rows})`);
      }
    }
  });

  it('is Ren\'s casting forearm wherever his far arm reaches out, not his thin idle one', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const [pose, f, s, rig] of reaching(body)) {
        if (s !== 'F') continue;
        const fore = nightArmStamps(rig, s).filter((t) => t.name === 'fore');
        assert.ok(fore.length >= 1 && fore[0].piece === NIGHT_CAST_FORE_F, `${body} ${pose} ${f}: his far forearm`);
      }
      // and it reads as his: the combo's cross as thick as his cast
      const ren = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_night')!.character;
      const l = { ...ren.appearance!, body };
      const cross = across(l, 'combo', 2, 'F', [0.25, 0.4, 0.55], dojutsuToEye(ren.dojutsu));
      assert.ok(cross.every((n) => n >= HIS_ROWS - 1 && n <= HIS_ROWS + 1), `${body} combo 2: ${cross.join(', ')} rows across (his ${HIS_ROWS})`);
      // seated, his far arm reaching forward is his casting forearm too, at its width
      for (let f = 0; f < frameCount('sit'); f++) {
        const fore = nightArmStamps(drawRig(body, 'sit', f), 'F').filter((t) => t.name === 'fore');
        assert.equal(fore[0].piece, NIGHT_CAST_FORE_F, `${body} sit ${f}: his far forearm`);
        const sat = across(l, 'sit', f, 'F', [0.25, 0.4, 0.55], dojutsuToEye(ren.dojutsu));
        assert.ok(sat.every((n) => n >= HIS_ROWS - 1 && n <= HIS_ROWS + 1), `${body} sit ${f}: ${sat.join(', ')} rows across (his ${HIS_ROWS})`);
      }
    }
  });
});
