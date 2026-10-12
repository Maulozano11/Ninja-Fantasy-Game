import React, { useEffect, useRef } from 'react';
import { ShinobiCharacter } from '../types/shinobi';
import { ShinobiSpriteHD } from './ShinobiSpriteHD';
import { ShinobiSprite16BitJRPG } from './ShinobiSprite16BitJRPG';

export interface ShinobiSpriteCanvasProps {
  character: ShinobiCharacter;
  stance?: 'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory';
  size?: number; // Visual render size in px (e.g. 128, 256, 384, 512)
  isEnhanced?: boolean;
  className?: string;
  showAura?: boolean;
  showShadow?: boolean;
  renderEngine?: 'hd' | 'pixel' | 'jrpg_16bit';
  pixelScaleMode?: 'jrpg_64' | 'classic_128';
}

// -----------------------------------------------------------------------------
// Advanced Color & Hue-Shifting Utilities for South-East Chibi Pixel Art
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

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const factor = 1 + percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

// 6-Tone Selective Shading Ramp:
// outline (dark selout), deepShadow, shadow, base, highlight, shine
function makeRamp(baseHex: string, customOutline?: string) {
  const deepShadow = adjustBrightness(baseHex, -52);
  const shadow = adjustBrightness(baseHex, -26);
  const highlight = adjustBrightness(baseHex, 24);
  const shine = adjustBrightness(baseHex, 50);
  const outline = customOutline || adjustBrightness(baseHex, -70);
  return {
    outline,
    deepShadow,
    shadow,
    base: baseHex,
    highlight,
    shine,
  };
}

// Specialized Anime Hair Palette with Hue-Shifting & Specular Ramps
// (Ensures authentic 16-bit JRPG sprite lighting for all hair color archetypes)
function makeHairRamp(baseHex: string, hairstyle?: string) {
  const rgb = hexToRgb(baseHex);
  const r = rgb.r;
  const g = rgb.g;
  const b = rgb.b;

  // Noctis Lucis Caelum / Midnight Indigo-Slate Archetype
  // (Full authentic 16-bit JRPG prince: midnight slate base with high-contrast electric azure catchlights)
  if (
    hairstyle === 'Noctis Caelum' ||
    baseHex.toLowerCase() === '#181d28' ||
    baseHex.toLowerCase() === '#0f172a' ||
    (r >= 10 && r <= 45 && g >= 15 && g <= 50 && b >= 25 && b <= 75)
  ) {
    return {
      outline: '#040609',      // Deepest obsidian selout contour
      deepShadow: '#0a0d14',   // Midnight obsidian crevice shadow
      shadow: '#111726',       // Deep steel-indigo shadow
      base: baseHex,          // Midnight indigo-slate base
      highlight: '#3b82f6',    // High-contrast electric azure sheen
      shine: '#93c5fd',        // Specular crystal catchlight gleam
    };
  }

  // Golden Blonde / Sunlight Yellow Archetype (Naruto, Minato, Dio, Cloud)
  if ((r > 170 && g > 135 && b < 110) || baseHex.toLowerCase() === '#eab308' || baseHex.toLowerCase() === '#facc15') {
    return {
      outline: '#1c1103',      // Deepest warm umber contour
      deepShadow: '#78350f',   // Rich chestnut/amber crevice shadow
      shadow: '#b45309',       // Saturated honey bronze shadow
      base: baseHex,          // Saturated anime golden yellow
      highlight: '#fef08a',    // Crisp pale lemon highlight
      shine: '#ffffff',        // Specular pure white peak glint
    };
  }

  // Raven / Midnight Blue / Obsidian Archetype (Sasuke, Rukia, Madara, Itachi)
  if ((r < 55 && g < 55 && b < 75) || baseHex.toLowerCase() === '#18181b' || baseHex.toLowerCase() === '#09090b') {
    return {
      outline: '#04060c',      // Deepest midnight contour
      deepShadow: '#090d16',   // Obsidian crevice shadow
      shadow: '#162032',       // Deep navy-slate core shadow
      base: '#222f42',        // Midnight navy base
      highlight: '#38bdf8',    // Electric cyan/sapphire sheen ridge
      shine: '#ffffff',        // Specular white catchlight gleam
    };
  }

  // Silver / Platinum / White Archetype (Kakashi, Sephiroth, Android)
  if ((r > 180 && g > 185 && b > 195 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) || baseHex.toLowerCase() === '#e2e8f0') {
    return {
      outline: '#0a0f1d',      // Dark slate outline
      deepShadow: '#1e293b',   // Deep slate crevice
      shadow: '#475569',       // Cool steel shadow
      base: baseHex,          // Luminous platinum
      highlight: '#f8fafc',    // Pure snow highlight
      shine: '#ffffff',        // Brilliant specular glint
    };
  }

  // Crimson / Scarlet / Ruby Archetype (Gaara, Kushina)
  if (r > 150 && g < 75 && b < 75) {
    return {
      outline: '#1f0404',
      deepShadow: '#450a0a',
      shadow: '#991b1b',
      base: baseHex,
      highlight: '#f87171',
      shine: '#ffffff',
    };
  }

  // Chestnut / Auburn / Chocolate Brown Archetype (Android 21, Aiden)
  if (r > 90 && r < 190 && g > 40 && g < 130 && b < 70) {
    return {
      outline: '#1c0a02',
      deepShadow: '#451a03',
      shadow: '#78350f',
      base: baseHex,
      highlight: '#ea580c',
      shine: '#fed7aa',
    };
  }

  return makeRamp(baseHex, adjustBrightness(baseHex, -70));
}

function getVillageEmblem(character: ShinobiCharacter): 'Leaf' | 'Sand' | 'Mist' | 'Cloud' | 'Stone' | 'Rogue' {
  if (character.headbandPosition === 'Rogue Scratched') return 'Rogue';
  const text = (character.name + ' ' + character.title + ' ' + character.clan).toLowerCase();
  if (text.includes('sand') || text.includes('suna') || text.includes('wind') || text.includes('gaara')) return 'Sand';
  if (text.includes('mist') || text.includes('kiri') || text.includes('zabuza') || text.includes('kisame')) return 'Mist';
  if (text.includes('cloud') || text.includes('kumo') || text.includes('raikage') || text.includes('bee')) return 'Cloud';
  if (text.includes('stone') || text.includes('iwa') || text.includes('tsuchikage')) return 'Stone';
  return 'Leaf';
}

/**
 * South-East Isometric Pixel Art Sprite Engine (128x128 Pixel Canvas)
 * Handcrafted 2.5–3 Head Chibi Proportions:
 * - Expressive Anime 3/4 Face: almond eyes with catchlights, eyelids, pupil & Dojutsu,
 *   crisp eyebrows, South-East nose, animated mouth, clean bangs framing face without blocking eyes.
 * - Solid Seamless Body: Neck -> High Collar -> Torso -> Full Stomach Midriff -> Heavy Belt
 *   -> Pelvis / Inguinal Hips -> Seamless Leg Tops (NO missing stomach or leg parts!).
 * - Full Stance Poses: During 'handsigns', arms are brought together at chest center in an
 *   authentic Tiger/Ram seal with glowing chakra pulse, completely removing side-arms!
 */
const ShinobiPixelCanvas: React.FC<ShinobiSpriteCanvasProps> = ({
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

      // Fixed 128x128 classic pixel grid
      const GRID = 128;
      ctx.clearRect(0, 0, GRID, GRID);
      ctx.imageSmoothingEnabled = false;

      // Animation Stance Flags
      const isIdle = stance === 'idle';
      const isAttacking = stance === 'attack';
      const isCasting = stance === 'cast';
      const isHurt = stance === 'hurt';
      const isVictory = stance === 'victory';
      const isHandsigns = stance === 'handsigns';

      // Subtle breathing & dynamic motion
      const breath = isIdle
        ? (tick % 28 < 14 ? 0 : 1)
        : isCasting
        ? Math.round(Math.sin(tick * 0.25) * 1.5)
        : 0;

      // Stance coordinate offsets
      const posX = isAttacking ? 5 : isHurt ? -3 : 0;
      const posY = isAttacking ? 2 : isHurt ? -2 : isCasting ? 2 : 0;

      // Wave physics for ribbons & cape
      const ribbonWave = Math.sin(tick * 0.2) * 2.2;
      const capeWave = Math.sin(tick * 0.14) * 2.5;
      const sparkCycle = Math.sin(tick * 0.5);
      const rasenganAngle = tick * 0.25;

      // Color Ramps
      const p = character.palette;
      const skin = makeRamp(p.skinTone, '#451a03');
      const hair = makeHairRamp(p.hairColor, character.hairstyle);
      const cloth = makeRamp(p.clothColor, '#090d16');
      const armor = makeRamp(p.armorPrimary, '#131b22');
      const armorSec = makeRamp(p.armorSecondary || '#334155', '#0f172a');
      const headband = makeRamp(p.headbandCloth, '#090d16');
      const chakra = makeRamp(p.chakraAuraColor, '#030712');
      const capeColor = p.capeColor || armorSec.base;
      const cape = makeRamp(capeColor, '#130e12');

      // Metallic & Accent Tokens
      const silverWhite = '#ffffff';
      const silverShine = '#f1f5f9';
      const silverMid = '#94a3b8';
      const silverDark = '#475569';
      const silverDeep = '#1e293b';
      const goldTrim = '#eab308';
      const goldShine = '#fef08a';
      const goldDark = '#854d0e';

      // Pixel Drawing Primitives
      const dot = (x: number, y: number, color: string) => {
        const px = Math.round(x + posX);
        const py = Math.round(y + posY);
        if (px >= 0 && px < GRID && py >= 0 && py < GRID) {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, 1, 1);
        }
      };

      const rect = (x: number, y: number, w: number, h: number, color: string) => {
        const px = Math.round(x + posX);
        const py = Math.round(y + posY);
        ctx.fillStyle = color;
        ctx.fillRect(px, py, w, h);
      };

      const span = (y: number, x1: number, x2: number, color: string) => {
        const startX = Math.round(Math.min(x1, x2) + posX);
        const endX = Math.round(Math.max(x1, x2) + posX);
        const py = Math.round(y + posY);
        if (py >= 0 && py < GRID && endX >= startX) {
          ctx.fillStyle = color;
          ctx.fillRect(startX, py, endX - startX + 1, 1);
        }
      };

      const shadedSpan = (
        y: number,
        x1: number,
        x2: number,
        ramp: { outline: string; deepShadow: string; shadow: string; base: string; highlight: string; shine: string }
      ) => {
        const left = Math.round(Math.min(x1, x2));
        const right = Math.round(Math.max(x1, x2));
        if (right < left) return;

        dot(left, y, ramp.outline);
        dot(right, y, ramp.outline);

        if (right - left <= 1) return;

        span(y, left + 1, right - 1, ramp.base);

        if (right - left > 2) {
          dot(left + 1, y, ramp.highlight);
        }
        if (right - left > 4) {
          dot(right - 1, y, ramp.shadow);
        }
        if (right - left > 6) {
          dot(right - 2, y, ramp.shadow);
        }
      };

      const trapezoid = (
        y1: number,
        y2: number,
        x1Start: number,
        x2Start: number,
        x1End: number,
        x2End: number,
        color: string
      ) => {
        const steps = y2 - y1;
        if (steps <= 0) return;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const left = x1Start + (x2Start - x1Start) * t;
          const right = x1End + (x2End - x1End) * t;
          span(y1 + i, left, right, color);
        }
      };

      // -----------------------------------------------------------------------
      // 1. CHAKRA SURGE AURA (Behind Sprite)
      // -----------------------------------------------------------------------
      if ((isEnhanced || character.isEnhancedMode || isCasting || isVictory) && showAura) {
        ctx.save();
        const auraAlpha = 0.5 + Math.sin(tick * 0.18) * 0.2;
        ctx.globalAlpha = auraAlpha;

        for (let i = 0; i < 24; i++) {
          const t = (tick * 0.8 + i * 5) % 95;
          const spread = (95 - t) * 0.38 + 12;
          const ax = 64 + posX + Math.cos(i * 0.9 + tick * 0.1) * spread;
          const ay = 110 + posY - t;
          const ar = Math.max(1.2, 6.5 - t * 0.05);

          ctx.fillStyle = i % 3 === 0 ? chakra.shine : i % 3 === 1 ? chakra.highlight : chakra.base;
          ctx.beginPath();
          ctx.arc(ax, ay, ar, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 0.18;
        rect(34, 28 + breath, 60, 84, chakra.base);
        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // 2. ISOMETRIC CONTACT SHADOW (Grounded beneath South-East stance)
      // -----------------------------------------------------------------------
      if (showShadow) {
        ctx.save();
        ctx.fillStyle = 'rgba(8, 12, 20, 0.45)';
        ctx.beginPath();
        ctx.ellipse(64 + posX * 0.3, 112, 28, 9, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(8, 12, 20, 0.85)';
        ctx.beginPath();
        ctx.ellipse(64 + posX * 0.3, 112, 18, 5.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // 3. BACK-SLUNG WEAPON (KATANA / SAYA / SCABBARD)
      // -----------------------------------------------------------------------
      const weapon = character.weaponStyle || 'Katana Blade';
      if ((weapon === 'Katana Blade' || isIdle) && !isAttacking) {
        // Pommel / Kashira
        span(24 + breath, 36, 40, '#090d16');
        span(25 + breath, 35, 41, silverMid);
        span(26 + breath, 36, 40, silverWhite);
        dot(38, 25 + breath, '#ffffff');

        // Tsuka / Wrapped Grip
        for (let r = 0; r < 10; r++) {
          const gy = 27 + breath + r;
          const gx = 38 + r * 0.55;
          span(gy, gx, gx + 4, '#090d16');
          span(gy, gx + 1, gx + 3, r % 2 === 0 ? cloth.deepShadow : goldTrim);
          if (r % 2 === 1) dot(gx + 2, gy, goldShine);
        }

        // Tsuba / Crossguard
        span(37 + breath, 43, 51, '#090d16');
        span(38 + breath, 44, 50, goldTrim);
        span(38 + breath, 46, 48, goldShine);
        span(39 + breath, 43, 51, goldDark);

        // Scabbard (Saya) extending behind back
        for (let r = 0; r < 24; r++) {
          const sy = 40 + breath + r;
          const sx = 48 + r * 0.7;
          span(sy, sx, sx + 5, '#090d16');
          span(sy, sx + 1, sx + 4, cloth.deepShadow);
          if (r % 5 === 0) dot(sx + 2, sy, goldTrim);
        }
        span(64 + breath, 65, 69, goldTrim);
        dot(67, 64 + breath, goldShine);
      }

      // -----------------------------------------------------------------------
      // 4. CAPE / HAORI / SHIMENAWA
      // -----------------------------------------------------------------------
      const capeStyle = character.capeStyle || 'None';
      const cY = 54 + breath;

      if (
        capeStyle === 'Crimson Billowing Knight Cape' ||
        capeStyle === 'Akatsuki Black Cloak' ||
        capeStyle === 'Hokage White Haori' ||
        capeStyle === 'Ronin Traveler Cape'
      ) {
        const cCol =
          capeStyle === 'Crimson Billowing Knight Cape'
            ? '#991b1b'
            : capeStyle === 'Akatsuki Black Cloak'
            ? '#09090b'
            : capeStyle === 'Hokage White Haori'
            ? '#f8fafc'
            : '#475569';
        const cShad = adjustBrightness(cCol, -35);
        const cOut = '#090d16';

        for (let r = 0; r < 46; r++) {
          const cy = cY + r;
          const left = 32 + capeWave * (0.2 + r * 0.02) - (r > 16 ? (r - 16) * 0.4 : 0);
          const right = 82 + capeWave * (0.1 + r * 0.015) + (r > 16 ? (r - 16) * 0.35 : 0);
          span(cy, left - 1, right + 1, cOut);
          span(cy, left, right, r % 4 === 0 ? cShad : cCol);
          dot(left + 2, cy, adjustBrightness(cCol, 20));
        }

        if (capeStyle === 'Akatsuki Black Cloak') {
          rect(42 + capeWave, cY + 22, 10, 7, '#dc2626');
          rect(44 + capeWave, cY + 24, 6, 3, '#ffffff');
          dot(41 + capeWave, cY + 25, '#ffffff');
          dot(52 + capeWave, cY + 25, '#ffffff');
        } else if (capeStyle === 'Hokage White Haori') {
          for (let f = 0; f < 5; f++) {
            rect(36 + f * 9 + capeWave, cY + 34, 5, 8, '#dc2626');
            rect(37 + f * 9 + capeWave, cY + 37, 3, 5, '#f97316');
          }
        }
      } else if (capeStyle === 'Sasuke Shimenawa Rope') {
        const ry = 68 + breath;
        rect(48, ry - 3, 8, 6, '#7c3aed');
        rect(68, ry - 3, 8, 6, '#7c3aed');
        rect(50, ry - 2, 4, 4, '#a78bfa');
        rect(70, ry - 2, 4, 4, '#a78bfa');
        rect(58, ry - 2, 8, 6, '#5b21b6');
        dot(62, ry, '#c4b5fd');
        for (let r = 0; r < 14; r++) {
          dot(54 - r * 0.2, ry + 4 + r, '#7c3aed');
          dot(55 - r * 0.2, ry + 4 + r, '#a78bfa');
          dot(69 + r * 0.2, ry + 4 + r, '#7c3aed');
          dot(70 + r * 0.2, ry + 4 + r, '#a78bfa');
        }
      }

      // -----------------------------------------------------------------------
      // 4b. RIGHT ARM & HAND BEHIND BODY (SOUTH-EAST / EAST PERSPECTIVE)
      // When in idle/base model stance, the right arm & hand are positioned
      // BEHIND the body (depth layer behind torso, pelvis, and belt).
      // The inner portion is naturally occluded by the torso and hip,
      // with the outer contoured knuckles, thumb, and fingers peeking out in depth shadow.
      // -----------------------------------------------------------------------
      const isBaseIdleArm = !isHandsigns && !isAttacking && !isVictory && !isCasting;
      if (isBaseIdleArm) {
        const rArmX = 75;
        const rArmY = 51 + breath;

        // Shoulder deltoid joint connecting behind torso
        span(rArmY, rArmX, rArmX + 7, cloth.outline);
        span(rArmY + 1, rArmX, rArmX + 8, cloth.deepShadow);
        span(rArmY + 2, rArmX + 1, rArmX + 8, cloth.shadow);

        // Bicep / Tricep descending behind right flank
        span(rArmY + 3, rArmX + 1, rArmX + 8, cloth.deepShadow);
        span(rArmY + 4, rArmX + 2, rArmX + 9, cloth.deepShadow);
        span(rArmY + 5, rArmX + 2, rArmX + 9, cloth.deepShadow);
        dot(rArmX + 9, rArmY + 4, cloth.outline);
        dot(rArmX + 9, rArmY + 5, cloth.outline);

        // Elbow joint notch
        span(rArmY + 6, rArmX + 2, rArmX + 9, cloth.outline);
        span(rArmY + 7, rArmX + 2, rArmX + 9, cloth.deepShadow);
        dot(rArmX + 9, rArmY + 7, cloth.shadow);

        // Forearm tapering down behind flank
        span(rArmY + 8, rArmX + 3, rArmX + 9, cloth.deepShadow);
        span(rArmY + 9, rArmX + 3, rArmX + 9, cloth.deepShadow);
        span(rArmY + 10, rArmX + 3, rArmX + 9, cloth.outline);

        // Leather Bracer / Wrist wrap (darker depth shade)
        span(rArmY + 11, rArmX + 3, rArmX + 9, '#090d16');
        span(rArmY + 12, rArmX + 3, rArmX + 9, silverDark);
        dot(rArmX + 8, rArmY + 12, silverMid);

        // --- SCULPTED RIGHT HAND BEHIND BODY (IN DEPTH SHADOW) ---
        // Row 13: Wrist joint & carpal transition
        span(rArmY + 13, rArmX + 3, rArmX + 9, skin.deepShadow);
        dot(rArmX + 9, rArmY + 13, skin.outline);

        // Row 14: Hand palm body & back-of-hand contour
        span(rArmY + 14, rArmX + 3, rArmX + 9, skin.shadow);
        dot(rArmX + 8, rArmY + 14, skin.base); // Outer rim highlight
        dot(rArmX + 9, rArmY + 14, skin.outline);

        // Row 15: Knuckle crest - 4 defined knuckles in ambient shadow
        span(rArmY + 15, rArmX + 4, rArmX + 9, skin.shadow);
        dot(rArmX + 6, rArmY + 15, skin.base);
        dot(rArmX + 7, rArmY + 15, skin.base);
        dot(rArmX + 8, rArmY + 15, skin.base);
        dot(rArmX + 9, rArmY + 15, skin.outline);

        // Row 16: Curled finger phalanxes peeking out from behind the hip
        span(rArmY + 16, rArmX + 4, rArmX + 9, skin.deepShadow);
        dot(rArmX + 7, rArmY + 16, skin.shadow);
        dot(rArmX + 8, rArmY + 16, skin.base);
        dot(rArmX + 9, rArmY + 16, skin.outline);

        // Row 17: Curled fingertips
        span(rArmY + 17, rArmX + 5, rArmX + 9, skin.deepShadow);
        dot(rArmX + 7, rArmY + 17, skin.shadow);
        dot(rArmX + 8, rArmY + 17, skin.shadow);
        dot(rArmX + 9, rArmY + 17, skin.outline);

        // Row 18: Fingertip bottom contour
        span(rArmY + 18, rArmX + 5, rArmX + 8, skin.outline);
      }

      // -----------------------------------------------------------------------
      // 5. LOWER BODY & PELVIS (3-HEAD-TALL PROPORTION: LEG UNIT y = 78..106)
      // Refined organic anatomical curvature - zero square/blocky rectangular limbs!
      // South-East isometric stance with balanced center of gravity at x = 64.
      // -----------------------------------------------------------------------
      const pelvicY = 70 + breath;
      const legY = 78 + (isHurt ? 2 : 0);
      const lowerStyle = character.lowerStyle || 'Shinobi Wraps & Holster';

      // --- PELVIS & HAKAMA WAIST SEAT (Organic rounded silhouette bridging torso) ---
      // Curved hips with natural fabric tension folds radiating outward from center x = 64
      for (let y = pelvicY; y <= legY + 2; y++) {
        const t = (y - pelvicY) / (legY + 2 - pelvicY);
        // Smooth flared hip contour: curving gently over pelvic crest
        const pLeft = Math.round(48 - Math.sin(t * Math.PI) * 2.5 - t * 1.5);
        const pRight = Math.round(80 + Math.sin(t * Math.PI) * 1.5 + t * 0.8);
        span(y, pLeft, pRight, cloth.deepShadow);
        dot(pLeft, y, cloth.outline);
        dot(pRight, y, cloth.outline);
      }

      // Pelvis center seam & fabric folds (Symmetrically anchored at x = 64)
      for (let y = pelvicY + 1; y <= legY + 2; y++) {
        dot(64, y, cloth.outline); // Crotch inseam divider
        span(y, 51, 63, cloth.shadow);
        span(y, 65, 77, cloth.base);
        // Diagonal drape folds
        if (y % 2 === 0) {
          dot(57, y, cloth.base);
          dot(71, y, cloth.highlight);
        }
      }

      // --- BACK LEG (Left Leg, Upper-Left South-East Perspective) ---
      // Anatomically curved: Quad curve -> tapered knee joint -> calf muscle -> boot
      // Thigh (y = legY to legY + 10)
      for (let y = legY; y <= legY + 10; y++) {
        const t = (y - legY) / 10;
        // Natural curved thigh contour tapering into knee
        const left = Math.round(46 - Math.sin(t * Math.PI) * 2.0 - t * 1.2);
        const right = Math.round(61 - t * 3.5);
        span(y, left, right, cloth.deepShadow);
        dot(left, y, cloth.outline);
        dot(right, y, cloth.outline);
        // Fabric fold highlight
        if (y % 2 === 1) dot(left + 2, y, cloth.shadow);
      }

      // Back Knee Joint & Cop (Curved joint, not a square block)
      span(legY + 11, 44, 57, '#090d16');
      span(legY + 12, 43, 58, silverDark);
      span(legY + 12, 47, 54, silverMid);
      dot(50, legY + 12, silverWhite);

      // Back Calf & Kyahan Wraps (Gastrocnemius calf muscle curves outward, then tapers)
      for (let y = legY + 13; y <= legY + 21; y++) {
        const t = (y - (legY + 13)) / 8;
        // Calf muscle bulge at t ~ 0.35, then graceful taper to ankle
        const left = Math.round(43 - Math.sin(t * Math.PI) * 2.2 + t * 1.5);
        const right = Math.round(57 - t * 2.5);
        span(y, left, right, cloth.deepShadow);
        dot(left, y, cloth.outline);
        dot(right, y, cloth.outline);
        // Kyahan horizontal binding wraps
        if (y % 3 === 0) {
          span(y, left + 1, right - 1, silverDark);
          dot(left + 2, y, silverMid);
        }
      }

      // Back Combat Boot (Rounded heel, instep arch, and curved sole)
      span(legY + 22, 42, 56, '#090d16');
      span(legY + 23, 41, 57, silverDark);
      span(legY + 24, 40, 58, '#111827');
      span(legY + 25, 39, 58, '#090d16');
      span(legY + 26, 40, 57, '#030712');

      // --- FRONT LEG (Right Leg, Foreground South-East Stance) ---
      // Sculpted Musculature: Quadriceps bulge -> Knee Cop -> Shin Greave -> Combat Boot
      // Front Thigh (y = legY to legY + 10)
      for (let y = legY; y <= legY + 10; y++) {
        const t = (y - legY) / 10;
        // Forward quad sweep: wide curved lateral quad tapering to knee
        const left = Math.round(63 + t * 1.8);
        const right = Math.round(79 + Math.sin(t * Math.PI) * 2.0 - t * 1.5);
        shadedSpan(y, left, right, cloth);
      }

      // LEATHER KUNAI HOLSTER on front right thigh (Curved straps, not flat rect)
      // Top curved thigh strap
      span(legY + 3, 67, 80, '#451a03');
      dot(67, legY + 3, '#78350f');
      dot(80, legY + 3, '#78350f');
      // Holster leather body with beveled corners
      span(legY + 4, 73, 79, '#78350f');
      span(legY + 5, 72, 80, '#78350f');
      span(legY + 6, 72, 80, '#451a03');
      span(legY + 7, 72, 80, '#451a03');
      span(legY + 8, 73, 79, '#291104');
      // Bottom curved strap
      span(legY + 8, 68, 79, '#451a03');
      // Dual Kunai Handles with ring pommels
      dot(74, legY + 1, silverWhite);
      dot(74, legY + 2, silverDark);
      dot(77, legY + 1, silverWhite);
      dot(77, legY + 2, silverDark);

      // Front Knee joint & steel buckle (Beveled protective knee cup)
      span(legY + 11, 64, 78, '#090d16');
      span(legY + 12, 63, 79, silverDark);
      span(legY + 12, 67, 75, silverMid);
      dot(71, legY + 12, silverWhite);
      dot(68, legY + 12, '#ffffff');

      // Front Shin & Wraps / Greaves (Natural calf curve, tapers to ankle)
      if (lowerStyle === 'Armored Greaves') {
        for (let y = legY + 13; y <= legY + 21; y++) {
          const t = (y - (legY + 13)) / 8;
          const left = Math.round(62 - Math.sin(t * Math.PI) * 1.5 + t * 0.8);
          const right = Math.round(76 - t * 1.5);
          span(y, left, right, silverDark);
          dot(left, y, '#090d16');
          dot(right, y, '#090d16');
          span(y, left + 2, left + 4, silverWhite); // Specular vertical armor reflection
        }
      } else if (lowerStyle === 'Padded Shin Guards') {
        for (let y = legY + 13; y <= legY + 21; y++) {
          const t = (y - (legY + 13)) / 8;
          const left = Math.round(62 - Math.sin(t * Math.PI) * 1.5 + t * 0.8);
          const right = Math.round(76 - t * 1.5);
          span(y, left, right, armorSec.base);
          dot(left, y, armorSec.outline);
          dot(right, y, armorSec.outline);
          if (y % 2 === 0) span(y, left + 2, right - 2, armorSec.deepShadow);
        }
      } else {
        // Classic Kyahan Wraps with cross-lacing
        for (let y = legY + 13; y <= legY + 21; y++) {
          const t = (y - (legY + 13)) / 8;
          const left = Math.round(62 - Math.sin(t * Math.PI) * 1.5 + t * 0.8);
          const right = Math.round(76 - t * 1.5);
          span(y, left, right, cloth.deepShadow);
          dot(left, y, cloth.outline);
          dot(right, y, cloth.outline);
          dot(left + 1, y, cloth.base);
        }
        // White bandage cross-windings with 3D drop shadow
        span(legY + 14, 63, 73, silverShine);
        dot(67, legY + 14, silverMid);
        span(legY + 17, 63, 73, silverShine);
        dot(67, legY + 17, silverMid);
        span(legY + 20, 63, 72, silverShine);
        dot(67, legY + 20, silverMid);
      }

      // Front Combat Boot (Ankle cuff -> instep curve -> tread grip -> steel toe)
      if (lowerStyle === 'Open Sandals') {
        span(legY + 22, 60, 74, '#090d16');
        span(legY + 23, 61, 75, cloth.deepShadow);
        span(legY + 24, 65, 75, skin.base);
        dot(67, legY + 24, skin.highlight);
        dot(71, legY + 24, skin.highlight);
        span(legY + 25, 59, 76, '#090d16');
        span(legY + 26, 58, 77, '#030712');
      } else {
        span(legY + 22, 60, 74, '#090d16');
        span(legY + 23, 59, 75, silverDark);
        dot(66, legY + 23, silverWhite);
        // Curved instep flare
        span(legY + 24, 58, 76, '#111827');
        // Polished Steel Toe Cap with highlight gleam
        span(legY + 24, 70, 76, silverMid);
        span(legY + 25, 70, 75, silverWhite);
        dot(73, legY + 25, '#ffffff');
        // Bottom Rubber Sole with curved grip
        span(legY + 25, 57, 77, '#090d16');
        span(legY + 26, 56, 78, '#030712');
      }

      // -----------------------------------------------------------------------
      // 6. TORSO, STOMACH MIDRIFF & UTILITY BELT (3-HEAD PROPORTION: TORSO UNIT y = 50..78)
      // Sculpted organic anatomy - athletic tapered waist, rounded deltoid transitions,
      // and multi-tier shaded armor plates (no flat rectangular boxes!).
      // Symmetrically centered along the vertical axis x = 64.
      // -----------------------------------------------------------------------
      const tY = 49 + breath;

      // -----------------------------------------------------------------------
      // 6a. PROPORTIONAL ATHLETIC NECK & THORACIC ANATOMY (y = tY - 6 .. tY)
      // Clean, athletic cervical column tailored for 3/4 South-East perspective.
      // Proportioned width (x = 59..69, width 11px) connecting jaw smoothly to collar.
      // Crisp submental jaw shadow, clean lateral contours, and subtle throat notch.
      // ZERO bulky rectangular bloating or noisy anatomical distortion!
      // -----------------------------------------------------------------------
      for (let ny = tY - 6; ny <= tY; ny++) {
        span(ny, 59, 69, skin.base);
        dot(58, ny, skin.outline);
        dot(70, ny, skin.outline);
        // Lateral shadow ramps
        dot(59, ny, skin.shadow);
        dot(69, ny, skin.shadow);
      }
      // Submental ambient shadow directly cast under chin and jawline
      span(tY - 6, 60, 68, skin.deepShadow);
      span(tY - 5, 60, 68, skin.deepShadow);
      span(tY - 4, 61, 67, skin.shadow);

      // South-East perspective shadow depth on the right/near side of neck
      dot(68, tY - 3, skin.shadow);
      dot(67, tY - 3, skin.shadow);

      // Subtle suprasternal notch (clean throat hollow at base of neck)
      dot(64, tY - 1, skin.shadow);

      // Clean clavicles / collarbones framing into high collar
      span(tY, 56, 62, skin.highlight);
      span(tY, 66, 72, skin.highlight);
      dot(64, tY, skin.shadow);

      // High Popped Collar framing neck with authentic JRPG 3/4 leather flaps
      if (character.hairstyle === 'Noctis Caelum') {
        // Erect Left Leather Collar Flap (rises up to tY - 6 framing left jaw)
        for (let cy = tY - 6; cy <= tY; cy++) {
          const w = Math.floor((tY - cy) * 0.5);
          span(cy, 52 - w, 58, '#0f172a');
          span(cy, 53 - w, 57, '#1e293b');
          dot(53 - w, cy, '#334155'); // leather rim highlight
        }
        // Erect Right Leather Collar Flap (framing near side of neck)
        for (let cy = tY - 5; cy <= tY; cy++) {
          const w = Math.floor((tY - cy) * 0.5);
          span(cy, 70, 76 + w, '#0f172a');
          span(cy, 71, 75 + w, '#1e293b');
          dot(75 + w, cy, '#334155'); // leather rim highlight
        }
        span(tY, 54, 74, '#1e293b');
        dot(55, tY, '#475569');
        dot(73, tY, '#475569');
      } else {
        span(tY - 2, 53, 58, cloth.outline);
        span(tY - 2, 70, 75, cloth.outline);
        span(tY - 1, 54, 59, cloth.deepShadow);
        span(tY - 1, 69, 74, cloth.deepShadow);
        span(tY, 54, 74, cloth.base);
        dot(55, tY, cloth.highlight);
        dot(73, tY, cloth.highlight);
      }

      // Kusari-katabira (Checkered ninja mesh undershirt at throat, centered at x = 64)
      for (let my = tY + 1; my <= tY + 4; my++) {
        for (let mx = 60; mx <= 68; mx++) {
          if ((mx + my) % 2 === 0) dot(mx, my, '#1e293b');
          else dot(mx, my, skin.base);
        }
      }

      // Torso Base Body (Curved athletic contour: flared upper chest -> tapered waist -> hips)
      for (let y = tY + 4; y <= tY + 20; y++) {
        const progress = (y - (tY + 4)) / 16;
        const chestWidth = Math.round(18 - Math.sin(progress * Math.PI) * 3.5);
        const left = 64 - chestWidth;
        const right = 64 + chestWidth;
        span(y, left, right, cloth.deepShadow);
        dot(left, y, cloth.outline);
        dot(right, y, cloth.outline);
      }

      // Modular Tactical Armor Styles
      const aStyle = character.armorStyle;

      if (aStyle === 'Leaf Chunin Flak') {
        const vestBase = '#15803d';
        const vestShad = '#14532d';
        const vestLight = '#22c55e';
        const vestDeep = '#052e16';

        // Flak Vest main body with curved abdominal taper
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, vestBase);
          dot(64 - half, y, vestDeep);
          dot(64 + half, y, vestDeep);
        }

        // Left scroll pouch (Beveled corners with drop shadow, not a flat rectangle)
        span(tY + 6, 52, 57, vestShad);
        span(tY + 7, 51, 58, vestBase);
        span(tY + 8, 51, 58, vestShad);
        span(tY + 9, 51, 58, vestDeep);
        span(tY + 10, 52, 57, vestDeep);
        dot(54, tY + 7, '#ffffff'); // Silver snap button

        // Right scroll pouch (Symmetric beveled corners)
        span(tY + 6, 71, 76, vestShad);
        span(tY + 7, 70, 77, vestBase);
        span(tY + 8, 70, 77, vestShad);
        span(tY + 9, 70, 77, vestDeep);
        span(tY + 10, 71, 76, vestDeep);
        dot(73, tY + 7, '#ffffff'); // Silver snap button

        // Center Zipper Track running down along central axis x = 64
        for (let y = tY + 5; y <= tY + 19; y++) {
          dot(63, y, '#090d16');
          dot(64, y, silverMid);
          if (y % 2 === 0) dot(64, y, silverWhite);
        }

        // STOMACH / ABDOMINAL PADDING (3D segmented horizontal rolls)
        span(tY + 14, 51, 77, vestShad);
        span(tY + 15, 51, 77, vestDeep);
        span(tY + 16, 52, 76, vestLight);
        span(tY + 17, 52, 76, vestBase);
        span(tY + 18, 51, 77, vestShad);
        span(tY + 19, 50, 78, vestDeep);

        // Curved Shoulder Epaulet Guards
        span(tY + 4, 43, 49, vestLight);
        span(tY + 5, 43, 49, vestBase);
        dot(46, tY + 4, silverWhite);
        span(tY + 4, 79, 85, vestLight);
        span(tY + 5, 79, 85, vestBase);
        dot(82, tY + 4, silverWhite);
      } else if (aStyle === 'Sand Wind Guard') {
        const sBase = '#d97706';
        const sLight = '#fde68a';
        const sDark = '#92400e';
        const sDeep = '#451a03';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, sBase);
        }
        span(tY + 5, 49, 79, sLight);
        span(tY + 10, 50, 78, sDark);
        span(tY + 14, 51, 77, sLight);
        span(tY + 17, 50, 78, sDark);
        span(tY + 19, 49, 79, sDeep);
        // Sand Wind Leather Harness & Straps with diagonal tension
        for (let r = 0; r < 15; r++) {
          dot(52 + r * 1.2, tY + 4 + r, sDeep);
          dot(53 + r * 1.2, tY + 4 + r, '#78350f');
          dot(75 - r * 1.1, tY + 4 + r, sDeep);
        }
        // Gourd harness center buckle at x = 64
        span(tY + 9, 62, 66, silverDark);
        span(tY + 10, 61, 67, silverMid);
        dot(64, tY + 10, silverWhite);
        span(tY + 11, 62, 66, silverDark);
      } else if (aStyle === 'Mist Storm Vest') {
        const mBase = '#475569';
        const mLight = '#94a3b8';
        const mDark = '#1e293b';
        const mDeep = '#0f172a';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, mBase);
        }
        // Fluted vertical storm ribbing
        for (let y = tY + 4; y <= tY + 19; y += 3) {
          span(y, 49, 79, mLight);
          span(y + 1, 50, 78, mDark);
          span(y + 2, 50, 78, mDeep);
        }
        // Dual chest utility buckles
        span(tY + 8, 53, 56, silverWhite);
        span(tY + 8, 72, 75, silverWhite);
      } else if (aStyle === 'Samurai O-Yoroi') {
        const yBase = '#991b1b';
        const yLight = '#ef4444';
        const yDeep = '#450a0a';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, yBase);
        }
        // Horizontal lacquered iron lamellar plates (Kozane)
        for (let y = tY + 4; y <= tY + 19; y += 3) {
          span(y, 49, 79, yLight);
          span(y + 1, 50, 78, goldTrim);
          span(y + 2, 50, 78, yDeep);
        }
        // Central Golden Clan Crest (Kamon) at x = 64
        span(tY + 6, 62, 66, goldTrim);
        span(tY + 7, 61, 67, goldDark);
        dot(64, tY + 7, goldShine);
        span(tY + 8, 62, 66, goldTrim);
        // Segmented pauldrons at shoulder bases
        span(tY + 4, 43, 48, goldTrim);
        span(tY + 5, 43, 48, yBase);
        span(tY + 4, 80, 85, goldTrim);
        span(tY + 5, 80, 85, yBase);
      } else if (aStyle === 'Roman Legionary Segmentata') {
        // Polished curved iron plate strips banded across chest & abdomen
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, silverDark);
        }
        for (let y = tY + 5; y <= tY + 19; y += 3) {
          span(y, 49, 79, silverWhite);
          span(y + 1, 50, 78, silverMid);
          span(y + 2, 50, 78, silverDeep);
        }
        // Brass/Bronze center hinges & clasps centered at x = 64
        for (let y = tY + 5; y <= tY + 19; y += 3) {
          dot(63, y + 1, goldTrim);
          dot(64, y + 1, goldShine);
          dot(65, y + 1, goldTrim);
        }
        // Shoulder curved laminate plates (curved pauldrons)
        span(tY + 3, 42, 48, goldTrim);
        span(tY + 4, 41, 47, silverWhite);
        span(tY + 3, 80, 86, goldTrim);
        span(tY + 4, 81, 87, silverWhite);
      } else if (aStyle === 'Greek Hoplite Cuirass') {
        // Sculpted Bronze Muscle Cuirass with pectoral & abdominal contours
        const brBase = '#b45309';
        const brLight = '#fbbf24';
        const brShad = '#78350f';
        const brDeep = '#451a03';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, brBase);
        }
        // Pectoral muscle arches
        span(tY + 6, 51, 60, brLight);
        span(tY + 6, 68, 77, brLight);
        span(tY + 9, 51, 60, brShad);
        span(tY + 9, 68, 77, brShad);
        dot(55, tY + 7, brDeep);
        dot(73, tY + 7, brDeep);
        // Sculpted 6-pack abdominal definition
        span(tY + 12, 54, 60, brLight);
        span(tY + 12, 68, 74, brLight);
        span(tY + 14, 54, 60, brShad);
        span(tY + 14, 68, 74, brShad);
        span(tY + 16, 53, 60, brLight);
        span(tY + 16, 68, 75, brLight);
        span(tY + 18, 53, 60, brShad);
        span(tY + 18, 68, 75, brShad);
        // Center sternum divide at x = 64
        for (let y = tY + 6; y <= tY + 20; y++) {
          dot(64, y, brDeep);
        }
      } else if (aStyle === 'Ronin Wanderer Cloak') {
        // Layered weathered linen traveling poncho with diagonal folds
        const wBase = '#57534e';
        const wLight = '#a8a29e';
        const wDark = '#292524';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(18 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, wBase);
        }
        // Diagonal drape across torso
        for (let r = 0; r < 16; r++) {
          const cy = tY + 4 + r;
          span(cy, 48 + r * 0.5, 78, wDark);
          dot(48 + r * 0.5, cy, wLight);
          dot(49 + r * 0.5, cy, '#ffffff');
        }
        // Frayed hemline highlights
        span(tY + 19, 50, 78, wLight);
        span(tY + 20, 49, 79, wDark);
      } else if (aStyle === 'ANBU Spec-Ops') {
        const aBase = '#1e293b';
        const aLight = '#64748b';
        const aDeep = '#090d16';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, aBase);
        }
        // Ergonomic ANBU chest plating with beveled corners
        span(tY + 6, 52, 60, aLight);
        span(tY + 7, 51, 61, silverWhite);
        span(tY + 8, 51, 61, aLight);
        span(tY + 6, 67, 75, aLight);
        span(tY + 7, 66, 76, silverWhite);
        span(tY + 8, 66, 76, aLight);
        // Crimson ANBU tattoo insignia symbol at center solar plexus (x = 64)
        dot(64, tY + 10, '#dc2626');
        dot(63, tY + 11, '#ef4444');
        dot(65, tY + 11, '#ef4444');
        dot(64, tY + 12, '#dc2626');
        // Stealth ribbed midriff padding
        span(tY + 14, 51, 77, aLight);
        span(tY + 15, 51, 77, aDeep);
        span(tY + 17, 52, 76, aLight);
        span(tY + 18, 52, 76, aDeep);
      } else if (aStyle === 'Dark Knight Plate') {
        const kBase = '#18181b';
        const kLight = '#3f3f46';
        const kDeep = '#09090b';
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, kBase);
        }
        // Fluted gothic breastplate chevron ridges meeting at x = 64
        for (let r = 0; r < 7; r++) {
          const cy = tY + 5 + r;
          span(cy, 64 - r * 1.6, 64 + r * 1.6, kLight);
          dot(64 - r * 1.6, cy, silverWhite);
          dot(64 + r * 1.6, cy, silverWhite);
        }
        // Heavy abdominal segmentata bands
        span(tY + 14, 51, 77, kLight);
        span(tY + 15, 51, 77, kDeep);
        span(tY + 17, 52, 76, silverDark);
        span(tY + 18, 52, 76, kDeep);
        // Heavy iron pauldrons
        span(tY + 3, 41, 48, silverDark);
        span(tY + 4, 40, 47, silverWhite);
        span(tY + 3, 80, 87, silverDark);
        span(tY + 4, 81, 88, silverWhite);
      } else {
        // Universal Tactical Shozoku
        for (let y = tY + 4; y <= tY + 20; y++) {
          const progress = (y - (tY + 4)) / 16;
          const half = Math.round(17 - Math.sin(progress * Math.PI) * 3.0);
          span(y, 64 - half, 64 + half, armor.base);
        }
        span(tY + 6, 50, 78, armor.highlight);
        span(tY + 12, 51, 77, armor.deepShadow);
        span(tY + 16, 51, 77, armor.base);
        span(tY + 19, 50, 78, armor.shadow);
      }

      // --- HEAVY LEATHER UTILITY BELT & BUCKLE (Centered seamlessly at x = 64) ---
      const beltY = tY + 20; // y ≈ 69..73
      span(beltY, 49, 79, '#090d16');
      span(beltY + 1, 49, 79, '#451a03'); // Leather belt strap
      span(beltY + 2, 49, 79, '#78350f');
      span(beltY + 3, 50, 78, '#090d16');

      // Heavy Silver Belt Buckle (Centered at x = 64: 61..67)
      span(beltY, 61, 67, silverDark);
      span(beltY + 1, 60, 68, silverMid);
      span(beltY + 2, 61, 67, silverWhite);
      dot(64, beltY + 1, '#ffffff');

      // Hip Utility Pouches (Beveled flaps with brass rivets)
      span(beltY, 46, 51, '#451a03');
      span(beltY + 1, 45, 52, '#78350f');
      span(beltY + 2, 45, 52, '#78350f');
      span(beltY + 3, 46, 51, '#451a03');
      dot(48, beltY + 1, goldTrim);

      span(beltY, 77, 82, '#451a03');
      span(beltY + 1, 76, 83, '#78350f');
      span(beltY + 2, 76, 83, '#78350f');
      span(beltY + 3, 77, 82, '#451a03');
      dot(80, beltY + 1, goldTrim);

      // Hakama Flaps / Coat Tassets draping smoothly onto upper thighs
      for (let r = 0; r < 9; r++) {
        const fy = beltY + 4 + r;
        const fl = Math.round(46 - r * 0.3);
        const fr = Math.round(54 + r * 0.2);
        span(fy, fl, fr, cloth.base);
        dot(fl, fy, cloth.outline);
        dot(fr, fy, cloth.outline);
        dot(fl + 1, fy, cloth.highlight);
      }
      for (let r = 0; r < 8; r++) {
        const fy = beltY + 4 + r;
        const fl = Math.round(74 - r * 0.2);
        const fr = Math.round(82 + r * 0.3);
        span(fy, fl, fr, cloth.shadow);
        dot(fl, fy, cloth.outline);
        dot(fr, fy, cloth.outline);
      }

      // -----------------------------------------------------------------------
      // 7. ARMS & HANDS - ANATOMICALLY SCULPTED LIMBS (NO SQUARE COLUMNS!)
      // Curving deltoid cap -> biceps/triceps taper -> forearm bracer -> sculpted fist
      // When isHandsigns is true: Tiger / Ram seal is centered at x = 64.
      // -----------------------------------------------------------------------
      if (isHandsigns) {
        // --- AUTHENTIC NINJA HAND SEAL (TIGER / RAM MUDRA CENTERED AT x = 64) ---
        // Back Upper Arm (Left Arm): Sweeps inward from shoulder to chest
        const bShX = 45;
        const bShY = 51 + breath;
        span(bShY, bShX, bShX + 6, cloth.outline);
        span(bShY + 1, bShX + 1, bShX + 6, cloth.highlight);
        for (let r = 0; r < 7; r++) {
          const ay = bShY + 2 + r;
          const ax = Math.round(bShX + 1 + r * 1.3);
          span(ay, ax, ax + 6, cloth.base);
          dot(ax - 1, ay, cloth.outline);
          dot(ax + 6, ay, cloth.outline);
        }
        // Left Forearm angling toward solar plexus
        for (let r = 0; r < 6; r++) {
          const fy = bShY + 9 + r;
          const fx = Math.round(bShX + 9 + r * 1.0);
          span(fy, fx, fx + 5, cloth.deepShadow);
          dot(fx, fy, cloth.outline);
        }

        // Front Upper Arm (Right Arm): Sweeps inward from shoulder to chest
        const fShX = 77;
        const fShY = 53 + breath;
        span(fShY, fShX, fShX + 6, cloth.outline);
        span(fShY + 1, fShX, fShX + 5, cloth.highlight);
        for (let r = 0; r < 7; r++) {
          const ay = fShY + 2 + r;
          const ax = Math.round(fShX - r * 1.2);
          span(ay, ax, ax + 6, cloth.base);
          dot(ax, ay, cloth.outline);
          dot(ax + 6, ay, cloth.outline);
        }
        // Right Forearm angling toward solar plexus
        for (let r = 0; r < 6; r++) {
          const fy = fShY + 9 + r;
          const fx = Math.round(fShX - 7 - r * 0.9);
          span(fy, fx, fx + 5, cloth.deepShadow);
          dot(fx + 5, fy, cloth.outline);
        }

        // Clasped Hands in Tiger / Ram Seal (Strictly Centered at Solar Plexus x = 64)
        const sealX = 61; // Fingers at sealX + 3 = 64!
        const sealY = 54 + breath;

        // Interlocked knuckles base with rounded corners
        span(sealY + 5, sealX - 2, sealX + 8, skin.outline);
        span(sealY + 6, sealX - 1, sealX + 7, skin.shadow);
        span(sealY + 7, sealX, sealX + 6, skin.base);
        span(sealY + 8, sealX + 1, sealX + 5, skin.highlight);
        span(sealY + 9, sealX + 1, sealX + 5, skin.outline);

        // Extended Vertical Index & Middle Fingers (Pointing Upward at x = 64)
        span(sealY, sealX + 2, sealX + 4, skin.outline);
        span(sealY + 1, sealX + 2, sealX + 4, skin.highlight);
        span(sealY + 2, sealX + 2, sealX + 4, skin.base);
        span(sealY + 3, sealX + 2, sealX + 4, skin.base);
        span(sealY + 4, sealX + 1, sealX + 5, skin.shadow);
        dot(sealX + 3, sealY, '#ffffff'); // Finger-tip specular catchlight

        // Clasped Thumbs along the side
        dot(sealX, sealY + 5, skin.base);
        dot(sealX + 6, sealY + 5, skin.base);

        // RADIANT CHAKRA SEAL PULSE AT FINGERTIPS (Centered at x = 64)
        const pulse = Math.sin(tick * 0.3) * 1.5;
        ctx.fillStyle = chakra.shine;
        ctx.beginPath();
        ctx.arc(64 + posX, sealY - 1 + posY, 4 + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Pulsing diamond spark
        dot(64, sealY - 3, '#ffffff');
        dot(63, sealY - 3, '#ffffff');
        dot(61, sealY - 1, chakra.highlight);
        dot(67, sealY - 1, chakra.highlight);
        dot(64, sealY + 1, chakra.highlight);
      } else {
        // --- STANDARD ARMS (Idle, Attack, Cast, Hurt, Victory) ---

        // 7a. Back Arm (Left Arm, in background depth - Sculpted anatomy & defined hand)
        const bArmX = 41;
        const bArmY = 51 + breath;
        // Rounded shoulder deltoid cap
        span(bArmY, bArmX, bArmX + 6, cloth.outline);
        span(bArmY + 1, bArmX - 1, bArmX + 7, cloth.shadow);
        span(bArmY + 2, bArmX - 1, bArmX + 7, cloth.highlight);
        // Bicep / Tricep natural curve (curves out, then tapers to elbow)
        span(bArmY + 3, bArmX - 2, bArmX + 6, cloth.deepShadow);
        span(bArmY + 4, bArmX - 2, bArmX + 6, cloth.deepShadow);
        span(bArmY + 5, bArmX - 2, bArmX + 5, cloth.deepShadow);
        span(bArmY + 6, bArmX - 1, bArmX + 5, cloth.shadow);
        // Elbow joint notch
        span(bArmY + 7, bArmX - 1, bArmX + 5, cloth.outline);
        // Forearm & Gauntlet (natural taper to wrist)
        span(bArmY + 8, bArmX - 2, bArmX + 5, cloth.deepShadow);
        span(bArmY + 9, bArmX - 2, bArmX + 4, cloth.deepShadow);
        span(bArmY + 10, bArmX - 2, bArmX + 4, cloth.deepShadow);
        span(bArmY + 11, bArmX - 1, bArmX + 4, cloth.outline);
        // Leather Bracer / Wrist wrap
        span(bArmY + 12, bArmX - 1, bArmX + 4, silverDark);

        // --- SCULPTED LEFT HAND (FINGERS, THUMB, PALM & KNUCKLES) ---
        // Row 13: Wrist joint & carpal transition
        span(bArmY + 13, bArmX - 2, bArmX + 3, skin.shadow);
        dot(bArmX - 3, bArmY + 13, skin.outline);
        dot(bArmX + 4, bArmY + 13, skin.outline);
        // Row 14: Heel of palm & inward thumb thenar muscle
        span(bArmY + 14, bArmX - 3, bArmX + 4, skin.base);
        dot(bArmX + 3, bArmY + 14, skin.highlight); // Thumb muscle sheen
        dot(bArmX - 1, bArmY + 14, skin.shadow);    // Palm crease
        // Row 15: Knuckle crest - 4 defined knuckle gleams + thumb fold
        span(bArmY + 15, bArmX - 3, bArmX + 3, skin.base);
        dot(bArmX - 2, bArmY + 15, skin.highlight); // Pinky knuckle
        dot(bArmX - 1, bArmY + 15, skin.highlight); // Ring knuckle
        dot(bArmX, bArmY + 15, skin.highlight);     // Middle knuckle
        dot(bArmX + 1, bArmY + 15, skin.highlight); // Index knuckle
        dot(bArmX + 3, bArmY + 15, skin.shadow);    // Folded thumb crease
        // Row 16: Curled finger phalanxes with inter-digital separation
        span(bArmY + 16, bArmX - 2, bArmX + 3, skin.base);
        dot(bArmX, bArmY + 16, skin.shadow);        // Finger separation notch
        dot(bArmX + 2, bArmY + 16, skin.base);
        // Row 17: Curved fingertip pads & knuckles bottom
        span(bArmY + 17, bArmX - 2, bArmX + 2, skin.shadow);
        dot(bArmX - 1, bArmY + 17, skin.highlight);
        // Row 18: Finger outline contour
        span(bArmY + 18, bArmX - 1, bArmX + 1, skin.outline);

        // 7b. Front Arm (Right Arm, foreground South-East perspective)
        const fArmX = 74;
        const fArmY = 53 + breath;

        if (isAttacking) {
          // Dynamic forward slashing Katana thrust with articulated hand gripping tsuka
          span(fArmY, fArmX, fArmX + 12, cloth.outline);
          span(fArmY + 1, fArmX + 1, fArmX + 11, cloth.highlight);
          span(fArmY + 2, fArmX + 2, fArmX + 14, cloth.base);
          span(fArmY + 3, fArmX + 4, fArmX + 16, cloth.deepShadow);

          // Forearm cuff & wrist wrap
          span(fArmY + 3, fArmX + 12, fArmX + 15, silverDark);
          // Hand wrapping securely around the Tsuka (Hilt)
          span(fArmY + 2, fArmX + 15, fArmX + 18, skin.base);
          dot(fArmX + 15, fArmY + 1, skin.highlight); // Thumb locking over index
          dot(fArmX + 16, fArmY + 2, skin.highlight); // Index knuckle
          dot(fArmX + 17, fArmY + 2, skin.highlight); // Middle knuckle
          dot(fArmX + 18, fArmY + 2, skin.shadow);    // Ring knuckle
          span(fArmY + 4, fArmX + 15, fArmX + 18, skin.shadow); // Curled fingers under hilt

          // Slashing Steel Blade extending forward
          span(fArmY + 3, fArmX + 18, fArmX + 38, silverDeep);
          span(fArmY + 4, fArmX + 19, fArmX + 37, silverWhite);
          dot(fArmX + 38, fArmY + 3, '#ffffff');

          // Cyan Crescent Slash Blade Trail Arc
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(fArmX + 24 + posX, fArmY + 6 + posY, 26, -Math.PI * 0.4, Math.PI * 0.35);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (isVictory) {
          // Triumphant raised fist with defined knuckles & thumb
          span(fArmY, fArmX, fArmX + 8, cloth.outline);
          span(fArmY - 2, fArmX + 2, fArmX + 9, cloth.base);
          span(fArmY - 6, fArmX + 3, fArmX + 9, cloth.highlight);
          // Wrist band & raised combat fist
          span(fArmY - 8, fArmX + 3, fArmX + 8, silverDark);
          span(fArmY - 9, fArmX + 2, fArmX + 8, skin.shadow);
          span(fArmY - 10, fArmX + 2, fArmX + 8, skin.base);
          // 4 Knuckles gleaming facing skyward
          dot(fArmX + 3, fArmY - 11, skin.highlight);
          dot(fArmX + 4, fArmY - 11, skin.highlight);
          dot(fArmX + 5, fArmY - 11, skin.highlight);
          dot(fArmX + 6, fArmY - 11, skin.highlight);
          // Thumb folded across front of fist
          span(fArmY - 10, fArmX + 3, fArmX + 6, skin.highlight);

          // Golden Star Gleam
          dot(fArmX + 5, fArmY - 14, goldShine);
          dot(fArmX + 4, fArmY - 13, goldTrim);
          dot(fArmX + 6, fArmY - 13, goldTrim);
          dot(fArmX + 5, fArmY - 15, '#ffffff');
          dot(fArmX + 5, fArmY - 12, '#ffffff');
        } else if (isCasting) {
          // Dynamic Jutsu Cast Forward Arm (extended with chakra technique in foreground)
          // Shoulder Deltoid cap
          span(fArmY, fArmX, fArmX + 7, cloth.outline);
          span(fArmY + 1, fArmX - 1, fArmX + 8, cloth.highlight);
          span(fArmY + 2, fArmX - 1, fArmX + 8, cloth.base);
          // Bicep curve with light sheen
          span(fArmY + 3, fArmX, fArmX + 8, cloth.base);
          span(fArmY + 4, fArmX, fArmX + 8, cloth.base);
          span(fArmY + 5, fArmX + 1, fArmX + 8, cloth.shadow);
          dot(fArmX + 2, fArmY + 4, cloth.highlight);
          // Elbow crease
          span(fArmY + 6, fArmX + 1, fArmX + 7, cloth.outline);
          // Forearm & Leather Bracer (tapering smoothly to wrist)
          span(fArmY + 7, fArmX + 1, fArmX + 8, cloth.deepShadow);
          span(fArmY + 8, fArmX + 2, fArmX + 8, cloth.deepShadow);
          span(fArmY + 9, fArmX + 2, fArmX + 7, cloth.shadow);
          span(fArmY + 10, fArmX + 2, fArmX + 7, cloth.outline);
          // Leather Bracer buckle & metal rivet
          span(fArmY + 11, fArmX + 2, fArmX + 7, silverDark);
          dot(fArmX + 4, fArmY + 11, silverWhite);

          // Forward Jutsu Palm & Fingers
          span(fArmY + 12, fArmX + 2, fArmX + 7, skin.shadow);
          dot(fArmX + 1, fArmY + 12, skin.outline);
          dot(fArmX + 8, fArmY + 12, skin.outline);
          span(fArmY + 13, fArmX + 2, fArmX + 8, skin.base);
          dot(fArmX + 1, fArmY + 13, skin.highlight);
          dot(fArmX + 8, fArmY + 13, skin.shadow);
          span(fArmY + 14, fArmX + 1, fArmX + 8, skin.base);
          dot(fArmX + 1, fArmY + 14, skin.highlight);
          dot(fArmX + 4, fArmY + 14, skin.shadow);
          dot(fArmX + 2, fArmY + 15, skin.base);
          dot(fArmX + 4, fArmY + 15, skin.highlight);
          dot(fArmX + 5, fArmY + 15, skin.highlight);
          dot(fArmX + 6, fArmY + 15, skin.highlight);
          dot(fArmX + 7, fArmY + 15, skin.highlight);
          dot(fArmX + 8, fArmY + 15, skin.outline);
          span(fArmY + 16, fArmX + 3, fArmX + 8, skin.base);
          dot(fArmX + 5, fArmY + 16, skin.shadow);
          dot(fArmX + 7, fArmY + 16, skin.shadow);
          span(fArmY + 17, fArmX + 3, fArmX + 8, skin.base);
          dot(fArmX + 4, fArmY + 17, skin.highlight);
          dot(fArmX + 6, fArmY + 17, skin.highlight);
          span(fArmY + 18, fArmX + 4, fArmX + 7, skin.shadow);
          dot(fArmX + 5, fArmY + 18, skin.base);
          span(fArmY + 19, fArmX + 4, fArmX + 6, skin.outline);

          // Weapon FX on casting hand
          if (weapon === 'Rasengan Sphere' || isCasting) {
            const rx = fArmX + 4;
            const ry = fArmY + 17;
            const grad = ctx.createRadialGradient(rx + 6 + posX, ry + 6 + posY, 2, rx + 6 + posX, ry + 6 + posY, 13);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, '#38bdf8');
            grad.addColorStop(0.75, '#0284c7');
            grad.addColorStop(1, 'rgba(2, 132, 199, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(rx + 6 + posX, ry + 6 + posY, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.5;
            for (let f = 0; f < 4; f++) {
              const rot = rasenganAngle + (f * Math.PI * 2) / 4;
              ctx.beginPath();
              ctx.arc(rx + 6 + posX, ry + 6 + posY, 8, rot, rot + 1.2);
              ctx.stroke();
            }
          } else if (weapon === 'Chidori Lightning') {
            const cx = fArmX + 4;
            const cy = fArmY + 19;
            rect(cx - 3, cy - 3, 10, 10, '#ffffff');
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(cx - 5 + posX, cy - 4 + posY + sparkCycle * 4);
            ctx.lineTo(cx + 3 + posX, cy + 3 + posY);
            ctx.lineTo(cx - 2 + posX, cy + 12 + posY);
            ctx.stroke();
          } else if (weapon === 'Kunai & Tag') {
            const kx = fArmX + 5;
            const ky = fArmY + 22;
            span(ky, kx, kx + 7, silverWhite);
            span(ky + 1, kx - 2, kx + 5, silverMid);
            dot(kx + 8, ky, silverWhite);
            dot(kx - 3, ky, '#090d16');
            rect(kx - 5, ky + 2, 5, 7, '#ffffff');
            dot(kx - 3, ky + 4, '#dc2626');
            dot(kx - 3, ky + 6, '#dc2626');
          } else if (weapon === 'Gentle Fist Palm') {
            const px = fArmX + 5;
            const py = fArmY + 20;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            ctx.arc(px + posX, py + posY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        } else {
          // BASE MODEL (Idle Stance): Right arm & hand are correctly positioned BEHIND THE BODY (Section 4b)
          // No foreground arm rendered on top of torso/belt/pelvis in South-East/East perspective.
        }
      }

      // -----------------------------------------------------------------------
      // 8. HEAD & 3/4 ANIME FACE (AUTHENTIC HIGH-DEFINITION PIXEL CHIBI)
      // FIX: Clean, beautifully constructed anime eyes, eyelids, pupils, catchlights,
      // eyebrows, South-East 3/4 nose, expressive mouth, and headband.
      // Hair bangs properly FRAME the face instead of obliterating the eyes!
      // -----------------------------------------------------------------------
      // -----------------------------------------------------------------------
      // 8. HEAD & 3/4 ANIME FACE (3-HEAD PROPORTION: HEAD UNIT y = 22..50)
      // Refined organic anatomy - smooth skull curvature, rounded anime cheeks,
      // and contoured jawline tapering to pointed anime chin at (x = 64, y = 50).
      // ZERO square/blocky rectangular boxes! Perfectly balanced and symmetrical.
      // -----------------------------------------------------------------------
      const hX = 40; // Centers head axis hX + 24 precisely at canvas center x = 64!
      const hY = 20 + breath;

      // -----------------------------------------------------------------------
      // 8a. VOLUMETRIC REAR HAIR & OCCIPITAL CRANIUM DEPTH (Drawn BEHIND Face)
      // In 3/4 South-East perspective, rear locks and nape clusters emerge behind
      // the left cranium/jaw/neck, giving authentic 360-degree anime silhouette!
      // -----------------------------------------------------------------------
      const hBase = hair.base;
      const hLight = hair.highlight;
      const hShine = hair.shine;
      const hDark = hair.deepShadow;
      const hShadow = hair.shadow;
      const hOut = hair.outline;
      const hStyle = character.hairstyle;

      // Base Occipital Nape Shadow (connects cranium to cervical column)
      span(hY + 25, hX + 5, hX + 15, hDark);
      span(hY + 26, hX + 6, hX + 16, hDark);
      span(hY + 27, hX + 6, hX + 17, hOut);
      span(hY + 28, hX + 7, hX + 18, hOut);

      switch (hStyle) {
        case 'Naruto Spike':
          // Authentic 360-degree spiky fan silhouette (images (1).jpg):
          // Clump R1 (Lower Nape Flare behind jaw - sharp tip pointing down-left):
          for (let r = 0; r < 10; r++) {
            const sy = hY + 15 + r;
            const w = Math.floor(r * 0.55);
            span(sy, hX - 3 + w, hX + 10, hShadow);
            dot(hX - 3 + w, sy, hOut);
            dot(hX - 2 + w, sy, hLight);
          }
          dot(hX - 3, hY + 15, hOut);
          dot(hX - 2, hY + 16, hLight);

          // Clump R2 (Mid-Rear Flared Clump shooting out left):
          for (let r = 0; r < 11; r++) {
            const sy = hY + 6 + r;
            const w = Math.floor(r * 0.6);
            span(sy, hX - 6 + w, hX + 8, hBase);
            dot(hX - 6 + w, sy, hOut);
            dot(hX - 5 + w, sy, hLight);
            dot(hX + 7, sy, hDark);
          }
          dot(hX - 6, hY + 6, hOut);
          dot(hX - 5, hY + 7, hShine);

          // Clump R3 (Upper-Rear Crown Spike angling up-left):
          for (let r = 0; r < 11; r++) {
            const sy = hY - 3 + r;
            const w = Math.floor(r * 0.55);
            span(sy, hX - 3 + w, hX + 10, hBase);
            dot(hX - 3 + w, sy, hOut);
            dot(hX - 2 + w, sy, hLight);
            dot(hX + 9, sy, hDark);
          }
          dot(hX - 3, hY - 3, hOut);
          dot(hX - 2, hY - 2, hShine);
          break;

        case 'Sasuke Rogue Fringe':
          // Iconic Uchiha Ducktail Fan Spikes (Flared Upward & Backward - images (1).jpg):
          // Wing 1 (Low Nape Flare):
          for (let r = 0; r < 12; r++) {
            const sy = hY + 13 + r;
            const w = Math.floor(r * 0.55);
            span(sy, hX - 4 + w, hX + 9, hDark);
            dot(hX - 4 + w, sy, hOut);
            dot(hX - 3 + w, sy, hLight);
          }
          dot(hX - 4, hY + 13, hOut);

          // Wing 2 (Mid-Back Crest shooting outward):
          for (let r = 0; r < 13; r++) {
            const sy = hY + 2 + r;
            const w = Math.floor(r * 0.55);
            span(sy, hX - 6 + w, hX + 11, hBase);
            dot(hX - 6 + w, sy, hOut);
            dot(hX - 5 + w, sy, hLight);
            dot(hX - 4 + w, sy, hShine);
          }
          dot(hX - 6, hY + 2, hOut);

          // Wing 3 (High Left Crest jutting up-left):
          for (let r = 0; r < 14; r++) {
            const sy = hY - 8 + r;
            const w = Math.floor(r * 0.5);
            span(sy, hX - 2 + w, hX + 16, hBase);
            dot(hX - 2 + w, sy, hOut);
            dot(hX - 1 + w, sy, hLight);
          }
          dot(hX - 2, hY - 8, hOut);
          dot(hX - 1, hY - 7, hShine);

          // Wing 4 (Top Rear Crest Spike pointing straight up-left):
          for (let r = 0; r < 13; r++) {
            const sy = hY - 16 + r;
            const w = Math.floor(r * 0.45);
            span(sy, hX + 8 + w, hX + 21, hBase);
            dot(hX + 8 + w, sy, hOut);
            dot(hX + 9 + w, sy, hShine);
          }
          dot(hX + 8, hY - 16, hOut);
          dot(hX + 9, hY - 15, '#ffffff');
          break;

        case 'Minato Winged Flare':
          // Wide Sweeping Rear Wings:
          for (let r = 0; r < 12; r++) {
            const sy = hY + 14 + r;
            const w = Math.floor(r * 0.5);
            span(sy, hX - 2 + w, hX + 9, hShadow);
            dot(hX - 2 + w, sy, hOut);
            dot(hX - 1 + w, sy, hLight);
          }
          for (let r = 0; r < 13; r++) {
            const sy = hY + 3 + r;
            const w = Math.floor(r * 0.55);
            span(sy, hX - 5 + w, hX + 8, hBase);
            dot(hX - 5 + w, sy, hOut);
            dot(hX - 4 + w, sy, hLight);
          }
          break;

        case 'Kakashi Tilt':
          // Windswept Silver Mane angled backward:
          for (let r = 0; r < 14; r++) {
            const sy = hY - 8 + r;
            const w = Math.floor(r * 0.6);
            span(sy, hX + 3 + w, hX + 15, hBase);
            dot(hX + 3 + w, sy, hOut);
            dot(hX + 4 + w, sy, hShine);
          }
          for (let r = 0; r < 12; r++) {
            const sy = hY + 6 + r;
            const w = Math.floor(r * 0.4);
            span(sy, hX + 1 + w, hX + 9, hShadow);
            dot(hX + 1 + w, sy, hOut);
            dot(hX + 2 + w, sy, hLight);
          }
          break;

        case 'Madara Wild Cascade':
          // Colossal Spiky Mane Cascading Flanking Back and Shoulders:
          for (let r = 0; r < 28; r++) {
            const sy = hY + 7 + r;
            const w = Math.floor(r * 0.35);
            span(sy, hX - 8 + w, hX + 6, hDark);
            dot(hX - 8 + w, sy, hOut);
            dot(hX - 7 + w, sy, hShadow);
          }
          for (let r = 0; r < 28; r++) {
            const sy = hY + 8 + r;
            const w = Math.floor(r * 0.35);
            span(sy, hX + 42, hX + 54 - w, hDark);
            dot(hX + 54 - w, sy, hOut);
            dot(hX + 53 - w, sy, hShadow);
          }
          break;

        case 'Itachi Low Ribbon':
          // Long Sleek Tied Ponytail trailing down over left blade:
          for (let r = 0; r < 20; r++) {
            const py = hY + 25 + r;
            const w = r > 15 ? 1 : 2;
            span(py, hX + 8 - w, hX + 14 + w, hDark);
            dot(hX + 8 - w, py, hOut);
            dot(hX + 14 + w, py, hOut);
          }
          // Red Silk Ribbon Tie Clasp
          span(hY + 25, hX + 7, hX + 15, '#dc2626');
          span(hY + 26, hX + 8, hX + 14, '#ef4444');
          dot(hX + 6, hY + 27, '#dc2626');
          dot(hX + 15, hY + 27, '#dc2626');
          break;

        case 'Cloud Chocobo Spikes':
          // Rear Faceted Spikes:
          for (let r = 0; r < 12; r++) {
            const sy = hY - 4 + r;
            const w = Math.floor(r * 0.5);
            span(sy, hX + 2 + w, hX + 10, hBase);
            dot(hX + 2 + w, sy, hOut);
            dot(hX + 3 + w, sy, hLight);
          }
          break;

        case 'Sephiroth Parted Flow':
          // Flowing Silver Tresses Behind:
          for (let r = 0; r < 24; r++) {
            const sy = hY + 12 + r;
            span(sy, hX + 2, hX + 8, hBase);
            dot(hX + 2, sy, hOut);
            dot(hX + 3, sy, hLight);
            span(sy, hX + 39, hX + 45, hShadow);
            dot(hX + 45, sy, hOut);
          }
          break;

        case 'Noctis Caelum':
          // Authentic Noctis Lucis Caelum Rear Hair Tufts & Occipital Silhouette
          // (3 Signature Choppy Rear Spikes Flaring backward-left behind skull & collar)
          // 1. High-Left Crest Spike (sprouts backward-left behind upper skull)
          for (let r = 0; r < 12; r++) {
            const sy = hY - 12 + r;
            const sx = hX + 9 - Math.floor(r * 0.6);
            span(sy, sx, hX + 16, hDark);
            dot(sx, sy, hOut);
            dot(sx + 1, sy, hLight);
            if (r < 6) dot(sx + 2, sy, hShine);
          }
          dot(hX + 9, hY - 13, hOut);
          dot(hX + 10, hY - 12, hShine);

          // 2. Mid-Left Choppy Flared Wing (behind ear/jaw, jutting outward)
          for (let r = 0; r < 11; r++) {
            const sy = hY + 1 + r;
            const sx = hX + 1 + Math.floor(Math.abs(r - 5) * 0.7);
            span(sy, sx, hX + 10, hDark);
            dot(sx, sy, hOut);
            dot(sx + 1, sy, hLight);
            if (r >= 3 && r <= 7) dot(sx + 2, sy, hShine);
          }
          dot(hX + 1, hY + 6, hOut);

          // 3. Lower Nape Clump (tucked behind left jaw and popped collar)
          for (let r = 0; r < 9; r++) {
            const sy = hY + 13 + r;
            const sx = hX + 3 + Math.floor(r * 0.5);
            span(sy, sx, hX + 12, hDark);
            dot(sx, sy, hOut);
            dot(sx + 1, sy, hLight);
          }
          break;

        case 'Squall Modern Fringe':
        default:
          // Tousled layered nape locks:
          for (let r = 0; r < 10; r++) {
            const sy = hY + 14 + r;
            const w = Math.floor(r * 0.4);
            span(sy, hX + 3 + w, hX + 11, hDark);
            dot(hX + 3 + w, sy, hOut);
            dot(hX + 4 + w, sy, hLight);
          }
          break;
      }

      // 8b. Face Base Skin & Sculpted Symmetrical Anime Cranium (NO square edges!)
      // Domed forehead curve
      span(hY + 4, hX + 16, hX + 32, skin.base);
      span(hY + 5, hX + 14, hX + 34, skin.base);
      span(hY + 6, hX + 12, hX + 36, skin.base);
      span(hY + 7, hX + 10, hX + 38, skin.base);
      span(hY + 8, hX + 9, hX + 39, skin.base);
      span(hY + 9, hX + 8, hX + 40, skin.base);
      span(hY + 10, hX + 8, hX + 40, skin.base);
      span(hY + 11, hX + 7, hX + 41, skin.base);
      span(hY + 12, hX + 7, hX + 41, skin.base);

      // Rounded Cheeks: curves outward smoothly to apex at y = hY + 15 (width 37)
      span(hY + 13, hX + 6, hX + 42, skin.base);
      span(hY + 14, hX + 6, hX + 42, skin.base);
      span(hY + 15, hX + 6, hX + 42, skin.base); // Cheek curve apex
      span(hY + 16, hX + 6, hX + 42, skin.base);
      span(hY + 17, hX + 6, hX + 42, skin.base);
      span(hY + 18, hX + 7, hX + 41, skin.base);
      span(hY + 19, hX + 7, hX + 41, skin.base);
      span(hY + 20, hX + 8, hX + 40, skin.base);

      // 8b. AUTHENTIC SOUTH-EAST 3/4 ANIME JAWLINE & CHIN CONTOUR
      // Elegant, proportioned 3/4 curvature tapering organically into a rounded 3px anime chin.
      // (Inspired directly by classic 16-bit JRPG sprite anatomy - ZERO boxy rectangular chin!)
      span(hY + 21, hX + 8, hX + 40, skin.base);  // width 33 (48..80) - Upper jaw arch
      span(hY + 22, hX + 9, hX + 39, skin.base);  // width 31 (49..79) - Near mandibular angle
      span(hY + 23, hX + 11, hX + 37, skin.base); // width 27 (51..77) - Smooth jaw sweep
      span(hY + 24, hX + 13, hX + 35, skin.base); // width 23 (53..75) - Contoured taper
      span(hY + 25, hX + 16, hX + 32, skin.base); // width 17 (56..72) - Lower mandibular taper
      span(hY + 26, hX + 19, hX + 29, skin.base); // width 11 (59..69) - Chin shelf transition
      span(hY + 27, hX + 21, hX + 27, skin.base); // width 7  (61..67) - Refined chin contour
      span(hY + 28, hX + 23, hX + 25, skin.base); // width 3  (63..65) - Handsome rounded chin apex!

      // Crisp submental jaw cast shadow (separates jawline cleanly from neck)
      span(hY + 29, hX + 22, hX + 26, skin.shadow);
      span(hY + 29, hX + 23, hX + 25, skin.deepShadow);

      // Clean 3/4 selective jawline contours & shading
      dot(hX + 8, hY + 21, skin.outline);
      dot(hX + 40, hY + 21, skin.outline);
      dot(hX + 9, hY + 22, skin.outline);
      dot(hX + 39, hY + 22, skin.outline);
      dot(hX + 11, hY + 23, skin.outline);
      dot(hX + 37, hY + 23, skin.outline);
      dot(hX + 13, hY + 24, skin.outline);
      dot(hX + 35, hY + 24, skin.outline);
      dot(hX + 16, hY + 25, skin.outline);
      dot(hX + 32, hY + 25, skin.outline);
      dot(hX + 19, hY + 26, skin.outline);
      dot(hX + 29, hY + 26, skin.outline);
      dot(hX + 21, hY + 27, skin.outline);
      dot(hX + 27, hY + 27, skin.outline);
      // Clean 3px rounded chin bottom outline
      span(hY + 28, hX + 23, hX + 25, skin.outline);

      // Soft jaw shading ramps
      dot(hX + 10, hY + 22, skin.shadow);
      dot(hX + 38, hY + 22, skin.shadow);
      dot(hX + 12, hY + 23, skin.shadow);
      dot(hX + 36, hY + 23, skin.shadow);
      dot(hX + 14, hY + 24, skin.shadow);
      dot(hX + 34, hY + 24, skin.shadow);
      dot(hX + 17, hY + 25, skin.shadow);
      dot(hX + 31, hY + 25, skin.shadow);
      dot(hX + 20, hY + 26, skin.shadow);
      dot(hX + 28, hY + 26, skin.shadow);
      dot(hX + 22, hY + 27, skin.shadow);
      dot(hX + 26, hY + 27, skin.shadow);

      // Back-Turned Left Ear (Curved silhouette in 3/4 depth)
      span(hY + 14, hX + 5, hX + 6, skin.base);
      span(hY + 15, hX + 4, hX + 6, skin.base);
      span(hY + 16, hX + 4, hX + 6, skin.base);
      span(hY + 17, hX + 5, hX + 6, skin.base);
      dot(hX + 4, hY + 15, skin.outline);
      dot(hX + 4, hY + 16, skin.outline);
      dot(hX + 5, hY + 15, skin.shadow);

      // Soft Rosy Cheek Blush
      span(hY + 19, hX + 10, hX + 15, '#fca5a5');
      span(hY + 19, hX + 33, hX + 38, '#fca5a5');
      dot(hX + 12, hY + 19, '#f87171');
      dot(hX + 36, hY + 19, '#f87171');

      // 8c. South-East 3/4 Anime Nose (Centered at hX + 24)
      dot(hX + 23, hY + 20, skin.shadow);
      dot(hX + 24, hY + 20, skin.highlight);
      dot(hX + 24, hY + 21, skin.shadow); // Subnasale shadow

      // 8d. CRISP AUTHENTIC JRPG ANIME MOUTH (Clean, expressive, pixel-perfect)
      // Directly inspired by classic 16-bit South-East reference sprites:
      // A clean, readable mouth line with soft lower lip shade. NO messy multi-tier blobs!
      const mouthY = hY + 24;
      if (isAttacking || isCasting) {
        // Dynamic Battle Shout (Clean open mouth with white teeth and dark interior)
        span(mouthY - 1, hX + 23, hX + 26, skin.shadow);
        span(mouthY, hX + 22, hX + 27, '#701a24');       // Oral cavity
        span(mouthY, hX + 23, hX + 26, '#ffffff');       // Upper teeth
        span(mouthY + 1, hX + 23, hX + 26, '#4c0519');   // Depth
        span(mouthY + 2, hX + 23, hX + 26, skin.shadow); // Lower lip line
      } else if (isVictory) {
        // Confident Smirk (Clean line with upturned near corner)
        span(mouthY, hX + 22, hX + 26, skin.deepShadow);
        dot(hX + 27, mouthY - 1, skin.deepShadow);       // Upturned smirk corner
        span(mouthY + 1, hX + 23, hX + 25, skin.shadow); // Soft lower lip
      } else if (isHurt) {
        // Clenched Grimace
        span(mouthY, hX + 22, hX + 27, skin.deepShadow);
        span(mouthY, hX + 23, hX + 26, '#f8fafc');       // Clenched teeth
        span(mouthY + 1, hX + 23, hX + 26, skin.shadow);
      } else {
        // Natural Determined Anime Resting Mouth (Crisp 16-bit JRPG aesthetic)
        span(mouthY, hX + 23, hX + 26, skin.deepShadow); // Crisp 4px mouth line
        dot(hX + 22, mouthY, skin.shadow);               // Left corner soft taper
        dot(hX + 27, mouthY, skin.shadow);               // Right corner soft taper
        span(mouthY + 1, hX + 24, hX + 25, skin.shadow); // Subtle 2px lower lip contour
      }

      // 8e. PERFECTLY BALANCED & SYMMETRICAL ANIME EYES & DOJUTSU
      // Exact mathematical symmetry:
      // Face center: hX + 24 (= 64)
      // Left eye:  hX + 14 to hX + 21 (width 8px, center hX + 17.5, dist from center = 6.5px)
      // Right eye: hX + 27 to hX + 34 (width 8px, center hX + 30.5, dist from center = 6.5px)
      // Nose bridge gap: hX + 22 to hX + 26 (5px, symmetric around hX + 24)
      // Sclera and irises are organically rounded almond shapes (NO flat square boxes!)
      const eyeY = hY + 15;
      const dojutsu = character.dojutsu;
      const leftEyeX = hX + 14;
      const rightEyeX = hX + 27;

      // --- EYEBROWS (Symmetric dynamic arch & thickness) ---
      // Left eyebrow
      span(eyeY - 3, leftEyeX + 1, leftEyeX + 6, hair.outline);
      span(eyeY - 2, leftEyeX, leftEyeX + 7, hair.base);
      dot(leftEyeX, eyeY - 1, hair.outline);
      // Right eyebrow
      span(eyeY - 3, rightEyeX + 1, rightEyeX + 6, hair.outline);
      span(eyeY - 2, rightEyeX, rightEyeX + 7, hair.base);
      dot(rightEyeX + 7, eyeY - 1, hair.outline);

      // --- DOUBLE EYELID CREASES (Curved 5px spans) ---
      span(eyeY - 1, leftEyeX + 1, leftEyeX + 6, skin.shadow);
      span(eyeY - 1, rightEyeX + 1, rightEyeX + 6, skin.shadow);

      // --- UPPER LASH LINE & WINGED EYELINER (Curved arched anime eyeliner) ---
      // Left eye upper lash
      dot(leftEyeX - 1, eyeY - 1, '#090d16'); // outer wing
      span(eyeY, leftEyeX, leftEyeX + 7, '#090d16');
      dot(leftEyeX + 2, eyeY - 1, '#090d16'); // arch lift
      dot(leftEyeX + 3, eyeY - 1, '#090d16');
      // Right eye upper lash
      dot(rightEyeX + 8, eyeY - 1, '#090d16'); // outer wing
      span(eyeY, rightEyeX, rightEyeX + 7, '#090d16');
      dot(rightEyeX + 4, eyeY - 1, '#090d16'); // arch lift
      dot(rightEyeX + 5, eyeY - 1, '#090d16');

      // --- SCLERA (Rounded anime almond shape - NOT a square box!) ---
      // Row 1: corner insets (rounded top aperture)
      span(eyeY + 1, leftEyeX + 1, leftEyeX + 6, '#ffffff');
      span(eyeY + 1, rightEyeX + 1, rightEyeX + 6, '#ffffff');
      // Top ambient shadow on eyeball
      span(eyeY + 1, leftEyeX + 1, leftEyeX + 6, '#e2e8f0');
      span(eyeY + 1, rightEyeX + 1, rightEyeX + 6, '#e2e8f0');

      // Row 2 & 3: full width sclera
      span(eyeY + 2, leftEyeX, leftEyeX + 7, '#ffffff');
      span(eyeY + 2, rightEyeX, rightEyeX + 7, '#ffffff');
      span(eyeY + 3, leftEyeX, leftEyeX + 7, '#ffffff');
      span(eyeY + 3, rightEyeX, rightEyeX + 7, '#ffffff');

      // Row 4: bottom corner insets (rounded bottom contour)
      span(eyeY + 4, leftEyeX + 1, leftEyeX + 6, '#ffffff');
      span(eyeY + 4, rightEyeX + 1, rightEyeX + 6, '#ffffff');

      // --- IRIS & PUPILS (Curved jewel-faceted anime irises) ---
      const renderIris = (originX: number) => {
        const ix = originX + 2; // centered in 8px eye width (indices 2..5)
        if (dojutsu.includes('Sharingan') || dojutsu.includes('Mangekyo') || p.eyeColor === '#dc2626') {
          // Crimson Sharingan
          span(eyeY + 1, ix, ix + 3, '#991b1b');
          span(eyeY + 2, ix, ix + 3, '#dc2626');
          span(eyeY + 3, ix, ix + 3, '#dc2626');
          span(eyeY + 4, ix + 1, ix + 2, '#b91c1c'); // curved bottom taper

          // Center black pupil
          rect(ix + 1, eyeY + 2, 2, 2, '#000000');
          // Catchlights
          dot(ix, eyeY + 1, '#ffffff');
          dot(ix + 1, eyeY + 1, '#ffffff');

          if (dojutsu.includes('3-Tomoe')) {
            dot(ix, eyeY + 2, '#000000');
            dot(ix + 3, eyeY + 2, '#000000');
            dot(ix + 2, eyeY + 4, '#000000');
          } else if (dojutsu.includes('Kamui') || dojutsu.includes('Amaterasu')) {
            dot(ix + 1, eyeY + 1, '#000000');
            dot(ix + 3, eyeY + 3, '#000000');
            dot(ix, eyeY + 3, '#000000');
          }
        } else if (dojutsu.includes('Byakugan')) {
          // Lavender Byakugan
          span(eyeY + 1, ix, ix + 3, '#f5f3ff');
          span(eyeY + 2, ix, ix + 3, '#ede9fe');
          span(eyeY + 3, ix, ix + 3, '#ddd6fe');
          span(eyeY + 4, ix + 1, ix + 2, '#c4b5fd');

          rect(ix + 1, eyeY + 2, 2, 2, '#a78bfa');
          dot(ix, eyeY + 1, '#ffffff');

          if (dojutsu.includes('Active Veined')) {
            dot(originX - 2, eyeY + 1, '#c4b5fd');
            dot(originX - 3, eyeY, '#a78bfa');
            dot(originX + 9, eyeY + 1, '#c4b5fd');
            dot(originX + 10, eyeY, '#a78bfa');
          }
        } else if (dojutsu.includes('Sage')) {
          // Sage Toad Eyes with horizontal bar & golden iris
          span(eyeY - 2, originX, originX + 7, '#ea580c'); // orange eyeshadow
          span(eyeY + 1, ix, ix + 3, '#fde047');
          span(eyeY + 2, ix, ix + 3, '#eab308');
          span(eyeY + 3, ix, ix + 3, '#ca8a04');
          span(eyeY + 4, ix + 1, ix + 2, '#a16207');

          span(eyeY + 2, ix - 1, ix + 4, '#000000'); // horizontal sage bar
          dot(ix, eyeY + 1, '#ffffff');
        } else if (character.hairstyle === 'Noctis Caelum' || p.eyeColor === '#38bdf8' || p.eyeColor === '#0ea5e9') {
          // Luminous Royal Crystal Azure / Cyan Iris (Noctis Lucis Caelum)
          span(eyeY + 1, ix, ix + 3, '#0284c7'); // deep azure upper shade
          span(eyeY + 2, ix, ix + 3, '#0ea5e9'); // electric sky blue core
          span(eyeY + 3, ix, ix + 3, '#38bdf8'); // luminous cyan body
          span(eyeY + 4, ix + 1, ix + 2, '#7dd3fc'); // bright crystal rim reflection

          // Jet Black Pupil (2x2)
          rect(ix + 1, eyeY + 2, 2, 2, '#040609');

          // Crystalline Specular Catchlights
          dot(ix, eyeY + 1, '#ffffff');
          dot(ix + 1, eyeY + 1, '#ffffff');
          dot(ix + 2, eyeY + 3, '#bae6fd'); // soft azure twinkle
        } else {
          // Standard Vivid Anime Iris
          const eColor = p.eyeColor === '#ffffff' ? '#38bdf8' : p.eyeColor;
          const eDark = adjustBrightness(eColor, -35);
          const eLight = adjustBrightness(eColor, 35);

          span(eyeY + 1, ix, ix + 3, eDark);
          span(eyeY + 2, ix, ix + 3, eColor);
          span(eyeY + 3, ix, ix + 3, eColor);
          span(eyeY + 4, ix + 1, ix + 2, eDark); // rounded bottom iris contour

          // Deep Black Pupil (2x2)
          rect(ix + 1, eyeY + 2, 2, 2, '#09090b');

          // Double Specular Catchlights (Identical sparkle in both eyes)
          dot(ix, eyeY + 1, '#ffffff');
          dot(ix + 1, eyeY + 1, '#ffffff');
          dot(ix + 2, eyeY + 3, eLight); // subtle bottom illumination
        }
      };

      // Draw symmetrical irises on both eyes
      renderIris(leftEyeX);
      renderIris(rightEyeX);

      // --- LOWER LASH LINE (Delicate curved contour) ---
      span(eyeY + 5, leftEyeX + 1, leftEyeX + 6, '#090d16');
      span(eyeY + 5, rightEyeX + 1, rightEyeX + 6, '#090d16');

      // 8f. HEADBAND & HITAI-ATE (Centered cleanly on forehead above eyebrows at x = 64)
      const hbPos = character.headbandPosition;
      const ribbonStyle = character.ribbonStyle || 'Long Fluttering';

      if (hbPos === 'Forehead' || hbPos === 'Rogue Scratched') {
        const hbY = hY + 7;
        // Cloth Band wrapping cranium with curved drape
        for (let y = hbY; y <= hbY + 3; y++) {
          span(y, hX + 7, hX + 41, headband.base);
        }
        span(hbY, hX + 8, hX + 40, headband.outline);
        span(hbY + 3, hX + 7, hX + 41, headband.deepShadow);

        // Metallic Forehead Plate (Symmetrically centered at x = 64: hX + 16 to hX + 32)
        span(hbY, hX + 16, hX + 32, '#090d16');
        for (let y = hbY + 1; y <= hbY + 3; y++) {
          span(y, hX + 16, hX + 32, silverMid);
        }
        span(hbY + 1, hX + 17, hX + 31, silverWhite); // metallic sheen
        dot(hX + 17, hbY + 2, silverDark); // left rivet
        dot(hX + 31, hbY + 2, silverDark); // right rivet

        // Engraved Village Emblem
        const emblem = getVillageEmblem(character);
        const emX = hX + 23;
        const emY = hbY + 2;

        if (emblem === 'Rogue' || hbPos === 'Rogue Scratched') {
          dot(emX - 1, emY - 1, '#1e293b');
          dot(emX, emY - 1, '#1e293b');
          dot(emX + 1, emY, '#1e293b');
          dot(emX, emY + 1, '#1e293b');
          // Crimson scratch across metal plate
          span(hbY + 2, hX + 17, hX + 30, '#dc2626');
          dot(hX + 23, hbY + 1, '#ef4444');
        } else if (emblem === 'Sand') {
          dot(emX - 1, emY - 1, '#1e293b');
          dot(emX + 1, emY - 1, '#1e293b');
          dot(emX, emY, '#1e293b');
          dot(emX - 1, emY + 1, '#1e293b');
          dot(emX + 1, emY + 1, '#1e293b');
        } else if (emblem === 'Mist') {
          dot(emX - 2, emY - 1, '#1e293b');
          dot(emX - 1, emY, '#1e293b');
          dot(emX + 1, emY - 1, '#1e293b');
          dot(emX + 2, emY, '#1e293b');
        } else if (emblem === 'Cloud') {
          dot(emX - 1, emY, '#1e293b');
          dot(emX, emY - 1, '#1e293b');
          dot(emX + 1, emY - 1, '#1e293b');
          dot(emX + 2, emY, '#1e293b');
        } else if (emblem === 'Stone') {
          rect(emX - 1, emY - 1, 3, 2, '#1e293b');
        } else {
          // Leaf Spiral
          dot(emX - 1, emY - 1, '#1e293b');
          dot(emX, emY - 1, '#1e293b');
          dot(emX + 1, emY, '#1e293b');
          dot(emX, emY + 1, '#1e293b');
          dot(emX - 1, emY, '#1e293b');
          dot(emX + 2, emY - 1, '#1e293b');
        }

        // Fluttering Ribbons trailing behind to the left
        if (ribbonStyle === 'Long Fluttering') {
          span(hbY + 1, hX + 2, hX + 7, headband.base);
          span(hbY + 1 + ribbonWave, hX - 6, hX + 1, headband.highlight);
          span(hbY + 2 + ribbonWave, hX - 7, hX, headband.base);
          span(hbY + 3 + ribbonWave * 1.3, hX - 11, hX - 5, headband.highlight);
        } else if (ribbonStyle === 'Short') {
          span(hbY + 1, hX + 2, hX + 7, headband.base);
          dot(hX + 1, hbY + 2, headband.highlight);
        }
      }

      // 8g. SCULPTED VOLUMETRIC ANIME HAIRSTYLES (CROWN CLUSTERS & HITAI-ATE BANGS)
      // High-definition 16-bit JRPG sprite execution: 3D chunky lock volume,
      // faceted directional highlight edges, crown halo curves, and bangs draping
      // organically over the top rim of the headband without obscuring the eyes!

      switch (hStyle) {
        case 'Naruto Spike':
          // -------------------------------------------------------------------
          // THE 9-TAILS JINCHURIKI: ICONIC GOLDEN HEDGEHOG CROWN & HITAI-ATE BANGS
          // Authentic chunky 16-bit JRPG sprite execution (images (1).jpg)
          // -------------------------------------------------------------------
          // 1. Crown Skull Volume Base Dome
          span(hY - 3, hX + 10, hX + 38, hLight);
          span(hY - 2, hX + 8, hX + 40, hBase);
          span(hY - 1, hX + 7, hX + 41, hBase);
          for (let y = hY; y <= hY + 6; y++) {
            span(y, hX + 6, hX + 42, hBase);
          }

          // Specular Angel Ring Sheen Curve across Upper Cranium
          span(hY - 1, hX + 15, hX + 33, hShine);
          dot(hX + 21, hY - 2, '#ffffff');
          dot(hX + 22, hY - 2, '#ffffff');
          dot(hX + 23, hY - 2, '#ffffff');

          // 2. Seven Sculpted Chunky Spikes Radiating 360-Degree Fan (images (1).jpg)
          // Spike 1 (Far-Left Ear Flare - sticks out horizontally left):
          for (let r = 0; r < 9; r++) {
            const sy = hY - 1 + r;
            const w = Math.floor(r * 0.6);
            span(sy, hX - 4 + w, hX + 7, hBase);
            dot(hX - 4 + w, sy, hOut);
            dot(hX - 3 + w, sy, hLight);
            dot(hX + 6, sy, hShadow);
          }
          dot(hX - 4, hY - 1, hOut);
          dot(hX - 3, hY, hShine);

          // Spike 2 (Mid-Left Upward-Left Spike):
          for (let r = 0; r < 13; r++) {
            const sy = hY - 12 + r;
            const w = Math.floor(r * 0.48);
            span(sy, hX + 3 - w, hX + 14 + w, hBase);
            dot(hX + 3 - w, sy, hOut);
            dot(hX + 4 - w, sy, hLight);
            dot(hX + 14 + w, sy, hShadow);
          }
          dot(hX + 3, hY - 12, hOut);
          dot(hX + 4, hY - 11, hShine);

          // Spike 3 (Tall Left-Center Peak):
          for (let r = 0; r < 18; r++) {
            const sy = hY - 19 + r;
            const w = Math.floor(r * 0.38);
            span(sy, hX + 12 - w, hX + 21 + w, hBase);
            dot(hX + 12 - w, sy, hOut);
            dot(hX + 13 - w, sy, hLight);
            dot(hX + 21 + w, sy, hShadow);
          }
          dot(hX + 12, hY - 19, hOut);
          dot(hX + 13, hY - 18, '#ffffff');
          span(hY - 17, hX + 12, hX + 15, hShine);

          // Spike 4 (Tall Right-Center Peak - Forward Angle):
          for (let r = 0; r < 19; r++) {
            const sy = hY - 21 + r;
            const w = Math.floor(r * 0.38);
            span(sy, hX + 20 - w, hX + 29 + w, hBase);
            dot(hX + 20 - w, sy, hOut);
            dot(hX + 21 - w, sy, hLight);
            dot(hX + 29 + w, sy, hShadow);
          }
          dot(hX + 20, hY - 21, hOut);
          dot(hX + 21, hY - 20, '#ffffff');
          span(hY - 19, hX + 20, hX + 23, hShine);

          // Spike 5 (Mid-Right High Crest):
          for (let r = 0; r < 16; r++) {
            const sy = hY - 18 + r;
            const w = Math.floor(r * 0.42);
            span(sy, hX + 28 - w, hX + 36 + w, hBase);
            dot(hX + 28 - w, sy, hOut);
            dot(hX + 29 - w, sy, hLight);
            dot(hX + 36 + w, sy, hShadow);
          }
          dot(hX + 28, hY - 18, hOut);
          dot(hX + 29, hY - 17, hShine);

          // Spike 6 (Upper Right Downward Flare):
          for (let r = 0; r < 13; r++) {
            const sy = hY - 11 + r;
            const w = Math.floor(r * 0.48);
            span(sy, hX + 34 - w, hX + 43 + w, hBase);
            dot(hX + 43 + w, sy, hOut);
            dot(hX + 35 - w, sy, hLight);
            dot(hX + 42 + w, sy, hShadow);
          }
          dot(hX + 43, hY - 11, hOut);
          dot(hX + 42, hY - 10, hShine);

          // Spike 7 (Far-Right Lower Ear Flare):
          for (let r = 0; r < 10; r++) {
            const sy = hY - 2 + r;
            const w = Math.floor(r * 0.5);
            span(sy, hX + 40, hX + 48 + w, hBase);
            dot(hX + 48 + w, sy, hOut);
            dot(hX + 41, sy, hLight);
            dot(hX + 47 + w, sy, hDark);
          }
          dot(hX + 48, hY - 2, hOut);

          // 3. Chunky Forehead Bangs Draping OVER Headband Plate (Directly from images (1).jpg!)
          // Bang 1 (Far-left jagged tuft):
          span(hY + 6, hX + 9, hX + 15, hBase);
          span(hY + 7, hX + 9, hX + 14, hLight);
          span(hY + 8, hX + 10, hX + 14, hLight);
          span(hY + 9, hX + 10, hX + 13, hBase);
          span(hY + 10, hX + 11, hX + 12, hBase);
          dot(hX + 11, hY + 11, hOut);
          dot(hX + 9, hY + 7, hOut);

          // Bang 2 (Center-left jagged lock - drapes boldly over left plate):
          span(hY + 6, hX + 16, hX + 23, hBase);
          span(hY + 7, hX + 17, hX + 23, hLight);
          span(hY + 8, hX + 17, hX + 22, hLight);
          span(hY + 9, hX + 18, hX + 22, hBase);
          span(hY + 10, hX + 18, hX + 21, hLight);
          span(hY + 11, hX + 19, hX + 21, hBase);
          span(hY + 12, hX + 20, hX + 21, hBase);
          dot(hX + 20, hY + 13, hOut); // Distinct triangular tip over plate!
          dot(hX + 19, hY + 12, hLight);
          dot(hX + 21, hY + 12, hShadow);

          // Bang 3 (Center-right jagged lock - drapes boldly over right plate):
          span(hY + 6, hX + 25, hX + 32, hBase);
          span(hY + 7, hX + 25, hX + 31, hLight);
          span(hY + 8, hX + 26, hX + 31, hLight);
          span(hY + 9, hX + 26, hX + 30, hBase);
          span(hY + 10, hX + 27, hX + 30, hLight);
          span(hY + 11, hX + 27, hX + 29, hBase);
          span(hY + 12, hX + 28, hX + 29, hBase);
          dot(hX + 28, hY + 13, hOut); // Distinct triangular tip over plate!
          dot(hX + 27, hY + 12, hLight);
          dot(hX + 29, hY + 12, hShadow);

          // Bang 4 (Far-right jagged tuft):
          span(hY + 6, hX + 33, hX + 39, hBase);
          span(hY + 7, hX + 34, hX + 39, hLight);
          span(hY + 8, hX + 34, hX + 38, hLight);
          span(hY + 9, hX + 35, hX + 38, hBase);
          span(hY + 10, hX + 36, hX + 37, hBase);
          dot(hX + 37, hY + 11, hOut);
          dot(hX + 39, hY + 7, hOut);

          // 4. Stepped Anime Sideburns (Chunky locks framing cheeks)
          for (let r = 0; r < 14; r++) {
            const sy = hY + 7 + r;
            span(sy, hX + 4, hX + 8 - r * 0.25, r % 2 === 0 ? hLight : hBase);
            dot(hX + 4, sy, hLight);
            dot(Math.floor(hX + 8 - r * 0.25), sy, hShadow);
          }
          dot(hX + 5, hY + 21, hOut);

          for (let r = 0; r < 14; r++) {
            const sy = hY + 7 + r;
            span(sy, hX + 39 + r * 0.2, hX + 43, r % 2 === 0 ? hLight : hBase);
            dot(hX + 43, sy, hDark);
            dot(Math.floor(hX + 39 + r * 0.2), sy, hLight);
          }
          dot(hX + 41, hY + 21, hOut);
          break;

        case 'Sasuke Rogue Fringe':
          // -------------------------------------------------------------------
          // THE UCHIHA AVENGER: M-SHAPED CURTAIN BANGS & DUCKTAIL CRESTS (images (1).jpg)
          // -------------------------------------------------------------------
          // 1. Sleek Skull Volume Base & Sapphire Halo Sheen
          span(hY - 3, hX + 11, hX + 37, hLight);
          span(hY - 2, hX + 9, hX + 39, hBase);
          span(hY - 1, hX + 8, hX + 40, hBase);
          for (let y = hY; y <= hY + 6; y++) {
            span(y, hX + 7, hX + 41, hBase);
          }
          // Lustrous blue angel-ring sheen curve
          span(hY - 1, hX + 15, hX + 33, hShine);
          dot(hX + 22, hY - 2, '#ffffff');
          dot(hX + 23, hY - 2, '#ffffff');

          // 2. High Front Crown Spikes (Ducktail layers)
          // Crown Spike L:
          for (let r = 0; r < 13; r++) {
            const sy = hY - 11 + r;
            const w = Math.floor(r * 0.48);
            span(sy, hX + 10 - w, hX + 17, hBase);
            dot(hX + 10 - w, sy, hOut);
            dot(hX + 11 - w, sy, hShine);
          }
          dot(hX + 10, hY - 11, hOut);

          // Crown Spike C (High peak with white tip):
          for (let r = 0; r < 16; r++) {
            const sy = hY - 15 + r;
            const w = Math.floor(r * 0.4);
            span(sy, hX + 19 - w, hX + 26 + w, hBase);
            dot(hX + 19 - w, sy, hOut);
            dot(hX + 20 - w, sy, hLight);
            dot(hX + 26 + w, sy, hShadow);
          }
          dot(hX + 19, hY - 15, hOut);
          dot(hX + 20, hY - 14, '#ffffff');

          // Crown Spike R:
          for (let r = 0; r < 13; r++) {
            const sy = hY - 11 + r;
            const w = Math.floor(r * 0.48);
            span(sy, hX + 30, hX + 37 + w, hBase);
            dot(hX + 37 + w, sy, hOut);
            dot(hX + 31, sy, hLight);
          }
          dot(hX + 37, hY - 11, hOut);

          // 3. Iconic Center-Parted M-Shaped Curtain Bangs (images (1).jpg)
          // Left Temple Curtain Lock (Chunky lock down past jawline to y = hY + 27):
          for (let r = 0; r < 21; r++) {
            const by = hY + 6 + r;
            const bx = hX + 4;
            const w = Math.max(1, Math.floor(5 - r * 0.16));
            span(by, bx, bx + w, hBase);
            dot(bx, by, hOut);
            dot(bx + 1, by, hLight);
            if (r < 10) dot(bx + 2, by, hShine);
          }
          dot(hX + 4, hY + 27, hOut);

          // Right Temple Curtain Lock (Chunky lock down past cheek to y = hY + 27):
          for (let r = 0; r < 21; r++) {
            const by = hY + 6 + r;
            const bx = Math.floor(hX + 38 + r * 0.14);
            span(by, bx, hX + 43, hBase);
            dot(hX + 43, by, hDark);
            dot(bx, by, hLight);
            if (r < 10) dot(bx + 1, by, hShine);
          }
          dot(hX + 41, hY + 27, hOut);

          // Center-Parted M Forehead Bangs (Sharp lock between eyebrows):
          span(hY + 6, hX + 17, hX + 22, hBase);
          span(hY + 7, hX + 16, hX + 21, hLight);
          span(hY + 8, hX + 16, hX + 20, hLight);
          span(hY + 9, hX + 17, hX + 20, hBase);
          dot(hX + 17, hY + 10, hOut);

          // The center V-bang drooping between the eyes:
          span(hY + 6, hX + 22, hX + 26, hBase);
          span(hY + 7, hX + 22, hX + 25, hLight);
          span(hY + 8, hX + 23, hX + 25, hShine);
          span(hY + 9, hX + 23, hX + 25, hBase);
          span(hY + 10, hX + 23, hX + 24, hBase);
          dot(hX + 23, hY + 11, hLight);
          dot(hX + 24, hY + 12, hOut); // Center bang apex!

          span(hY + 6, hX + 26, hX + 31, hBase);
          span(hY + 7, hX + 27, hX + 32, hLight);
          span(hY + 8, hX + 28, hX + 32, hLight);
          span(hY + 9, hX + 29, hX + 32, hBase);
          dot(hX + 31, hY + 10, hOut);
          break;

        case 'Kakashi Tilt':
          // -------------------------------------------------------------------
          // THE COPY NINJA: WINDSWEPT GRAVITY-DEFYING SILVER CREST (45° TILT)
          // -------------------------------------------------------------------
          // Sleek Silver Crown
          span(hY - 3, hX + 10, hX + 36, hLight);
          for (let y = hY - 2; y <= hY + 6; y++) {
            span(y, hX + 6, hX + 40, hBase);
          }
          // Main Tilted Plume (Angling back-left)
          for (let r = 0; r < 21; r++) {
            const sy = hY - 17 + r;
            const sx = hX + 18 - r * 0.85;
            span(sy, sx, sx + 18, hLight);
            dot(sx, sy, hShine);
            dot(sx + 1, sy, '#ffffff');
            dot(sx + 18, sy, hDark);
          }
          dot(hX + 18, hY - 18, '#ffffff');
          dot(hX + 24, hY - 16, '#ffffff');
          dot(hX + 29, hY - 14, '#ffffff');

          // Forehead lock swooping across left brow
          span(hY + 7, hX + 9, hX + 16, hBase);
          span(hY + 8, hX + 10, hX + 17, hLight);
          span(hY + 9, hX + 11, hX + 16, hBase);
          dot(hX + 12, hY + 10, hOut);

          // Sideburns
          for (let r = 0; r < 14; r++) {
            span(hY + 8 + r, hX + 4, hX + 8, hLight);
            dot(hX + 4, hY + 8 + r, '#ffffff');
            span(hY + 8 + r, hX + 38, hX + 42, hBase);
            dot(hX + 42, hY + 8 + r, hDark);
          }
          dot(hX + 5, hY + 22, hOut);
          dot(hX + 40, hY + 22, hOut);
          break;

        case 'Minato Winged Flare':
          // -------------------------------------------------------------------
          // YELLOW FLASH: EXPANSIVE WINGED SIDEBURNS & MULTI-TIER CROWN
          // -------------------------------------------------------------------
          span(hY - 4, hX + 10, hX + 36, hLight);
          for (let y = hY - 3; y <= hY + 6; y++) {
            span(y, hX + 5, hX + 41, hBase);
          }
          // Wide Left Flared Wing
          for (let r = 0; r < 14; r++) {
            const sy = hY + 6 + r;
            const w = Math.floor(r * 0.5);
            span(sy, hX - 4 - w, hX + 7, hBase);
            dot(hX - 4 - w, sy, hLight);
            dot(hX - 3 - w, sy, hShine);
          }
          dot(hX - 10, hY + 19, hOut);

          // Wide Right Flared Wing
          for (let r = 0; r < 14; r++) {
            const sy = hY + 6 + r;
            const w = Math.floor(r * 0.5);
            span(sy, hX + 39, hX + 50 + w, hBase);
            dot(hX + 50 + w, sy, hDark);
            dot(hX + 49 + w, sy, hShadow);
          }
          dot(hX + 56, hY + 19, hOut);

          // Tall Spiky Peaks
          dot(hX + 14, hY - 15, hOut);
          span(hY - 14, hX + 12, hX + 16, hLight);
          dot(hX + 24, hY - 17, hOut);
          span(hY - 16, hX + 22, hX + 26, hShine);
          dot(hX + 24, hY - 17, '#ffffff');
          dot(hX + 33, hY - 14, hOut);
          span(hY - 13, hX + 31, hX + 35, hLight);

          // Jagged bangs over headband
          span(hY + 7, hX + 17, hX + 21, hLight);
          dot(hX + 19, hY + 8, hOut);
          span(hY + 7, hX + 27, hX + 31, hLight);
          dot(hX + 29, hY + 8, hOut);
          break;

        case 'Madara Wild Cascade':
          // -------------------------------------------------------------------
          // GHOST OF THE UCHIHA: 5 COLOSSAL RAGGED CROWN FLAMES & TORSO CASCADES
          // -------------------------------------------------------------------
          span(hY - 4, hX + 8, hX + 40, hLight);
          for (let y = hY - 3; y <= hY + 6; y++) {
            span(y, hX + 4, hX + 44, hBase);
          }
          span(hY - 1, hX + 14, hX + 34, hShine);

          // 5 Towering Jagged Spikes (Flaming Mane):
          // Spike 1 (Far Left Wing)
          for (let r = 0; r < 15; r++) {
            const sy = hY - 16 + r;
            const w = Math.floor(r * 0.45);
            span(sy, hX + 3 - w, hX + 8 + w, hDark);
            dot(hX + 3 - w, sy, hOut);
            dot(hX + 4 - w, sy, hLight);
          }
          dot(hX + 3, hY - 16, hOut);

          // Spike 2 (Mid-Left Tower)
          for (let r = 0; r < 20; r++) {
            const sy = hY - 22 + r;
            const w = Math.floor(r * 0.4);
            span(sy, hX + 13 - w, hX + 18 + w, hBase);
            dot(hX + 13 - w, sy, hOut);
            dot(hX + 14 - w, sy, hShine);
          }
          dot(hX + 13, hY - 22, '#ffffff');

          // Spike 3 (Center Colossal Crest)
          for (let r = 0; r < 24; r++) {
            const sy = hY - 26 + r;
            const w = Math.floor(r * 0.35);
            span(sy, hX + 24 - w, hX + 28 + w, hBase);
            dot(hX + 24 - w, sy, hOut);
            dot(hX + 25 - w, sy, hShine);
          }
          dot(hX + 24, hY - 26, '#ffffff');

          // Spike 4 (Mid-Right Tower)
          for (let r = 0; r < 20; r++) {
            const sy = hY - 22 + r;
            const w = Math.floor(r * 0.4);
            span(sy, hX + 33 - w, hX + 38 + w, hBase);
            dot(hX + 38 + w, sy, hOut);
            dot(hX + 34 - w, sy, hLight);
          }
          dot(hX + 35, hY - 22, '#ffffff');

          // Spike 5 (Far Right Wing)
          for (let r = 0; r < 15; r++) {
            const sy = hY - 16 + r;
            const w = Math.floor(r * 0.45);
            span(sy, hX + 41 - w, hX + 46 + w, hDark);
            dot(hX + 46 + w, sy, hOut);
            dot(hX + 43, sy, hLight);
          }
          dot(hX + 46, hY - 16, hOut);

          // Tiered Waterfall Locks Flanking Shoulders
          for (let r = 0; r < 18; r++) {
            const my = hY + 8 + r;
            span(my, hX - 4 - r * 0.3, hX + 5, hDark);
            dot(hX - 4 - r * 0.3, my, hOut);
            dot(hX - 3 - r * 0.3, my, hLight);
          }
          for (let r = 0; r < 18; r++) {
            const my = hY + 8 + r;
            span(my, hX + 42, hX + 51 + r * 0.3, hDark);
            dot(hX + 51 + r * 0.3, my, hOut);
          }
          break;

        case 'Cloud Chocobo Spikes':
          // -------------------------------------------------------------------
          // SOLDIER 1ST CLASS: VOLUMINOUS GOLDEN CLUSTER SPIKES
          // -------------------------------------------------------------------
          for (let i = 0; i < 5; i++) {
            const cx = hX + 6 + i * 8;
            const spikeH = 15 + (i % 2 === 0 ? 6 : 2);
            for (let r = 0; r < spikeH; r++) {
              span(hY - spikeH + r, cx - 3, cx + 4, hLight);
              dot(cx - 3, hY - spikeH + r, hOut);
              dot(cx + 4, hY - spikeH + r, hDark);
            }
            dot(cx, hY - spikeH, hShine);
            dot(cx + 1, hY - spikeH, '#ffffff');
          }
          // Side locks
          for (let r = 0; r < 15; r++) {
            span(hY + 7 + r, hX + 3, hX + 7, hLight);
            span(hY + 7 + r, hX + 38, hX + 42, hBase);
          }
          break;

        case 'Noctis Caelum':
          // -------------------------------------------------------------------
          // NOCTIS LUCIS CAELUM: AUTHENTIC 16-BIT JRPG PRINCE HAIRSTYLE
          // Hand-shaded choppy rear tufts, faceted backward crown spikes,
          // glossy angel-ring catchlight sheen, and signature asymmetrical brow fringe!
          // -------------------------------------------------------------------
          // 1. Sleek Skull Base & Volumetric Cranium Dome
          span(hY - 4, hX + 12, hX + 36, hDark);
          span(hY - 3, hX + 10, hX + 38, hBase);
          span(hY - 2, hX + 8, hX + 40, hBase);
          for (let y = hY - 1; y <= hY + 6; y++) {
            span(y, hX + 6, hX + 42, hBase);
          }

          // 2. Choppy Crown Locks with Directional Facet Shading & Specular Peaks
          // Tuft A: High-Left Crest Spike (angled backward-left)
          for (let r = 0; r < 14; r++) {
            const sy = hY - 15 + r;
            const w = Math.floor((r / 14) * 5);
            span(sy, hX + 12 - w, hX + 16 + w, hBase);
            dot(hX + 12 - w, sy, hOut);
            dot(hX + 16 + w, sy, hDark);
            if (r < 7) dot(hX + 13 - w, sy, hLight);
          }
          dot(hX + 12, hY - 16, hOut);
          dot(hX + 13, hY - 15, hShine);
          dot(hX + 14, hY - 15, '#ffffff');

          // Tuft B: Tall Center-Left Peak (signature crown apex)
          for (let r = 0; r < 18; r++) {
            const sy = hY - 18 + r;
            const w = Math.floor((r / 18) * 6);
            span(sy, hX + 19 - w, hX + 23 + w, hBase);
            dot(hX + 19 - w, sy, hOut);
            dot(hX + 23 + w, sy, hDark);
            if (r < 9) dot(hX + 20 - w, sy, hLight);
          }
          dot(hX + 20, hY - 19, hOut);
          dot(hX + 20, hY - 18, hShine);
          dot(hX + 21, hY - 18, '#ffffff');

          // Tuft C: Center-Right Backward Crest
          for (let r = 0; r < 17; r++) {
            const sy = hY - 17 + r;
            const w = Math.floor((r / 17) * 5);
            span(sy, hX + 27 - w, hX + 31 + w, hBase);
            dot(hX + 27 - w, sy, hOut);
            dot(hX + 31 + w, sy, hDark);
            if (r < 8) dot(hX + 28 - w, sy, hLight);
          }
          dot(hX + 28, hY - 18, hOut);
          dot(hX + 28, hY - 17, hShine);

          // Tuft D: Far-Right Flared Crest
          for (let r = 0; r < 13; r++) {
            const sy = hY - 13 + r;
            const w = Math.floor((r / 13) * 5);
            span(sy, hX + 35 - w, hX + 39 + w, hBase);
            dot(hX + 39 + w, sy, hOut);
            dot(hX + 35 - w, sy, hDark);
            if (r < 6) dot(hX + 36, sy, hLight);
          }
          dot(hX + 37, hY - 14, hOut);
          dot(hX + 36, hY - 13, hShine);

          // 3. Glossy Angel-Ring Crown Sheen (Electric Azure & Specular Catchlights)
          span(hY - 1, hX + 14, hX + 34, hLight);
          span(hY, hX + 16, hX + 32, hShine);
          span(hY + 1, hX + 18, hX + 30, hLight);
          dot(hX + 21, hY - 1, '#ffffff');
          dot(hX + 22, hY - 1, '#ffffff');
          dot(hX + 25, hY - 1, '#ffffff');
          dot(hX + 26, hY - 1, '#ffffff');

          // 4. Sweeping Left Framing Locks (meeting the popped leather collar)
          for (let r = 0; r < 19; r++) {
            const by = hY + 6 + r;
            const w = Math.max(1, Math.floor(4 - r * 0.18));
            span(by, hX + 5, hX + 5 + w, hBase);
            dot(hX + 5, by, hLight);
            if (r < 8) dot(hX + 6, by, hShine);
          }
          dot(hX + 5, hY + 25, hOut);

          // 5. Forehead Wisps & Bang Layer (above brow)
          // Left-mid wisp
          span(hY + 7, hX + 11, hX + 16, hBase);
          span(hY + 8, hX + 12, hX + 17, hLight);
          span(hY + 9, hX + 13, hX + 16, hBase);
          dot(hX + 14, hY + 10, hOut);

          // 6. Signature Sweeping Asymmetrical Brow Fringe (Falling between eyes to bridge)
          // Tapers from hX + 18 across brow to hX + 24 down to y = hY + 13
          span(hY + 7, hX + 17, hX + 24, hBase);
          span(hY + 8, hX + 19, hX + 25, hLight);
          span(hY + 9, hX + 20, hX + 25, hBase);
          span(hY + 10, hX + 21, hX + 25, hBase);
          dot(hX + 21, hY + 10, hLight);
          dot(hX + 22, hY + 10, hShine);
          span(hY + 11, hX + 22, hX + 25, hBase);
          dot(hX + 22, hY + 11, hLight);
          span(hY + 12, hX + 23, hX + 24, hBase);
          dot(hX + 23, hY + 13, hOut); // Brooding lock apex!

          // Secondary Right Forehead Wisp
          span(hY + 7, hX + 26, hX + 32, hBase);
          span(hY + 8, hX + 28, hX + 33, hLight);
          span(hY + 9, hX + 29, hX + 32, hBase);
          dot(hX + 31, hY + 10, hOut);

          // 7. Near Right Cheek-Framing Lock
          for (let r = 0; r < 17; r++) {
            const by = hY + 6 + r;
            const w = Math.max(1, Math.floor(4 - r * 0.2));
            span(by, hX + 38 - w, hX + 41, hBase);
            dot(hX + 41, by, hDark);
            if (r < 8) dot(hX + 39, by, hLight);
          }
          dot(hX + 39, hY + 23, hOut);
          break;

        case 'Squall Modern Fringe':
        default:
          // -------------------------------------------------------------------
          // MODERN ANIME HERO: TOUSLED FEATHERED FRINGE & DIRECTIONAL ANGLED LAYERS
          // -------------------------------------------------------------------
          // Sleek Skull Base & Crown Volume
          span(hY - 3, hX + 11, hX + 37, hLight);
          span(hY - 2, hX + 9, hX + 39, hBase);
          for (let y = hY - 1; y <= hY + 6; y++) {
            span(y, hX + 6, hX + 42, hBase);
          }

          // Tousled Crown Spikes with Faceted Light Ridges
          [
            { x: hX + 12, y: hY - 14, h: 12, w: 5 },
            { x: hX + 20, y: hY - 17, h: 16, w: 6 },
            { x: hX + 27, y: hY - 16, h: 15, w: 5 },
            { x: hX + 36, y: hY - 12, h: 11, w: 4 },
          ].forEach((s) => {
            for (let r = 0; r < s.h; r++) {
              const sy = s.y + r;
              const half = Math.floor((r / s.h) * s.w);
              span(sy, s.x - half, s.x + half, hBase);
              dot(s.x - half, sy, hOut);
              dot(s.x + half, sy, hDark);
              if (r < s.h * 0.6) dot(s.x - half + 1, sy, hLight);
            }
            dot(s.x, s.y, hShine);
          });

          // Glossy Angel Ring Halo Sheen
          span(hY, hX + 15, hX + 33, hShine);
          dot(hX + 22, hY - 1, '#ffffff');
          dot(hX + 25, hY - 1, '#ffffff');

          // Asymmetrical Angled Bangs Swept across Forehead
          for (let r = 0; r < 18; r++) {
            const by = hY + 7 + r;
            span(by, hX + 5, hX + 10 - r * 0.25, hBase);
            dot(hX + 5, by, hLight);
            dot(hX + 6, by, hShine);
          }
          dot(hX + 6, hY + 24, hOut);

          // Sweeping fringe over brow
          span(hY + 7, hX + 11, hX + 17, hBase);
          span(hY + 8, hX + 12, hX + 18, hLight);
          dot(hX + 15, hY + 11, hOut);

          span(hY + 7, hX + 19, hX + 26, hBase);
          span(hY + 8, hX + 21, hX + 27, hLight);
          span(hY + 9, hX + 22, hX + 28, hBase);
          dot(hX + 25, hY + 12, hOut);

          for (let r = 0; r < 16; r++) {
            const by = hY + 7 + r;
            span(by, hX + 37 + r * 0.2, hX + 42, hBase);
            dot(hX + 42, by, hDark);
          }
          dot(hX + 40, hY + 23, hOut);
          break;

        case 'Itachi Low Ribbon':
          span(hY - 1, hX + 13, hX + 33, hBase);
          for (let y = hY; y <= hY + 6; y++) {
            span(y, hX + 7, hX + 39, hBase);
          }
          span(hY + 1, hX + 16, hX + 30, hLight);
          span(hY + 2, hX + 19, hX + 27, hShine);

          // Long sleek framing bangs down cheeks
          for (let r = 0; r < 19; r++) {
            const by = hY + 7 + r;
            span(by, hX + 4, hX + 9 - r * 0.2, hBase);
            dot(hX + 4, by, hLight);
            span(by, hX + 36 + r * 0.2, hX + 41, hBase);
            dot(hX + 41, by, hDark);
          }
          dot(hX + 5, hY + 26, hOut);
          dot(hX + 39, hY + 26, hOut);
          break;

        case 'Sephiroth Parted Flow':
          span(hY - 2, hX + 15, hX + 31, hLight);
          span(hY - 1, hX + 12, hX + 34, hShine);
          for (let y = hY; y <= hY + 6; y++) {
            span(y, hX + 8, hX + 38, hLight);
          }
          for (let r = 0; r < 24; r++) {
            const by = hY + 7 + r;
            span(by, hX + 3, hX + 9, hLight);
            dot(hX + 3, by, '#ffffff');
            span(by, hX + 37, hX + 43, hLight);
            dot(hX + 43, by, hDark);
          }
          span(hY + 6, hX + 18, hX + 20, '#ffffff');
          span(hY + 6, hX + 25, hX + 27, '#ffffff');
          break;

        case 'Knight Pointed Helm':
          trapezoid(hY - 8, hY + 11, hX + 10, hX + 3, hX + 34, hX + 41, silverMid);
          for (let y = hY - 8; y <= hY + 10; y++) {
            dot(hX + 23, y, silverWhite);
            dot(hX + 24, y, '#ffffff');
          }
          span(hY + 10, hX + 11, hX + 34, '#090d16');
          span(hY + 11, hX + 12, hX + 33, '#090d16');
          for (let r = 0; r < 8; r++) {
            span(hY - 14 + r, hX + 21, hX + 26, '#dc2626');
            dot(hX + 22, hY - 14 + r, '#ef4444');
          }
          break;

        case 'Somnus Caelum':
          span(hY - 4, hX + 8, hX + 40, hDark);
          span(hY - 3, hX + 7, hX + 41, hBase);
          for (let y = hY - 2; y <= hY + 6; y++) {
            span(y, hX + 5, hX + 43, hBase);
            if (y % 2 === 0) {
              for (let x = hX + 8; x <= hX + 40; x += 4) {
                dot(x, y, hLight);
                dot(x + 1, y, hDark);
              }
            }
          }
          [
            { x: hX + 8, y: hY - 14, h: 11, w: 5 },
            { x: hX + 18, y: hY - 18, h: 15, w: 6 },
            { x: hX + 28, y: hY - 19, h: 16, w: 6 },
            { x: hX + 38, y: hY - 14, h: 12, w: 5 },
          ].forEach((d) => {
            for (let r = 0; r < d.h; r++) {
              const dy = d.y + r;
              const half = Math.floor((r / d.h) * d.w);
              span(dy, d.x - half, d.x + half, r % 3 === 0 ? hLight : hBase);
              dot(d.x - half, dy, hOut);
              dot(d.x + half, dy, hDark);
            }
            dot(d.x, d.y, hShine);
          });
          const coronetY = hY + 7;
          span(coronetY, hX + 10, hX + 38, silverMid);
          span(coronetY + 1, hX + 11, hX + 37, silverWhite);
          dot(hX + 10, coronetY, silverDeep);
          dot(hX + 38, coronetY, silverDeep);
          span(coronetY, hX + 18, hX + 30, silverShine);
          span(coronetY - 2, hX + 23, hX + 25, silverWhite);
          span(coronetY - 1, hX + 22, hX + 26, '#ffffff');
          span(coronetY, hX + 23, hX + 25, silverShine);
          dot(hX + 24, coronetY - 1, '#38bdf8');
          for (let r = 0; r < 24; r++) {
            const dy = hY + 9 + r;
            span(dy, hX + 2 - r * 0.1, hX + 7, r % 2 === 0 ? hBase : hDark);
            dot(hX + 2 - r * 0.1, dy, hLight);
            if (r === 6 || r === 7 || r === 15 || r === 16) {
              span(dy, hX + 2 - r * 0.1, hX + 7, silverWhite);
              dot(hX + 3, dy, '#ffffff');
            }
          }
          dot(hX + 2, hY + 33, hOut);
          for (let r = 0; r < 24; r++) {
            const dy = hY + 9 + r;
            span(dy, hX + 41, hX + 46 + r * 0.1, r % 2 === 0 ? hBase : hDark);
            dot(hX + 46 + r * 0.1, dy, hDark);
            if (r === 6 || r === 7 || r === 15 || r === 16) {
              span(dy, hX + 41, hX + 46 + r * 0.1, silverWhite);
              dot(hX + 43, dy, '#ffffff');
            }
          }
          dot(hX + 46, hY + 33, hOut);
          break;
      }
    };

    render();
    const interval = setInterval(render, 50); // 20 FPS smooth pixel micro-motion

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
        width={128}
        height={128}
        className="w-full h-full pointer-events-none drop-shadow-md pixelated"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export const ShinobiSpriteCanvas: React.FC<ShinobiSpriteCanvasProps> = ({
  character,
  stance = 'idle',
  size = 256,
  isEnhanced = false,
  className = '',
  showAura = true,
  showShadow = true,
  renderEngine = 'pixel',
  pixelScaleMode = 'jrpg_64',
}) => {
  if (renderEngine === 'hd') {
    return (
      <ShinobiSpriteHD
        character={character}
        stance={stance}
        size={size}
        className={className}
        showShadow={showShadow}
        isEnhanced={isEnhanced}
      />
    );
  }

  // 16-Bit JRPG Mode (Authentic 64x64 canvas, 4.5-5 head proportions, Selout, Clump Volumes & Hue-Shifting)
  const is16BitJRPG =
    renderEngine === 'jrpg_16bit' ||
    pixelScaleMode === 'jrpg_64' ||
    character.hairstyle === 'Noctis Caelum' ||
    character.name?.includes('Noctis');

  if (is16BitJRPG) {
    return (
      <ShinobiSprite16BitJRPG
        character={character}
        stance={stance}
        size={size}
        isEnhanced={isEnhanced}
        className={className}
        showAura={showAura}
        showShadow={showShadow}
      />
    );
  }

  return (
    <ShinobiPixelCanvas
      character={character}
      stance={stance}
      size={size}
      isEnhanced={isEnhanced}
      className={className}
      showAura={showAura}
      showShadow={showShadow}
      renderEngine="pixel"
    />
  );
};

export { ShinobiSpriteHD, ShinobiSprite16BitJRPG };
