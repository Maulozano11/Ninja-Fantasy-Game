# Cinematics: one shot, the code moves it

The owner's generator paints good single pictures but never the same thing twice, so frames
painted one by one jump (size, place, pose). A cinematic here is built from pictures that **line
up** (a keyframe and edits of it), and every frame in between is made by code from his pixels.
Agreed by Steve 1 and Steve 2 (team board, 2026-10-29); the fire avatar is the first user, the
hydra summon (`docs/colossal-hydra`, `tools/cinematics/hydra-summon/`) is ported next by Steve 1.

## What to ask his generator for

One shot, as layers that register (same size, same framing, same camera):

1. **The keyframe**: the subject alone on pure magenta (`#FF00FF`).
2. **The background** alone, no subject.
3. **A plate**: the same keyframe with the pieces taken away, only what is behind them (an edit of
   the keyframe, so it lines up). The tool cuts each piece exactly where the keyframe differs from
   its plate, so no cut line can show, and fills the hole with the plate.
4. Optional: **a sheet of loose effects** on magenta (swirls, sparks, bursts, glints...), cut into
   named cells by a small JSON (`fire-avatar/effects.json`).
5. Or, for a scene that changes in steps (the hydra): **each step as an edit of the previous one**;
   the code animates the difference between steps (`core.step_difference`).

The party is never painted in: the game draws the real units (their looks, their positions) over
the cinematic. Leave their place empty.

## Running it

    python3 -I tools/cinematics/render.py tools/cinematics/fire-avatar/shield.json --out <staging> [--preview-unit <sprite.png>]

From the repo root. Output under `<staging>` (never committed): `<name>/0000.png...` (the frames,
no party), `<name>/manifest.json` (fps, size, where each unit stands, the camera of every frame:
zoom, crop and shake, so the player draws the units under the same camera), `<name>.mp4` (under the
15 MB publish limit; the script stops if not) and `<name>.gif`. With `--preview-unit`, the preview
video and GIF draw that sprite as the caster the way the player will. Same spec and pictures give
the same bytes (checked: frames and manifest of `shield.json` rerun byte-identical).

## Layout

| Path | What |
|---|---|
| `render.py` | Loads a spec, runs its plug-in, writes frames, manifest, video, GIF |
| `cine/core.py` | Keys (`key_hard` for crisp subjects; `key_unmix` for glow and smoke: alpha = 1 - (min(r, b) - g) / 235, then the magenta taken out of the colour), noise, easing, `reveal_mask` (growth from a point through a noisy edge), `step_difference`, ground glow and rings, flash, `Embers`, `Camera` (shake, push-in, `to_screen`), `write` |
| `cine/pieces.py` | `cut` (pieces from keyframe vs plate, feathered edges), `behind` (plate under the pieces, filler where the plate is empty), `mirrored_tile` |
| `cine/fx.py` | `Effects` (his sheets cut into cells, variants), `put`, `put_on_pair` (two points of an effect on two points of the scene: the eyes' burst on the two eyes), `stretch_into` (an effect over a piece, inside its shape), `step` |
| `fire-avatar/` | The Mirai fire avatar's summon: `forge.py` (its timeline: fire bursts from the ninja's feet, each piece forged in place with his swirl, sparks, molten metal, burst, glint and lava veins, the eyes last), `shield.json`, `spear.json`, `effects.json` |

A spec: `name`, `plugin`, `size`, `fps`, `duration`, `seed`, its pictures (repo paths in
`docs/reference/`), and what the plug-in needs (for the avatar: the piece zones in forging order,
the eyes, the ninja's feet and scale, the timing). Shared steps go into `cine/`; what belongs to one
subject stays in its plug-in.

## The fire avatar (approved by the owner, 2026-10-29)

`docs/CLANS_DESIGN.md`, Path of the Infernal Fire. His pictures: `docs/reference/fire-avatar-*` and
`fire-forge-effects-*` (rows in `docs/reference/README.md`). 4.6 s at 24 fps, 960x540 (the video
1280x720): the ground rings open at the ninja's feet, the avatar's fire bursts from there and
spreads, then coraza, pauldrons, arms, shield, spear and helmet are forged one after another out of
that fire, the eyes light with his burst, a flash and a slow push-in. The two variants of his
effects alternate piece by piece (shield starts on `a`, spear on `b`). The ninja's feet are at
(480, 526), scale 0.8 of his battle sprite.
