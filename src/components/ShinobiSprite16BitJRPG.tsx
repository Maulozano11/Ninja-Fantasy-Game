import React, { useEffect, useRef } from 'react';
import {
  ShinobiCharacter,
  HairstyleType,
  ArmorStyleType,
  WeaponStyleType,
  CapeStyleType,
} from '../types/shinobi';

export interface ShinobiSprite16BitJRPGProps {
  character: ShinobiCharacter;
  stance?: 'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory';
  size?: number; // Target display size (e.g. 64, 128, 192, 256, 320)
  isEnhanced?: boolean;
  className?: string;
  showAura?: boolean;
  showShadow?: boolean;
}

// -----------------------------------------------------------------------------
// Advanced Hue-Shifting & Selout Color System
// -----------------------------------------------------------------------------
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

// Creates an advanced 5-tone ramp with cold shadow hue-shifting for authentic 16-bit JRPG depth
function create16BitRamp(baseHex: string, type: 'dark_fabric' | 'skin' | 'hair' | 'metal' | 'armor') {
  const { r, g, b } = hexToRgb(baseHex);

  if (type === 'dark_fabric') {
    // Trenchcoat / black clothes: shift shadows toward deep cold indigo/navy
    return {
      selout: '#080c14',       // Selective outline: deep obsidian navy (never flat black)
      crevice: '#0f1422',      // Deep crevice folds
      shadow: '#1a2030',       // Cold slate-indigo body shadow
      base: baseHex,           // Base cloth tone
      highlight: '#334155',    // Lit cloth crest
      specular: '#64748b',     // Crisp edge specular light
    };
  }

  if (type === 'skin') {
    // Skin: warm terracotta selout, peach midtone, warm ivory highlight
    return {
      selout: '#6b3017',       // Soft warm umber outline
      crevice: '#9a4724',      // Deep facial crease
      shadow: '#c97349',       // Warm jawline/neck shadow
      base: baseHex,           // Skin tone
      highlight: '#fed7aa',    // Cheeks & brow highlight
      specular: '#fff1e8',     // Nose tip & eye catchlight
    };
  }

  if (type === 'metal') {
    return {
      selout: '#1e293b',
      crevice: '#334155',
      shadow: '#475569',
      base: baseHex,
      highlight: '#cbd5e1',
      specular: '#ffffff',
    };
  }

  // Generic material with cold shadow shift
  return {
    selout: rgbToHex(r * 0.2, g * 0.22, b * 0.35),
    crevice: rgbToHex(r * 0.4, g * 0.42, b * 0.55),
    shadow: rgbToHex(r * 0.65, g * 0.68, b * 0.78),
    base: baseHex,
    highlight: rgbToHex(Math.min(255, r * 1.3 + 15), Math.min(255, g * 1.25 + 15), b * 1.1),
    specular: rgbToHex(Math.min(255, r * 1.5 + 40), Math.min(255, g * 1.45 + 40), Math.min(255, b * 1.3 + 40)),
  };
}

// Specialized hair ramp with clumps and specular catchlights
function create16BitHairRamp(baseHex: string, hairstyle: HairstyleType) {
  const isNoctis = hairstyle === 'Noctis Caelum';

  if (isNoctis || baseHex.toLowerCase() === '#181d28' || baseHex.toLowerCase() === '#0f172a') {
    return {
      selout: '#050811',      // Deep midnight navy selout
      crevice: '#0b0f1d',     // Crevice between hair clumps
      shadow: '#13192a',      // Cool steel shadow plane
      base: '#1a2238',        // Midnight indigo-slate base
      highlight: '#2563eb',   // Electric royal azure clump crest
      specular: '#93c5fd',    // Crisp 1-2px specular glint
      glint: '#ffffff',       // Pure white apex catchlight
    };
  }

  // Blonde archetypes (Naruto, Minato, Dio)
  if (baseHex.toLowerCase() === '#eab308' || baseHex.toLowerCase() === '#facc15') {
    return {
      selout: '#451a03',
      crevice: '#78350f',
      shadow: '#b45309',
      base: baseHex,
      highlight: '#fef08a',
      specular: '#fef9c3',
      glint: '#ffffff',
    };
  }

  // Silver / White archetypes (Kakashi, Tobirama)
  if (baseHex.toLowerCase() === '#e2e8f0' || baseHex.toLowerCase() === '#f1f5f9') {
    return {
      selout: '#1e293b',
      crevice: '#334155',
      shadow: '#64748b',
      base: baseHex,
      highlight: '#f8fafc',
      specular: '#ffffff',
      glint: '#ffffff',
    };
  }

  // Default rich anime hair ramp
  const { r, g, b } = hexToRgb(baseHex);
  return {
    selout: rgbToHex(r * 0.18, g * 0.2, b * 0.28),
    crevice: rgbToHex(r * 0.35, g * 0.38, b * 0.45),
    shadow: rgbToHex(r * 0.65, g * 0.68, b * 0.72),
    base: baseHex,
    highlight: rgbToHex(Math.min(255, r * 1.35 + 20), Math.min(255, g * 1.35 + 20), Math.min(255, b * 1.25 + 15)),
    specular: rgbToHex(Math.min(255, r * 1.55 + 50), Math.min(255, g * 1.55 + 50), Math.min(255, b * 1.5 + 40)),
    glint: '#ffffff',
  };
}

/**
 * 16-Bit JRPG / Fighting Game Advanced Pixel Art Sprite Renderer
 * Follows the 5 foundational masterclass techniques:
 * 1. Authentic 64x64 canvas scale with balanced 4.5-5 head JRPG proportions and South-East 3/4 perspective
 * 2. Selout (Selective Outlining) using material-matched color values instead of flat black lines
 * 3. Grouped volume blocks (Clumps) for hair locks and draped coat fabrics (Zero orphan noise pixels)
 * 4. Hue-shifting color ramps with cold shadow transitions and 1-2px specular highlights
 * 5. Clean, expressive facial planes with piercing single-pixel vibrant eyes (cyan for Noctis)
 */
export const ShinobiSprite16BitJRPG: React.FC<ShinobiSprite16BitJRPGProps> = ({
  character,
  stance = 'idle',
  size = 256,
  isEnhanced = false,
  className = '',
  showAura = true,
  showShadow = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId = 0;
    let tick = 0;

    const render = () => {
      tick++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const GRID = 64;
      ctx.clearRect(0, 0, GRID, GRID);
      ctx.imageSmoothingEnabled = false;

      // Stance animations
      const isIdle = stance === 'idle';
      const isAttacking = stance === 'attack';
      const isCasting = stance === 'cast';
      const isHurt = stance === 'hurt';
      const isVictory = stance === 'victory';
      const isHandsigns = stance === 'handsigns';

      // 16-bit JRPG breathing cycle (1px subtle chest & cloak pulse every 24 frames)
      const breath = isIdle ? (tick % 32 < 16 ? 0 : 1) : 0;
      const attackShiftX = isAttacking ? 3 : isHurt ? -2 : 0;
      const attackShiftY = isAttacking ? 1 : isHurt ? -1 : 0;
      const cloakWave = Math.sin(tick * 0.18) * 1.2;

      // Color Ramps
      const p = character.palette;
      const hair = create16BitHairRamp(p.hairColor, character.hairstyle);
      const skin = create16BitRamp(p.skinTone, 'skin');
      const coat = create16BitRamp(p.armorPrimary || '#181d28', 'dark_fabric');
      const pants = create16BitRamp(p.clothColor || '#0f172a', 'dark_fabric');
      const metal = create16BitRamp('#94a3b8', 'metal');
      const gold = {
        selout: '#451a03',
        shadow: '#78350f',
        base: '#eab308',
        highlight: '#fef08a',
        specular: '#ffffff',
      };

      // Drawing primitives on integer 64x64 grid
      const dot = (x: number, y: number, color: string) => {
        const px = Math.round(x + attackShiftX);
        const py = Math.round(y + attackShiftY);
        if (px >= 0 && px < GRID && py >= 0 && py < GRID) {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, 1, 1);
        }
      };

      const span = (y: number, x1: number, x2: number, color: string) => {
        const left = Math.round(Math.min(x1, x2) + attackShiftX);
        const right = Math.round(Math.max(x1, x2) + attackShiftX);
        const py = Math.round(y + attackShiftY);
        if (py >= 0 && py < GRID && right >= left) {
          ctx.fillStyle = color;
          ctx.fillRect(left, py, right - left + 1, 1);
        }
      };

      // -----------------------------------------------------------------------
      // 1. GROUND CONTACT SHADOW (Translucent soft ellipse under feet)
      // -----------------------------------------------------------------------
      if (showShadow) {
        ctx.fillStyle = 'rgba(7, 10, 19, 0.45)';
        ctx.beginPath();
        ctx.ellipse(32 + attackShiftX, 58 + attackShiftY, 13, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(4, 6, 12, 0.65)';
        ctx.beginPath();
        ctx.ellipse(32 + attackShiftX, 58 + attackShiftY, 8, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // -----------------------------------------------------------------------
      // 2. ENHANCED AURA / ROYAL PHANTOM WARP ENERGY
      // -----------------------------------------------------------------------
      if (showAura && (isEnhanced || isCasting)) {
        const auraAlpha = 0.35 + Math.sin(tick * 0.2) * 0.15;
        ctx.fillStyle = `rgba(56, 189, 248, ${auraAlpha})`;
        // Floating azure warp particles
        for (let i = 0; i < 5; i++) {
          const px = 20 + ((tick * 1.5 + i * 11) % 26);
          const py = 52 - ((tick * 1.2 + i * 9) % 45);
          dot(px, py, '#38bdf8');
          dot(px + 1, py, '#bae6fd');
        }
      }

      // -----------------------------------------------------------------------
      // 3. REAR HAIR LOCKS (Drawn behind body in South-East 3/4 perspective)
      // Sculpted in cohesive triangular clumps flaring backward-left
      // -----------------------------------------------------------------------
      // Occipital Clump 1: Upper-left crest
      span(13, 23, 26, hair.selout);
      span(14, 21, 26, hair.crevice);
      span(15, 20, 27, hair.shadow);
      span(16, 21, 28, hair.base);
      dot(22, 16, hair.highlight);

      // Occipital Clump 2: Mid flare behind skull
      span(17, 19, 25, hair.selout);
      span(18, 18, 26, hair.shadow);
      span(19, 19, 27, hair.base);
      dot(20, 19, hair.highlight);
      span(20, 21, 28, hair.shadow);

      // Occipital Clump 3: Lower nape flare
      span(21, 20, 26, hair.crevice);
      span(22, 21, 25, hair.selout);

      // -----------------------------------------------------------------------
      // 4. WEAPON HILT / SCABBARD (Resting along left hip in 3/4 depth)
      // -----------------------------------------------------------------------
      // Scabbard angle from (x = 18, y = 30) down to (x = 13, y = 46)
      for (let i = 0; i < 14; i++) {
        const sx = 20 - Math.floor(i * 0.5);
        const sy = 33 + i;
        dot(sx, sy, coat.selout);
        dot(sx + 1, sy, metal.shadow);
        if (i === 3 || i === 8) dot(sx + 1, sy, gold.base); // Scabbard fittings
      }

      // -----------------------------------------------------------------------
      // 5. LEGS & COMBAT BOOTS (South-East athletic stance)
      // Left leg forward & weighted (x = 26..30); Right leg back in depth (x = 34..38)
      // -----------------------------------------------------------------------
      // Left Leg (Front / Light side)
      // Thigh
      span(37, 26, 31, pants.shadow);
      span(38, 26, 31, pants.base);
      span(39, 26, 31, pants.base);
      dot(27, 39, pants.highlight);
      span(40, 26, 30, pants.base);
      dot(27, 40, pants.highlight);
      // Knee joint fold
      span(41, 26, 30, pants.crevice);
      dot(26, 41, pants.selout);
      // Calf
      span(42, 26, 29, pants.shadow);
      span(43, 26, 29, pants.base);
      span(44, 26, 29, pants.base);

      // Left High-Top Combat Boot (Forward)
      span(45, 25, 30, coat.crevice); // Boot folded cuff
      span(46, 25, 30, coat.shadow);
      dot(26, 46, coat.highlight);
      span(47, 25, 30, coat.base);
      dot(26, 47, coat.highlight);
      span(48, 25, 30, coat.shadow);
      span(49, 25, 31, coat.base);
      dot(26, 49, coat.highlight);
      // Ankle & Foot
      span(50, 24, 31, coat.shadow);
      span(51, 24, 32, coat.base);
      dot(25, 51, coat.highlight);
      dot(26, 51, coat.specular); // Specular leather glint
      span(52, 23, 33, coat.shadow);
      span(53, 22, 33, coat.crevice);
      // Sole
      span(54, 22, 33, coat.selout);
      dot(32, 54, metal.specular); // Heel tap glint

      // Right Leg (Back / Receding in depth)
      span(38, 33, 37, pants.crevice);
      span(39, 33, 37, pants.shadow);
      span(40, 34, 37, pants.shadow);
      span(41, 34, 37, pants.crevice);
      span(42, 34, 38, pants.shadow);
      span(43, 35, 38, pants.shadow);
      span(44, 35, 38, pants.crevice);
      // Right Boot
      span(45, 35, 39, coat.crevice);
      span(46, 35, 39, coat.shadow);
      span(47, 35, 40, coat.shadow);
      span(48, 36, 40, coat.crevice);
      span(49, 36, 41, coat.shadow);
      span(50, 36, 41, coat.crevice);
      span(51, 37, 42, coat.selout);

      // -----------------------------------------------------------------------
      // 6. TRENCHCOAT / DUSTER JACKET TAILS (Large flowing volume folds)
      // Cascades from hips down with volumetric fold creases and selout
      // -----------------------------------------------------------------------
      const tailWave = Math.round(cloakWave);
      // Rear coat hem (Left drape)
      for (let y = 35; y <= 47; y++) {
        const spread = Math.floor((y - 35) * 0.4);
        const lx = 21 - spread + tailWave;
        const rx = 26 - Math.floor(spread * 0.3);
        span(y, lx, rx, y % 2 === 0 ? coat.shadow : coat.crevice);
        dot(lx, y, coat.selout);
        if (y < 42) dot(lx + 1, y, coat.base);
      }
      // Right coat drape (Receding behind right leg)
      for (let y = 35; y <= 45; y++) {
        const spread = Math.floor((y - 35) * 0.3);
        const lx = 37;
        const rx = 40 + spread;
        span(y, lx, rx, coat.crevice);
        dot(rx, y, coat.selout);
      }

      // -----------------------------------------------------------------------
      // 7. TORSO & 3/4 CHEST (South-East Rotated Core)
      // Broader left chest (x = 24..31), receding right chest (x = 32..38)
      // -----------------------------------------------------------------------
      const torsoY = 23 + breath;

      // High Popped Leather Collar (Flaring behind neck & jaw)
      // Left collar flap (Erect leather rim framing left cheek)
      span(torsoY - 3, 23, 26, coat.selout);
      span(torsoY - 2, 23, 27, coat.crevice);
      span(torsoY - 1, 23, 27, coat.shadow);
      dot(24, torsoY - 1, coat.highlight); // Lit collar rim
      // Right collar flap (Receding)
      span(torsoY - 3, 35, 38, coat.selout);
      span(torsoY - 2, 34, 38, coat.crevice);
      span(torsoY - 1, 34, 37, coat.shadow);

      // Neck (Warm skin plane with jawline shadow)
      span(torsoY - 1, 28, 33, skin.crevice);
      span(torsoY, 28, 33, skin.shadow);
      dot(29, torsoY, skin.highlight);

      // Popped Lapels & V-Neck Opening
      span(torsoY + 1, 24, 37, coat.shadow);
      dot(24, torsoY + 1, coat.selout);
      dot(37, torsoY + 1, coat.selout);
      // Inner shirt V-slit
      span(torsoY + 1, 29, 32, pants.crevice);
      dot(30, torsoY + 1, skin.shadow); // Exposed collarbone skin

      // Chest & Upper Torso
      span(torsoY + 2, 24, 37, coat.base);
      dot(24, torsoY + 2, coat.selout);
      dot(25, torsoY + 2, coat.highlight);
      dot(37, torsoY + 2, coat.selout);
      dot(30, torsoY + 2, pants.crevice);

      span(torsoY + 3, 24, 37, coat.base);
      span(torsoY + 3, 25, 28, coat.highlight); // Lit left chest plane
      dot(31, torsoY + 3, coat.crevice); // Central zipper/seam
      span(torsoY + 3, 33, 36, coat.shadow);

      span(torsoY + 4, 24, 37, coat.base);
      dot(25, torsoY + 4, coat.highlight);
      dot(31, torsoY + 4, coat.crevice);
      span(torsoY + 4, 33, 36, coat.shadow);

      // Midriff & Ribs
      span(torsoY + 5, 25, 36, coat.shadow);
      dot(26, torsoY + 5, coat.base);
      dot(31, torsoY + 5, coat.crevice);
      span(torsoY + 6, 25, 36, coat.shadow);
      dot(26, torsoY + 6, coat.base);
      dot(31, torsoY + 6, coat.crevice);

      // Double Buckle Belt & Silver Clasp
      span(torsoY + 7, 24, 37, coat.crevice);
      span(torsoY + 8, 24, 37, pants.selout);
      // Silver Belt Buckle at x = 29..31
      span(torsoY + 7, 29, 31, metal.highlight);
      dot(30, torsoY + 7, metal.specular); // 1px specular white gleam!
      span(torsoY + 8, 29, 31, metal.shadow);

      // Waistband / Coat Split
      span(torsoY + 9, 25, 36, coat.shadow);
      dot(30, torsoY + 9, coat.selout);

      // -----------------------------------------------------------------------
      // 8. ARMS & HANDS (3/4 Articulated Perspective)
      // -----------------------------------------------------------------------
      if (isHandsigns) {
        // Ninja Tiger Seal / Royal Focus: Hands joined at center chest
        span(torsoY + 3, 28, 33, skin.highlight);
        span(torsoY + 4, 27, 34, skin.base);
        dot(30, torsoY + 3, skin.specular);
        dot(31, torsoY + 3, skin.specular);
        // Azure chakra focus burst at fingertips
        dot(30, torsoY + 2, '#38bdf8');
        dot(31, torsoY + 2, '#ffffff');
      } else if (isAttacking) {
        // Dynamic Katana Slash Forward!
        // Right Arm extended
        span(torsoY + 2, 37, 46, coat.base);
        dot(46, torsoY + 2, skin.base);
        // Katana Blade sweeping forward
        for (let k = 0; k < 18; k++) {
          const bx = 47 + k;
          const by = torsoY - 2 + Math.floor(k * 0.3);
          dot(bx, by, metal.highlight);
          dot(bx, by - 1, metal.specular);
          dot(bx, by + 1, metal.selout);
        }
        dot(64, torsoY + 3, '#ffffff'); // Tip sparkle
      } else {
        // Idle / Battle-Ready Stance
        // Left Arm (Forearm resting at side near hip / hilt)
        span(torsoY + 2, 21, 24, coat.shadow); // Left shoulder
        dot(21, torsoY + 2, coat.selout);
        span(torsoY + 3, 21, 24, coat.base);
        dot(22, torsoY + 3, coat.highlight);
        span(torsoY + 4, 20, 23, coat.base);
        span(torsoY + 5, 20, 23, coat.shadow);
        // Left Forearm & Leather Glove
        span(torsoY + 6, 19, 22, coat.crevice);
        span(torsoY + 7, 19, 22, coat.shadow);
        dot(20, torsoY + 7, coat.highlight);
        span(torsoY + 8, 19, 22, coat.base);
        // Left Hand resting on Katana Tsuba
        span(torsoY + 9, 19, 21, skin.base);
        dot(19, torsoY + 9, skin.highlight);
        dot(20, torsoY + 8, gold.base); // Gold sword guard

        // Katana Blade Sheathed / Extended behind
        dot(18, torsoY + 7, metal.shadow); // Pommel
        dot(18, torsoY + 6, gold.highlight); // Pommel cap
        dot(17, torsoY + 5, metal.selout);

        // Right Arm (Receding back in depth)
        span(torsoY + 2, 37, 40, coat.shadow);
        span(torsoY + 3, 37, 40, coat.crevice);
        span(torsoY + 4, 38, 41, coat.shadow);
        span(torsoY + 5, 38, 41, coat.crevice);
        span(torsoY + 6, 38, 40, coat.shadow);
        span(torsoY + 7, 37, 39, skin.shadow); // Right hand relaxed
      }

      // -----------------------------------------------------------------------
      // 9. HEAD & 3/4 ANIME FACE (Clean Planes, No Dirty Noise!)
      // Head bounds: y = 8 to 22. Chin point at x = 29, y = 21.
      // -----------------------------------------------------------------------
      const faceY = 9 + breath;

      // Base Cranium / Skull Silhouette
      span(faceY, 26, 35, skin.selout);
      span(faceY + 1, 25, 36, skin.crevice);
      span(faceY + 2, 25, 37, skin.shadow);

      // Facial Plane Fill (Lit from upper-left)
      for (let y = faceY + 3; y <= faceY + 8; y++) {
        span(y, 25, 36, skin.base);
        dot(25, y, skin.shadow); // Left edge jaw shadow
        span(y, 26, 29, skin.highlight); // Lit cheek/forehead
        dot(36, y, skin.shadow); // Right edge receding shadow
      }

      // Contoured 3/4 Jawline tapering to pointed anime chin
      span(faceY + 9, 26, 35, skin.base);
      dot(26, faceY + 9, skin.shadow);
      dot(35, faceY + 9, skin.shadow);

      span(faceY + 10, 27, 33, skin.base);
      dot(27, faceY + 10, skin.shadow);
      dot(33, faceY + 10, skin.shadow);

      span(faceY + 11, 28, 31, skin.shadow); // Chin contour
      dot(29, faceY + 12, skin.selout); // Chin apex tip (x = 29, y = 21)

      // -----------------------------------------------------------------------
      // 10. PIERCING CRYSTAL CYAN EYES & BROW (Noctis Signature Focal Point)
      // "Un solo píxel de color vibrante define la expresión completa"
      // -----------------------------------------------------------------------
      const eyeY = faceY + 6;

      // Eyebrow lines (Determined, slight downward angle)
      // Left brow
      dot(26, eyeY - 1, hair.selout);
      dot(27, eyeY - 1, hair.shadow);
      dot(28, eyeY - 1, hair.shadow);
      // Right brow
      dot(31, eyeY - 1, hair.shadow);
      dot(32, eyeY - 1, hair.shadow);
      dot(33, eyeY - 1, hair.selout);

      // Left Eye (Foreground / Focused)
      dot(26, eyeY, hair.selout); // Upper eyelash line
      dot(27, eyeY, hair.selout);
      dot(28, eyeY, hair.shadow);
      // Iris: Luminous crystal cyan with white sparkle!
      dot(26, eyeY + 1, '#0284c7'); // Deep azure shadow
      dot(27, eyeY + 1, '#00f0ff'); // Piercing crystal cyan core!
      dot(28, eyeY + 1, '#ffffff'); // Specular catchlight gleam!

      // Right Eye (Receding in 3/4 depth)
      dot(31, eyeY, hair.shadow);
      dot(32, eyeY, hair.selout);
      dot(31, eyeY + 1, '#00f0ff'); // Piercing cyan iris
      dot(32, eyeY + 1, '#38bdf8'); // Sky blue pupil

      // Nose & Mouth (Subtle minimal 16-bit detail)
      dot(29, eyeY + 2, skin.shadow); // Soft nose bridge hint
      dot(29, eyeY + 4, skin.crevice); // Confident mouth line
      dot(30, eyeY + 4, skin.shadow);

      // -----------------------------------------------------------------------
      // 11. SCULPTED CLUMP HAIR (Volume Blocks with Hue-Shift & Specular Sheen)
      // Triangular clustered locks: Crown crest, occipital tufts, and brow fringe
      // -----------------------------------------------------------------------
      // Skull Cap Dome
      span(faceY - 2, 26, 35, hair.selout);
      span(faceY - 1, 24, 37, hair.crevice);
      span(faceY, 23, 38, hair.shadow);
      span(faceY + 1, 23, 38, hair.base);

      // CLUMP A: Tall Crown Peak (Apex crown spike angled backward-left)
      for (let r = 0; r < 6; r++) {
        const sy = faceY - 7 + r;
        const w = Math.floor(r * 0.7);
        span(sy, 28 - w, 31 + w, hair.base);
        dot(28 - w, sy, hair.selout);
        dot(31 + w, sy, hair.shadow);
        if (r < 3) dot(29, sy, hair.highlight);
      }
      dot(29, faceY - 8, hair.selout); // Peak tip
      dot(29, faceY - 7, hair.specular); // Specular glint
      dot(30, faceY - 7, hair.glint); // Pure white apex glint!

      // CLUMP B: Left High Crest (Backward-left flare)
      for (let r = 0; r < 5; r++) {
        const sy = faceY - 5 + r;
        const w = Math.floor(r * 0.6);
        span(sy, 24 - w, 27 + w, hair.base);
        dot(24 - w, sy, hair.selout);
        dot(27 + w, sy, hair.shadow);
      }
      dot(24, faceY - 6, hair.selout);
      dot(25, faceY - 5, hair.highlight);

      // CLUMP C: Right Crown Flange (Receding crest)
      for (let r = 0; r < 5; r++) {
        const sy = faceY - 5 + r;
        const w = Math.floor(r * 0.5);
        span(sy, 33 - w, 36 + w, hair.shadow);
        dot(36 + w, sy, hair.selout);
      }
      dot(35, faceY - 6, hair.selout);

      // Glossy Angel-Ring Catchlight Sheen across crown dome
      span(faceY - 1, 26, 34, hair.highlight);
      span(faceY, 27, 33, hair.specular);
      dot(28, faceY, hair.glint); // Pure white specular sheen
      dot(29, faceY, hair.glint);
      dot(31, faceY, hair.glint);

      // CLUMP D: Left Cheek Framing Lock (Falling down past left cheek to collar)
      for (let r = 0; r < 9; r++) {
        const sy = faceY + 2 + r;
        span(sy, 22, 24, hair.base);
        dot(22, sy, hair.highlight);
        if (r < 4) dot(23, sy, hair.specular);
        dot(24, sy, hair.shadow);
      }
      dot(22, faceY + 11, hair.selout); // Lock tapered point

      // CLUMP E: Sweeping Asymmetrical Brow Fringe (Signature Noctis Bangs!)
      // Cascades diagonally across brow from crown down between the eyes
      span(faceY + 2, 26, 32, hair.base);
      span(faceY + 3, 27, 33, hair.highlight);
      dot(28, faceY + 3, hair.specular); // Specular glint on fringe ridge!

      // Main diagonal tapering lock falling over brow
      span(faceY + 4, 27, 30, hair.base);
      dot(27, faceY + 4, hair.highlight);
      dot(30, faceY + 4, hair.shadow);

      span(faceY + 5, 28, 30, hair.base);
      dot(28, faceY + 5, hair.highlight);
      dot(30, faceY + 5, hair.shadow);

      // Tapered fringe tip kissing bridge of nose
      dot(29, faceY + 6, hair.highlight);
      dot(29, faceY + 7, hair.base);
      dot(29, faceY + 8, hair.selout); // Tapered needle tip!

      // Secondary right forehead wisp
      span(faceY + 3, 34, 37, hair.shadow);
      span(faceY + 4, 34, 36, hair.shadow);
      dot(35, faceY + 5, hair.selout);

      // -----------------------------------------------------------------------
      // 12. SPECIAL: KOKORO / HEADBAND IF EQUIPPED
      // -----------------------------------------------------------------------
      if (character.headbandPosition === 'Forehead' && character.hairstyle !== 'Noctis Caelum') {
        const hbY = faceY + 1;
        span(hbY, 24, 37, '#1e3a8a');
        span(hbY + 1, 24, 37, '#1e3a8a');
        // Metal Leaf Plate
        span(hbY, 28, 33, metal.highlight);
        span(hbY + 1, 28, 33, metal.base);
        dot(29, hbY, metal.specular); // Plate shine
      }
    };

    render();
    const interval = setInterval(render, 50); // 20 FPS micro-motion
    return () => {
      clearInterval(interval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [character, stance, isEnhanced, showAura, showShadow]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <canvas
        ref={canvasRef}
        width={64}
        height={64}
        className="w-full h-full pointer-events-none drop-shadow-md pixelated"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};
