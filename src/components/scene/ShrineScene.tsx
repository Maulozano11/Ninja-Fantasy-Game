import React from 'react';
import backdropUrl from '../../assets/scenes/creator_shrine/backdrop.png';

// The creator's scene since 2026-10-28: the owner's shrine courtyard at night (his generator, card 10
// of tools/refs/template/TARJETA_DE_PROMPT.md; docs/reference/creator-shrine-backdrop-owner-reference.png),
// red maples, lanterns, the torii over the water, the blue moon, and the stone circle with its red
// seal in the middle where the ninja stands. One painted picture: it covers the screen like the
// forest did, with its focus a little below the middle.

const W = 1672;
const H = 941;
/** The middle of the stone circle's seal, where the ninja's feet go (his picture's pixels). */
const STAGE = { x: 836, y: 628 };
const FOCUS_Y = 0.6;

export const SHRINE = { width: W, height: H, stage: STAGE };

export function ShrineScene({ className }: { className?: string }) {
  return (
    <img
      src={backdropUrl}
      alt=""
      aria-hidden
      draggable={false}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${FOCUS_Y * 100}%`, imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

/** Where the stone circle falls on screen when the picture covers a vw x vh box (see forestGround). */
export function shrineGround(vw: number, vh: number): number {
  const s = Math.max(vw / W, vh / H);
  return (vh - H * s) * FOCUS_Y + STAGE.y * s;
}
