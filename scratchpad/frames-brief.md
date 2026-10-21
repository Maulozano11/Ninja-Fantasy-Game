NEW OWNER REQUEST (applies to your whole set): "all the jutsus displayed in the animation are too fast; make them with more frames so the player can appreciate them; it looks like a flashing star when it shouldn't."

The game side is done: commit 8ef28a9 slows the pacing. Impacts and blasts now last as long as their sheet's animation (at least 0.9 s / 1.2 s), projectiles fly about 115 ms per metre, and the next turn waits for the jutsu to finish. Your part is MORE FRAMES and smoother motion. Use these targets for every element so the sets match:

- **Flying loops** (bolt, sphere, slash, multi, stream, stream_head, breath): 8 frames, 10-12 fps. The motion between frames should be small and continuous: rotation, churn, flicker. Frame 0 stays HIS picture.
- **hit**: 12 frames at 12 fps (1 s).
  - Build up over 3 frames.
  - HIS picture is the peak at frames 3-4, and it HOLDS for 2-3 frames with only small changes.
  - Then dissipate slowly over 6+ frames: shrink, cool, scatter, fade.
  - No single-frame white flash or pop.
- **multi_hit** (earth only): same as hit.
- **blast**: 16 frames at 12 fps (about 1.3 s).
  - Anticipation for 3-4 frames.
  - HIS picture is the peak, held for 3 frames with small motion.
  - A long settle and fade over 8 frames.
- **Wall `rise`**: 12 frames at 12 fps. **Wall `idle`**: 8 frames at 10 fps.
- **aura / aura_back `idle`**: 12 frames at 10-12 fps, frame-synced. The veil keeps breathing.
- **Beasts**: no change.

Rules:
- Every new in-between comes from his pixels (grow, reveal, displace, cool, fade), not redrawn shapes.
- His picture stays the key frame.
- No frame may look like a flash: no full-sprite brightness jump between consecutive frames. A quick check: the mean alpha × brightness between neighbouring frames should change smoothly.
- Keep all other contracts: sprite names, anchors, tags, border check, determinism, typecheck. Every manifest row must stay under 8192 px wide. Only the fire annihilation's surge may be split into rows (surge, surge2...), because only it is played that way. If any other row would be too wide, use fewer frames for it and tell me.

Deliverables: refresh your compare sheet, your anims strip and your GIFs. In your report, give a table of the new frame counts and fps.
