// Tests for the owner's Elise's eyes (the 'azure' eye shape, src/sprite/eliseEyeArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { makeRamp } from './color';
import { AZURE_EYE_AT, AZURE_EYE_COLORS, AZURE_EYES, AZURE_FACE, AZURE_IRIS, AZURE_MOUTH, AZURE_SKIN, AZURE_SKIN_RAMP } from './eliseEyeArt';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { getAppearance } from './legacy';
import { GRID, MaterialTable, partIndex, RES } from './raster';
import type { SpritePose, SpriteAppearance } from './types';

const look = (over: Partial<SpriteAppearance> = {}): SpriteAppearance => ({
  version: 1,
  body: 'female',
  skin: AZURE_SKIN,
  eyeShape: 'azure',
  eyeColor: AZURE_IRIS,
  faceShape: 'tapered',
  slots: {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
  ...over,
});

/** The rendered colour at (x, y), as #rrggbb, or null where nothing is drawn. */
const at = (rgba: Uint8ClampedArray, x: number, y: number): string | null => {
  const i = (y * GRID + x) * 4;
  if (!rgba[i + 3]) return null;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
};

/** Her pixels where a pose draws them: [x, y, hex] from the face anchor (body.ts faceAnchor). */
function hers(pose: SpritePose, state: keyof typeof AZURE_EYES, over: Partial<SpriteAppearance> = {}) {
  const f = renderSprite(look(over), pose, 0);
  const k = f.rig.bp.headScale;
  const nx = Math.floor((f.rig.head.x - 1.9 * k) * RES);
  const ny = Math.floor((f.rig.head.y + 1.0 * k) * RES);
  const out: { x: number; y: number; want: string; got: string | null }[] = [];
  for (const [name, x0] of [['near', nx], ['far', nx + 9]] as const) {
    const [dx, dy] = AZURE_EYE_AT[name];
    AZURE_EYES[state][name].rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] !== '.') out.push({ x: x0 + dx + c, y: ny + dy + r, want: AZURE_EYE_COLORS[row[c]], got: at(f.rgba, x0 + dx + c, ny + dy + r) });
    });
  }
  return out;
}

describe("Elise's eyes (azure)", () => {
  it('are whole grids: letters and her pixels line up, every pixel one of her colours, the template cells inside them', () => {
    for (const [state, eyes] of Object.entries(AZURE_EYES)) {
      for (const name of ['near', 'far'] as const) {
        const { letters, rows } = eyes[name];
        assert.equal(letters.length, rows.length, `${state} ${name}`);
        letters.forEach((row, r) => assert.equal(row.length, rows[r].length, `${state} ${name} row ${r}`));
        for (const row of rows) for (const ch of row) if (ch !== '.') assert.match(AZURE_EYE_COLORS[ch] ?? '', /^#[0-9a-f]{6}$/);
        // the face template's eye cells: three rows from the lash row, five columns near and three far
        const [dx, dy] = AZURE_EYE_AT[name];
        const cells = letters.slice(-dy, -dy + 3).map((row) => row.slice(-dx, -dx + (name === 'near' ? 5 : 3)));
        assert.deepEqual(eyes.template[name], cells, `${state} ${name}`);
        for (const row of cells) assert.doesNotMatch(row, /\./, `${state} ${name}: every template cell is hers or the face's skin`);
      }
    }
  });

  it('draws her pixels exactly in her colours, in her skin and her blue, on the female idle', () => {
    const px = hers('idle', 'open');
    assert.ok(px.length > 40);
    for (const p of px) assert.equal(p.got, p.want, `(${p.x}, ${p.y})`);
  });

  it('lowers and shuts her lids when reading and when knocked down', () => {
    for (const p of hers('read', 'lowered')) assert.equal(p.got, p.want, `read (${p.x}, ${p.y})`);
    // knocked down the head lies on its side, her shut eye turned with it: her brow and lash show, no iris
    const shut = renderSprite(look(), 'downed', 0).rgba;
    const colours = new Set<string>();
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) colours.add(at(shut, x, y) ?? '');
    assert.ok(colours.has('#683c30') && colours.has('#080613'), 'her brow and lash');
    for (const iris of ['#2bc3d8', '#052c67', '#115893', '#79aed9']) assert.ok(!colours.has(iris), `no ${iris}`);
  });

  it('moves her iris with the eye colour and her skin shades with the skin, her lashes and whites staying hers', () => {
    const green = hers('idle', 'open', { eyeColor: '#22c55e', skin: '#7d4a2b' });
    const base = hers('idle', 'open');
    const lash = AZURE_EYE_COLORS[AZURE_EYES.open.near.rows[2][1]];
    green.forEach((p, i) => {
      if (base[i].want === lash || base[i].want === '#fefef9') assert.equal(p.got, base[i].got, `(${p.x}, ${p.y}) stays`);
    });
    assert.ok(green.some((p, i) => p.got !== base[i].got), 'something changed');
  });

  it('draws the rest of her face in her tones: her soft shadows and her muted mouth, not our pink lips', () => {
    const f = renderSprite(look(), 'idle', 0);
    const head = partIndex('head');
    const colours = new Set<string>();
    for (let i = 0; i < GRID * GRID; i++) if (f.part[i] === head) colours.add(at(f.rgba, i % GRID, (i / GRID) | 0) ?? '');
    // her mouth is there; our pink lips are not
    assert.ok(colours.has(AZURE_MOUTH.M), 'her mouth');
    for (const ours of ['#c4566c', '#9c3b52']) assert.ok(!colours.has(ours), `no ${ours}`);
    assert.ok(colours.has(AZURE_FACE.D), 'her soft shadow');
    // with other eyes the face is ours as before
    const other = renderSprite(look({ eyeShape: 'standard' }), 'idle', 0);
    const lips = new Set<string>();
    for (let i = 0; i < GRID * GRID; i++) if (other.part[i] === head) lips.add(at(other.rgba, i % GRID, (i / GRID) | 0) ?? '');
    assert.ok(lips.has('#c4566c'), 'our lips on our eyes');
  });

  it('shades her whole body in her own skin tones: her line and her rose shadows, none of the ramp we would work out', () => {
    assert.deepEqual(makeRamp(AZURE_SKIN, 'skin'), [...AZURE_SKIN_RAMP]);
    const mats = new MaterialTable();
    assert.equal(mats.ramps[mats.get(AZURE_SKIN, 'skin')][0], '#080613', 'her line, not pulled toward our ink');
    // What our ramp made of her skin before (its line, dark and shadow): seen at her far temple
    // through a gap in her hair, on her forehead, her shoulder, her thighs and her wrist.
    const ours = ['#18090e', '#ae4946', '#e08a72'];
    const elise = getAppearance(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_elise')!.character);
    for (const [pose, frame] of [['idle', 0], ['walk', 1], ['sit', 0], ['attack', 1], ['crouch', 0]] as const) {
      const f = renderSprite(elise, pose, frame).rgba;
      for (let i = 0; i < GRID * GRID; i++) {
        const h = at(f, i % GRID, (i / GRID) | 0);
        assert.ok(!h || !ours.includes(h), `${pose} ${frame}: ${h} at ${i % GRID}, ${(i / GRID) | 0}`);
      }
    }
  });
});
