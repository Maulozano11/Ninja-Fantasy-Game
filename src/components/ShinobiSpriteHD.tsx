import React, { useId } from 'react';
import {
  ShinobiCharacter,
  HairstyleType,
  ArmorStyleType,
  DojutsuType,
  HeadbandPositionType,
  WeaponStyleType,
  CapeStyleType,
} from '../types/shinobi';

export interface ShinobiSpriteHDProps {
  character: ShinobiCharacter;
  stance?: 'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory';
  size?: number;
  className?: string;
  showShadow?: boolean;
  isEnhanced?: boolean;
}

/**
 * High-Definition Hand-Drawn Anime Sprite Engine
 * Features smooth vector curve paths, multi-stop gradient shading,
 * expressive anime eyes, volumetric hair with specular sheen,
 * and modular fitted costume layers.
 */
export const ShinobiSpriteHD: React.FC<ShinobiSpriteHDProps> = ({
  character,
  stance = 'idle',
  size = 256,
  className = '',
  showShadow = true,
  isEnhanced = false,
}) => {
  const rawId = useId();
  const idPrefix = 'shd_' + rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const p = character.palette || {
    skinTone: '#f8d2b2',
    hairColor: '#eab308',
    eyeColor: '#1e3a8a',
    armorPrimary: '#22543d',
    armorSecondary: '#1c4532',
    clothColor: '#18181b',
    headbandCloth: '#1e3a8a',
    headbandPlate: '#94a3b8',
    chakraAuraColor: '#38bdf8',
    capeColor: '#b91c1c',
    accentColor: '#fbbf24',
  };

  const skinTone = p.skinTone || '#f8d2b2';
  const hairColor = p.hairColor || '#eab308';
  const eyeColor = p.eyeColor || '#1e3a8a';
  const armorPrimary = p.armorPrimary || '#22543d';
  const armorSecondary = p.armorSecondary || '#1c4532';
  const clothColor = p.clothColor || '#18181b';
  const headbandCloth = p.headbandCloth || '#1e3a8a';
  const headbandPlate = p.headbandPlate || '#94a3b8';
  const chakraAuraColor = p.chakraAuraColor || '#38bdf8';
  const capeColor = p.capeColor || '#b91c1c';
  const accentColor = p.accentColor || '#fbbf24';

  const hairstyle: HairstyleType = character.hairstyle || 'Naruto Spike';
  const armorStyle: ArmorStyleType = character.armorStyle || 'Leaf Chunin Flak';
  const dojutsu: DojutsuType = character.dojutsu || 'None';
  const headbandPos: HeadbandPositionType = character.headbandPosition || 'Forehead';
  const weaponStyle: WeaponStyleType = character.weaponStyle || 'Katana Blade';
  const capeStyle: CapeStyleType = character.capeStyle || 'None';

  // Stance animation transforms
  let bodyYOffset = 0;
  let bodyRotate = 0;
  let rightArmPose = 'idle';
  let leftArmPose = 'idle';
  let showChakraAura = isEnhanced || stance === 'cast';

  const isIdle = stance === 'idle';
  const isAttacking = stance === 'attack';
  const isCasting = stance === 'cast';
  const isHurt = stance === 'hurt';
  const isVictory = stance === 'victory';

  switch (stance) {
    case 'handsigns':
      bodyYOffset = 3;
      rightArmPose = 'handsigns';
      leftArmPose = 'handsigns';
      showChakraAura = true;
      break;
    case 'attack':
      bodyYOffset = 6;
      bodyRotate = -4;
      rightArmPose = 'attack';
      leftArmPose = 'attack';
      break;
    case 'cast':
      bodyYOffset = -2;
      rightArmPose = 'cast';
      leftArmPose = 'cast';
      showChakraAura = true;
      break;
    case 'hurt':
      bodyYOffset = 8;
      bodyRotate = 6;
      rightArmPose = 'hurt';
      leftArmPose = 'hurt';
      break;
    case 'victory':
      bodyYOffset = -4;
      rightArmPose = 'victory';
      leftArmPose = 'idle';
      break;
    case 'idle':
    default:
      bodyYOffset = 0;
      bodyRotate = 0;
      break;
  }

  return (
    <div
      className={`relative select-none inline-flex items-center justify-center overflow-visible ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 400 480"
        className="w-full h-full drop-shadow-md overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Filters */}
          <filter id={`${idPrefix}_glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id={`${idPrefix}_shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.45" floodColor="#090d16" />
          </filter>

          <filter id={`${idPrefix}_soft_shadow`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="3" stdDeviation="2" floodOpacity="0.3" floodColor="#000" />
          </filter>

          {/* Gradients */}
          {/* Skin Gradient: Highlight to Base to Shadow */}
          <linearGradient id={`${idPrefix}_skin`} x1="0%" y1="0%" x2="40%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="25%" stopColor={skinTone} />
            <stop offset="85%" stopColor={skinTone} />
            <stop offset="100%" stopColor="#b47458" />
          </linearGradient>

          <linearGradient id={`${idPrefix}_skin_shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={skinTone} />
            <stop offset="100%" stopColor="#9a5a40" />
          </linearGradient>

          {/* Hair Gradient */}
          <linearGradient id={`${idPrefix}_hair`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop
              offset="0%"
              stopColor={hairstyle === 'Noctis Caelum' ? '#93c5fd' : '#ffffff'}
              stopOpacity={hairstyle === 'Noctis Caelum' ? 0.75 : 0.45}
            />
            <stop
              offset="25%"
              stopColor={hairstyle === 'Noctis Caelum' ? '#3b82f6' : hairColor}
              stopOpacity={hairstyle === 'Noctis Caelum' ? 0.85 : 1}
            />
            <stop offset="55%" stopColor={hairColor} />
            <stop offset="100%" stopColor="#0a0d14" stopOpacity={0.95} />
          </linearGradient>

          {/* Hair Sheen Halo (Angel Ring) */}
          <linearGradient id={`${idPrefix}_hair_sheen`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Eye Gradient */}
          <linearGradient id={`${idPrefix}_eye`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#040609" />
            <stop offset="40%" stopColor={hairstyle === 'Noctis Caelum' ? '#0ea5e9' : eyeColor} />
            <stop offset="80%" stopColor={hairstyle === 'Noctis Caelum' ? '#38bdf8' : '#38bdf8'} />
            <stop offset="100%" stopColor={hairstyle === 'Noctis Caelum' ? '#7dd3fc' : '#bae6fd'} />
          </linearGradient>

          {/* Armor Primary Gradient */}
          <linearGradient id={`${idPrefix}_armor_pri`} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="30%" stopColor={armorPrimary} />
            <stop offset="85%" stopColor={armorPrimary} />
            <stop offset="100%" stopColor="#0d1f12" />
          </linearGradient>

          {/* Armor Secondary Gradient */}
          <linearGradient id={`${idPrefix}_armor_sec`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={armorSecondary} />
            <stop offset="100%" stopColor="#09120a" />
          </linearGradient>

          {/* Cloth Dark Gradient */}
          <linearGradient id={`${idPrefix}_cloth`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor={clothColor} />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          {/* Headband Plate Metallic Gradient */}
          <linearGradient id={`${idPrefix}_metal`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="35%" stopColor="#f8fafc" />
            <stop offset="55%" stopColor={headbandPlate} />
            <stop offset="85%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Katana Blade Steel */}
          <linearGradient id={`${idPrefix}_steel`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Chakra Energy Gradient */}
          <radialGradient id={`${idPrefix}_chakra_aura`}>
            <stop offset="0%" stopColor={chakraAuraColor} stopOpacity="0.6" />
            <stop offset="60%" stopColor={chakraAuraColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={chakraAuraColor} stopOpacity="0" />
          </radialGradient>

          {/* Mesh Shirt Pattern */}
          <pattern id={`${idPrefix}_mesh`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 3 L 6 3 M 3 0 L 3 6" stroke="#52525b" strokeWidth="0.8" opacity="0.6" />
          </pattern>
        </defs>

        {/* ============================================================ */}
        {/* LAYER 0: Ground Contact Shadow & Chakra Radiance Aura */}
        {/* ============================================================ */}
        {showShadow && (
          <ellipse
            cx="200"
            cy="448"
            rx="88"
            ry="18"
            fill="#090d16"
            opacity="0.6"
            filter={`url(#${idPrefix}_soft_shadow)`}
          />
        )}

        {showChakraAura && (
          <g className="animate-pulse" opacity="0.85">
            <ellipse
              cx="200"
              cy="280"
              rx="130"
              ry="170"
              fill={`url(#${idPrefix}_chakra_aura)`}
              filter={`url(#${idPrefix}_glow)`}
            />
            {/* Swirling energy flames */}
            <path
              d="M 120 420 Q 90 320 130 250 Q 150 200 140 140 Q 170 190 160 260 Q 150 340 160 420 Z"
              fill={chakraAuraColor}
              opacity="0.2"
            />
            <path
              d="M 280 420 Q 310 320 270 240 Q 250 180 260 120 Q 230 180 240 260 Q 250 340 240 420 Z"
              fill={chakraAuraColor}
              opacity="0.2"
            />
          </g>
        )}

        {/* Dynamic Body Wrapper with stance offset */}
        <g
          transform={`translate(0, ${bodyYOffset}) rotate(${bodyRotate}, 200, 300)`}
          className="transition-transform duration-300 ease-out"
        >
          {/* ============================================================ */}
          {/* LAYER 1: Back Hair & Back Cape / Haori / Ribbons */}
          {/* ============================================================ */}
          {/* Back Cape Styles */}
          {capeStyle === 'Hokage White Haori' && (
            <g id="back-haori">
              {/* Flowing white cloak back with crimson flames */}
              <path
                d="M 130 190 Q 90 280 80 410 Q 130 425 200 415 Q 270 425 320 405 Q 310 275 270 190 Z"
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="2.5"
              />
              {/* Crimson flame trim at bottom */}
              <path
                d="M 80 410 L 95 380 L 110 415 L 130 375 L 150 418 L 175 372 L 200 415 L 225 372 L 250 418 L 270 375 L 290 412 L 305 380 L 320 405 Z"
                fill="#dc2626"
              />
              <path
                d="M 100 412 L 110 395 L 125 414 L 140 392 L 155 416 L 180 390 L 200 415 L 220 390 L 245 416 L 260 392 L 275 414 L 290 395 L 300 410 Z"
                fill="#ea580c"
              />
            </g>
          )}

          {capeStyle === 'Akatsuki Black Cloak' && (
            <g id="back-akatsuki">
              <path
                d="M 125 180 Q 80 270 70 420 Q 140 435 200 422 Q 260 435 330 415 Q 320 265 275 180 Z"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="3"
              />
              {/* Crimson interior peeking at hem */}
              <path
                d="M 70 420 Q 140 435 200 422 Q 260 435 330 415 L 325 425 Q 260 445 200 432 Q 140 445 65 430 Z"
                fill="#b91c1c"
              />
              {/* Red Cloud Back Emblem */}
              <path
                d="M 175 295 C 165 285 160 265 180 260 C 190 245 215 245 225 260 C 240 260 245 280 230 295 C 240 305 225 315 210 310 C 195 318 175 310 175 295 Z"
                fill="#dc2626"
                stroke="#f8fafc"
                strokeWidth="3"
              />
            </g>
          )}

          {capeStyle === 'Crimson Billowing Knight Cape' && (
            <g id="back-knight-cape">
              <path
                d="M 120 185 Q 60 260 50 415 Q 120 430 190 420 Q 280 430 350 410 Q 340 260 280 185 Z"
                fill={capeColor}
                stroke="#7f1d1d"
                strokeWidth="2.5"
              />
              {/* Deep velvet folds */}
              <path d="M 130 220 Q 100 320 90 415" stroke="#7f1d1d" strokeWidth="4" fill="none" opacity="0.6" />
              <path d="M 270 220 Q 300 320 310 410" stroke="#7f1d1d" strokeWidth="4" fill="none" opacity="0.6" />
            </g>
          )}

          {/* Long Back Hair & 3/4 Perspective Rear Hair Depth */}
          {hairstyle === 'Naruto Spike' && (
            <g id="back-hair-naruto">
              <path
                d="M 148 70 Q 120 75 112 95 Q 128 102 138 105 Q 115 118 114 138 Q 132 138 145 130 L 152 145 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
            </g>
          )}

          {hairstyle === 'Sasuke Rogue Fringe' && (
            <g id="back-hair-sasuke-ducktail">
              <path
                d="M 155 80 Q 115 65 92 38 Q 118 55 128 68 Q 105 28 116 10 Q 135 34 146 54 Q 132 12 154 -6 Q 165 22 172 45 L 175 75 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
            </g>
          )}

          {hairstyle === 'Minato Winged Flare' && (
            <g id="back-hair-minato">
              <path
                d="M 145 85 Q 92 110 82 145 Q 112 135 132 115 L 148 135 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
            </g>
          )}

          {hairstyle === 'Kakashi Tilt' && (
            <g id="back-hair-kakashi">
              <path
                d="M 152 75 Q 98 62 82 42 Q 108 58 128 68 L 140 115 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
            </g>
          )}

          {(hairstyle === 'Madara Wild Cascade' || hairstyle === 'Sephiroth Parted Flow') && (
            <g id="back-hair-cascade">
              <path
                d="M 140 130 Q 90 200 80 320 Q 95 360 115 310 Q 110 360 135 380 Q 145 320 160 300 L 240 300 Q 255 320 265 380 Q 290 360 285 310 Q 305 360 320 320 Q 310 200 260 130 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
            </g>
          )}

          {hairstyle === 'Itachi Low Ribbon' && (
            <g id="back-hair-ponytail">
              <path
                d="M 185 160 Q 170 240 180 340 Q 195 370 205 340 Q 215 240 215 160 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2"
              />
              {/* Red Ribbon tie */}
              <circle cx="198" cy="220" r="7" fill="#dc2626" />
              <path d="M 194 225 Q 185 260 178 290" stroke="#dc2626" strokeWidth="3" fill="none" />
              <path d="M 202 225 Q 215 260 220 290" stroke="#dc2626" strokeWidth="3" fill="none" />
            </g>
          )}

          {hairstyle === 'Noctis Caelum' && (
            <g id="back-hair-noctis">
              {/* Choppy Rear Spike 1 (High-left crest angled backward) */}
              <path
                d="M 148 65 Q 112 46 102 24 Q 120 40 134 52 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
              <path d="M 144 60 Q 118 44 110 32" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.8" />
              {/* Choppy Rear Spike 2 (Mid-left flare behind ear) */}
              <path
                d="M 145 78 Q 102 80 94 100 Q 118 100 134 92 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
              <path d="M 140 82 Q 112 84 104 96" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.8" />
              {/* Choppy Rear Spike 3 (Lower nape clump behind popped collar) */}
              <path
                d="M 142 98 Q 116 114 114 134 Q 130 126 142 114 Z"
                fill={`url(#${idPrefix}_hair)`}
                stroke="#18181b"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Fluttering Headband Ribbons (Back) */}
          {headbandPos === 'Forehead' && (
            <g id="headband-ribbons" className="origin-top animate-pulse">
              <path
                d="M 145 105 Q 115 120 90 145 Q 105 130 140 112 Z"
                fill={headbandCloth}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <path
                d="M 143 110 Q 105 135 75 180 Q 95 150 138 116 Z"
                fill={headbandCloth}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* ============================================================ */}
          {/* LAYER 2: Legs, Pants & Shinobi Sandals/Boots */}
          {/* ============================================================ */}
          <g id="legs-and-lower">
            {/* Pelvis / Belt Base */}
            <path
              d="M 148 275 L 252 275 L 260 325 L 140 325 Z"
              fill={`url(#${idPrefix}_cloth)`}
              stroke="#09090b"
              strokeWidth="2"
            />

            {/* Left Leg (Rear / Anchored Leg) */}
            <g id="left-leg">
              {/* Thigh */}
              <path
                d="M 152 320 Q 140 365 145 400 L 180 400 Q 185 365 188 320 Z"
                fill={`url(#${idPrefix}_cloth)`}
                stroke="#09090b"
                strokeWidth="2"
              />
              {/* Knee Cloth Fold */}
              <path d="M 142 360 Q 160 365 178 358" stroke="#18181b" strokeWidth="2" fill="none" />

              {/* Lower Leg: Bandage Wraps */}
              <path
                d="M 145 398 L 140 445 L 175 445 L 180 398 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              {/* Bandage spiral lines */}
              <line x1="144" y1="408" x2="178" y2="412" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="142" y1="420" x2="176" y2="424" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="141" y1="432" x2="175" y2="436" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Rear Shinobi Sandal */}
              <path
                d="M 138 442 L 132 458 L 176 458 L 176 442 Z"
                fill="#0f172a"
                stroke="#020617"
                strokeWidth="2"
              />
              {/* Exposed Toes */}
              <ellipse cx="140" cy="452" rx="6" ry="4" fill={skinTone} />
            </g>

            {/* Right Leg (Forward Dynamic 3/4 Leg) */}
            <g id="right-leg">
              {/* Thigh */}
              <path
                d="M 212 320 Q 225 365 220 400 L 255 400 Q 262 365 250 320 Z"
                fill={`url(#${idPrefix}_cloth)`}
                stroke="#09090b"
                strokeWidth="2"
              />
              {/* Thigh Bandage & Shuriken Holster */}
              <rect x="218" y="342" width="38" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              {/* Holster Pouch */}
              <rect x="242" y="338" width="16" height="24" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="250" cy="348" r="2" fill="#fbbf24" />

              {/* Knee Fold */}
              <path d="M 220 375 Q 238 378 254 372" stroke="#18181b" strokeWidth="2" fill="none" />

              {/* Lower Leg Bandages */}
              <path
                d="M 220 398 L 225 445 L 260 445 L 255 398 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <line x1="221" y1="408" x2="257" y2="412" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="223" y1="420" x2="258" y2="424" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="224" y1="432" x2="259" y2="436" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Forward Shinobi Sandal / Boot */}
              <path
                d="M 223 442 L 220 458 L 270 458 L 262 442 Z"
                fill="#0f172a"
                stroke="#020617"
                strokeWidth="2"
              />
              {/* Front Toe Open Window */}
              <ellipse cx="264" cy="452" rx="6" ry="4" fill={skinTone} />
              <line x1="220" y1="458" x2="270" y2="458" stroke="#334155" strokeWidth="3" />
            </g>
          </g>

          {/* ============================================================ */}
          {/* LAYER 2.5: Right Arm & Hand Behind Body (East Perspective) */}
          {/* ============================================================ */}
          {rightArmPose === 'idle' && (
            <g id="right-arm-behind-body">
              {/* Upper Arm & Bicep curving down behind the right flank */}
              <path
                d="M 252 180 Q 272 215 268 250 L 254 250 Q 256 220 244 190 Z"
                fill={`url(#${idPrefix}_skin_shadow)`}
                stroke="#7c2d12"
                strokeWidth="2"
              />
              {/* Forearm Bracer in ambient shadow */}
              <rect x="252" y="226" width="18" height="24" rx="3" fill="#0f172a" stroke="#020617" strokeWidth="1.5" />
              <rect x="256" y="234" width="6" height="8" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="1" />

              {/* Sculpted Right Hand resting behind hip/waist */}
              <ellipse cx="260" cy="266" rx="9" ry="8" fill="#09090b" stroke="#020617" strokeWidth="1.8" />
              {/* Knuckle plates in shadow */}
              <circle cx="256" cy="267" r="1.1" fill="#475569" />
              <circle cx="260" cy="268" r="1.1" fill="#475569" />
              <circle cx="264" cy="268" r="1.1" fill="#475569" />
              <circle cx="267" cy="266" r="1.1" fill="#475569" />
              {/* Curled fingertips below glove peeking from behind flank */}
              <path d="M 256 272 Q 262 276 268 272" stroke={skinTone} strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.85" />
              <line x1="260" y1="271" x2="260" y2="274" stroke="#7c2d12" strokeWidth="1" />
              <line x1="264" y1="271" x2="264" y2="274" stroke="#7c2d12" strokeWidth="1" />
            </g>
          )}

          {/* ============================================================ */}
          {/* LAYER 3: Torso, Mesh Undergarment & Outer Armor / Flak Vest */}
          {/* ============================================================ */}
          <g id="torso-and-armor">
            {/* Mesh & Inner Dark Tunic */}
            <path
              d="M 146 175 Q 138 225 144 285 L 256 285 Q 262 225 254 175 Z"
              fill={`url(#${idPrefix}_cloth)`}
              stroke="#09090b"
              strokeWidth="2.5"
            />
            {/* Inner Mesh Neck V */}
            <polygon points="182,165 218,165 200,205" fill={`url(#${idPrefix}_mesh)`} />

            {/* Modular Outer Costume / Armor Styles */}
            {armorStyle === 'Leaf Chunin Flak' && (
              <g id="armor-leaf-flak">
                {/* Tactical Flak Vest Main Body */}
                <path
                  d="M 142 170 Q 135 225 142 280 L 258 280 Q 265 225 258 170 Q 220 182 200 182 Q 180 182 142 170 Z"
                  fill={`url(#${idPrefix}_armor_pri)`}
                  stroke="#142c1b"
                  strokeWidth="3"
                  filter={`url(#${idPrefix}_soft_shadow)`}
                />
                {/* High Padded Collar */}
                <path
                  d="M 165 158 Q 155 175 142 175 Q 180 186 200 186 Q 220 186 258 175 Q 245 175 235 158 Q 200 162 165 158 Z"
                  fill={`url(#${idPrefix}_armor_sec)`}
                  stroke="#0f2315"
                  strokeWidth="2.5"
                />
                {/* Center Zip Seam */}
                <line x1="200" y1="184" x2="200" y2="280" stroke="#0f2315" strokeWidth="3.5" />
                <line x1="198" y1="184" x2="198" y2="280" stroke="#4ade80" strokeWidth="1" opacity="0.6" />

                {/* Left Twin Scroll Pouch with Silver Snap */}
                <rect x="152" y="215" width="22" height="32" rx="4" fill={`url(#${idPrefix}_armor_sec)`} stroke="#0f2315" strokeWidth="2" />
                <rect x="150" y="212" width="26" height="10" rx="3" fill="#1b3823" stroke="#0f2315" strokeWidth="1.5" />
                <circle cx="163" cy="226" r="2.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />

                {/* Right Twin Scroll Pouch with Silver Snap */}
                <rect x="226" y="215" width="22" height="32" rx="4" fill={`url(#${idPrefix}_armor_sec)`} stroke="#0f2315" strokeWidth="2" />
                <rect x="224" y="212" width="26" height="10" rx="3" fill="#1b3823" stroke="#0f2315" strokeWidth="1.5" />
                <circle cx="237" cy="226" r="2.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />

                {/* Padded Shoulder Epaulets */}
                <path d="M 136 172 Q 155 165 170 178" stroke="#142c1b" strokeWidth="4" fill="none" />
                <path d="M 264 172 Q 245 165 230 178" stroke="#142c1b" strokeWidth="4" fill="none" />

                {/* Red Uzumaki Clan Swirl Patch on Left Chest */}
                <circle cx="180" cy="210" r="8" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                <path
                  d="M 180 206 A 4 4 0 0 1 182 212 A 2 2 0 0 1 180 210"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  fill="none"
                />
              </g>
            )}

            {armorStyle === 'Samurai O-Yoroi' && (
              <g id="armor-samurai-oyoroi">
                {/* Segmented Lacquered Cuirass */}
                <path
                  d="M 140 170 Q 134 225 140 285 L 260 285 Q 266 225 260 170 Z"
                  fill={`url(#${idPrefix}_armor_pri)`}
                  stroke="#78350f"
                  strokeWidth="3"
                />
                {/* Horizontal Gold Lacing Plates */}
                <line x1="141" y1="200" x2="259" y2="200" stroke="#f59e0b" strokeWidth="3" />
                <line x1="139" y1="225" x2="261" y2="225" stroke="#f59e0b" strokeWidth="3" />
                <line x1="138" y1="250" x2="262" y2="250" stroke="#f59e0b" strokeWidth="3" />
                <line x1="140" y1="272" x2="260" y2="272" stroke="#f59e0b" strokeWidth="3" />

                {/* Odoshi Silk Cord Cross-stitches */}
                {[160, 180, 200, 220, 240].map((cx) => (
                  <g key={cx}>
                    <line x1={cx - 3} y1="195" x2={cx + 3} y2="205" stroke="#dc2626" strokeWidth="2" />
                    <line x1={cx + 3} y1="195" x2={cx - 3} y2="205" stroke="#dc2626" strokeWidth="2" />
                    <line x1={cx - 3} y1="220" x2={cx + 3} y2="230" stroke="#dc2626" strokeWidth="2" />
                    <line x1={cx + 3} y1="220" x2={cx - 3} y2="230" stroke="#dc2626" strokeWidth="2" />
                  </g>
                ))}

                {/* Left Shoulder Guard (Sode) */}
                <path
                  d="M 112 175 L 140 180 L 136 240 L 105 230 Z"
                  fill={`url(#${idPrefix}_armor_sec)`}
                  stroke="#78350f"
                  strokeWidth="2.5"
                />
                <line x1="109" y1="195" x2="138" y2="200" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="107" y1="215" x2="137" y2="220" stroke="#f59e0b" strokeWidth="2.5" />

                {/* Right Shoulder Guard (Sode) */}
                <path
                  d="M 288 175 L 260 180 L 264 240 L 295 230 Z"
                  fill={`url(#${idPrefix}_armor_sec)`}
                  stroke="#78350f"
                  strokeWidth="2.5"
                />
                <line x1="262" y1="200" x2="291" y2="195" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="263" y1="220" x2="293" y2="215" stroke="#f59e0b" strokeWidth="2.5" />

                {/* Clan Crest Medallion in Center */}
                <circle cx="200" cy="210" r="10" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
              </g>
            )}

            {armorStyle === 'ANBU Spec-Ops' && (
              <g id="armor-anbu">
                {/* Sleek Grey Vest */}
                <path
                  d="M 148 175 Q 142 225 146 280 L 254 280 Q 258 225 252 175 Z"
                  fill="#94a3b8"
                  stroke="#334155"
                  strokeWidth="2.5"
                />
                {/* Cross-body Leather Straps */}
                <line x1="150" y1="175" x2="252" y2="278" stroke="#334155" strokeWidth="6" />
                <line x1="150" y1="175" x2="252" y2="278" stroke="#1e293b" strokeWidth="3" />
                {/* Center Harness Metal Buckle */}
                <circle cx="201" cy="226" r="6" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
                {/* ANBU Porcelain Fox Mask clipped on left hip */}
                <ellipse cx="140" cy="270" rx="14" ry="18" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                <polygon points="130,254 135,242 142,254" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <polygon points="140,254 148,242 153,254" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M 132 266 Q 135 272 138 266" stroke="#dc2626" strokeWidth="2" fill="none" />
                <path d="M 142 266 Q 145 272 148 266" stroke="#dc2626" strokeWidth="2" fill="none" />
              </g>
            )}

            {armorStyle === 'Ronin Wanderer Cloak' && (
              <g id="armor-ronin">
                {/* Flowing Kimono wrap with sash */}
                <path
                  d="M 140 170 L 180 270 L 260 270 L 260 170 Z"
                  fill={clothColor}
                  stroke="#09090b"
                  strokeWidth="2.5"
                />
                <path
                  d="M 260 170 L 195 270 L 140 270 Z"
                  fill="#27272a"
                  stroke="#09090b"
                  strokeWidth="2.5"
                />
                {/* Thick Cloth Obi Sash */}
                <rect x="142" y="260" width="116" height="20" fill={accentColor} stroke="#78350f" strokeWidth="2" />
                {/* Tied Knot */}
                <ellipse cx="185" cy="270" rx="8" ry="6" fill={accentColor} stroke="#78350f" strokeWidth="1.5" />
              </g>
            )}

            {/* Sasuke Shimenawa Rope Sash if selected in capeStyle */}
            {capeStyle === 'Sasuke Shimenawa Rope' && (
              <g id="shimenawa-rope">
                {/* Giant Twisted Purple Rope Belt */}
                <path
                  d="M 138 275 Q 200 295 262 275"
                  stroke="#8b5cf6"
                  strokeWidth="12"
                  fill="none"
                />
                <path
                  d="M 138 275 Q 200 295 262 275"
                  stroke="#6d28d9"
                  strokeWidth="4"
                  strokeDasharray="8 6"
                  fill="none"
                />
                {/* Oversized Bow knot */}
                <circle cx="200" cy="285" r="10" fill="#8b5cf6" stroke="#4c1d95" strokeWidth="3" />
                <path d="M 195 292 Q 185 330 175 350" stroke="#8b5cf6" strokeWidth="6" fill="none" />
                <path d="M 205 292 Q 215 330 225 350" stroke="#8b5cf6" strokeWidth="6" fill="none" />
              </g>
            )}

            {/* High Popped Leather Duster Collar Flaps (Noctis / Dark Knight) */}
            {(hairstyle === 'Noctis Caelum' || armorStyle === 'Dark Knight Plate') && (
              <g id="popped-leather-duster-collar">
                {/* Left Flap framing left jaw and neck */}
                <path
                  d="M 166 148 Q 146 156 138 175 Q 155 178 168 172 L 174 152 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <path d="M 142 173 Q 152 158 168 152" stroke="#475569" strokeWidth="1.8" fill="none" />
                {/* Right Flap framing right jaw and neck */}
                <path
                  d="M 234 148 Q 254 156 262 175 Q 245 178 232 172 L 226 152 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <path d="M 258 173 Q 248 158 232 152" stroke="#475569" strokeWidth="1.8" fill="none" />
              </g>
            )}
          </g>

          {/* ============================================================ */}
          {/* LAYER 4: Arms, Hands & Combat Weapons */}
          {/* ============================================================ */}
          <g id="arms-and-weapons">
            {/* Left Arm (Rear Arm / Off-hand) */}
            <g id="left-arm">
              {leftArmPose === 'handsigns' ? (
                // Left arm clasping center for hand seal
                <path
                  d="M 142 185 Q 155 220 185 222 L 180 238 Q 140 235 130 195 Z"
                  fill={`url(#${idPrefix}_skin)`}
                  stroke="#7c2d12"
                  strokeWidth="2"
                />
              ) : leftArmPose === 'attack' ? (
                // Left arm balanced backward in sprint/attack
                <path
                  d="M 142 185 Q 110 215 95 245 L 108 252 Q 125 225 152 195 Z"
                  fill={`url(#${idPrefix}_skin)`}
                  stroke="#7c2d12"
                  strokeWidth="2"
                />
              ) : (
                // Left arm standard ready stance
                <path
                  d="M 142 185 Q 120 225 125 265 L 142 265 Q 140 230 156 195 Z"
                  fill={`url(#${idPrefix}_skin)`}
                  stroke="#7c2d12"
                  strokeWidth="2"
                />
              )}
              {/* Forearm Guard / Hitai-ate wrap */}
              <rect x="124" y="230" width="16" height="24" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
              {/* Left Hand: Fingerless glove, knuckles & fingers (Base model hand) */}
              <ellipse cx="133" cy="272" rx="9" ry="8" fill="#18181b" stroke="#09090b" strokeWidth="2" />
              {/* Four distinct knuckle accents */}
              <circle cx="128" cy="273" r="1.2" fill="#64748b" />
              <circle cx="132" cy="274" r="1.2" fill="#64748b" />
              <circle cx="136" cy="274" r="1.2" fill="#64748b" />
              <circle cx="139" cy="272" r="1.2" fill="#64748b" />
              {/* Thumb pad */}
              <path d="M 140 268 Q 143 272 140 276" stroke={skinTone} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Curled fingertips below glove */}
              <path d="M 127 278 Q 133 282 139 278" stroke={skinTone} strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>

            {/* Katana Slung on Back (when weaponStyle is Katana Blade) */}
            {weaponStyle === 'Katana Blade' && (
              <g id="katana-sheath">
                {/* Sheath running diagonally across back */}
                <line x1="115" y1="280" x2="275" y2="120" stroke="#09090b" strokeWidth="9" strokeLinecap="round" />
                <line x1="115" y1="280" x2="275" y2="120" stroke="#b91c1c" strokeWidth="4" />
                {/* Tsuka (Hilt) */}
                <line x1="275" y1="120" x2="310" y2="85" stroke="#ffffff" strokeWidth="7" strokeLinecap="square" />
                {/* Diamond Tsuka-ito wrap */}
                <line x1="278" y1="117" x2="308" y2="87" stroke="#0f172a" strokeWidth="3" strokeDasharray="4 4" />
                {/* Gold Tsuba (Guard) */}
                <ellipse cx="275" cy="120" rx="9" ry="5" transform="rotate(-45 275 120)" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
              </g>
            )}

            {/* Right Arm (Forward Action Arm) */}
            <g id="right-arm">
              {rightArmPose === 'handsigns' ? (
                // Right hand clasping into Tiger / Ram hand seal
                <g id="handsign-pose">
                  <path
                    d="M 258 185 Q 240 220 215 222 L 220 238 Q 255 235 270 195 Z"
                    fill={`url(#${idPrefix}_skin)`}
                    stroke="#7c2d12"
                    strokeWidth="2"
                  />
                  {/* Both hands clasped in front of chest */}
                  <ellipse cx="200" cy="226" rx="14" ry="12" fill={`url(#${idPrefix}_skin)`} stroke="#7c2d12" strokeWidth="2" />
                  {/* Upright pointing index & middle fingers (Tiger seal) */}
                  <path d="M 197 220 L 197 196 Q 200 192 203 196 L 203 220 Z" fill={`url(#${idPrefix}_skin)`} stroke="#7c2d12" strokeWidth="1.5" />
                  {/* Chakra Spark Ring around Mudra */}
                  <circle cx="200" cy="210" r="18" fill="none" stroke={chakraAuraColor} strokeWidth="2" strokeDasharray="6 4" className="animate-spin origin-center" />
                </g>
              ) : rightArmPose === 'attack' ? (
                // Thrusting forward / drawing weapon
                <g id="attack-pose">
                  <path
                    d="M 258 185 Q 285 210 320 220 L 315 235 Q 275 225 250 195 Z"
                    fill={`url(#${idPrefix}_skin)`}
                    stroke="#7c2d12"
                    strokeWidth="2"
                  />
                  {/* Forward Fist */}
                  <circle cx="324" cy="225" r="10" fill={`url(#${idPrefix}_skin)`} stroke="#7c2d12" strokeWidth="2" />
                  {/* Kunai held in forward fist */}
                  <polygon points="330,225 375,225 365,220 330,222" fill={`url(#${idPrefix}_steel)`} stroke="#334155" strokeWidth="1.5" />
                </g>
              ) : rightArmPose === 'cast' ? (
                // Raised glowing jutsu palm
                <g id="cast-pose">
                  <path
                    d="M 258 185 Q 285 195 305 170 L 318 180 Q 290 215 250 195 Z"
                    fill={`url(#${idPrefix}_skin)`}
                    stroke="#7c2d12"
                    strokeWidth="2"
                  />
                  <circle cx="312" cy="168" r="12" fill={`url(#${idPrefix}_skin)`} stroke="#7c2d12" strokeWidth="2" />
                  {/* Glowing Rasengan Sphere in hand */}
                  <circle cx="312" cy="155" r="22" fill={chakraAuraColor} opacity="0.8" filter={`url(#${idPrefix}_glow)`} />
                  <circle cx="312" cy="155" r="12" fill="#ffffff" opacity="0.9" />
                  {/* Swirling energy arcs */}
                  <ellipse cx="312" cy="155" rx="20" ry="7" transform="rotate(30 312 155)" fill="none" stroke="#ffffff" strokeWidth="2" />
                  <ellipse cx="312" cy="155" rx="20" ry="7" transform="rotate(-45 312 155)" fill="none" stroke="#ffffff" strokeWidth="2" />
                </g>
              ) : null}
            </g>
          </g>

          {/* ============================================================ */}
          {/* LAYER 5: Defined Neck & Sculpted Anime Head Anatomy */}
          {/* ============================================================ */}
          <g id="head-and-face">
            {/* Athletic Proportional Neck Cylinder (Tailored for 3/4 South-East perspective) */}
            <path
              d="M 186 132 L 185 170 Q 200 176 215 170 L 214 132 Z"
              fill={`url(#${idPrefix}_skin_shadow)`}
              stroke="#7c2d12"
              strokeWidth="2"
            />
            {/* Soft Submental Shadow under Chin (separates jawline cleanly from neck) */}
            <path
              d="M 186 132 Q 200 142 214 132 L 214 144 Q 200 152 186 144 Z"
              fill="#7c2d12"
              opacity="0.35"
            />
            {/* Subtle Suprasternal Notch */}
            <path d="M 197 169 Q 200 172 203 169" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
            {/* Clean Clavicle / Collarbone Accents */}
            <path d="M 166 176 Q 182 173 196 171" stroke="#f8fafc" strokeWidth="1.8" fill="none" opacity="0.5" />
            <path d="M 166 177 Q 182 174 196 172" stroke="#9a5a40" strokeWidth="1.5" fill="none" opacity="0.5" />
            <path d="M 204 171 Q 218 173 234 176" stroke="#f8fafc" strokeWidth="1.8" fill="none" opacity="0.5" />
            <path d="M 204 172 Q 218 174 234 177" stroke="#9a5a40" strokeWidth="1.5" fill="none" opacity="0.5" />

            {/* Sculpted 3/4 Anime Head & Jaw Contour (Natural organic curvature - ZERO boxy chin!) */}
            <path
              d="M 162 85 Q 156 112 166 130 Q 174 142 192 150 Q 200 152 206 150 Q 222 144 234 130 Q 244 112 238 85 Z"
              fill={`url(#${idPrefix}_skin)`}
              stroke="#7c2d12"
              strokeWidth="2.5"
            />
            {/* Defined Jawline Shading Accents */}
            <path d="M 166 130 Q 176 142 192 150" stroke="#7c2d12" strokeWidth="2" fill="none" opacity="0.4" />
            <path d="M 234 130 Q 222 144 206 150" stroke="#7c2d12" strokeWidth="2" fill="none" opacity="0.4" />
            {/* Submental Chin Shadow */}
            <ellipse cx="200" cy="153.5" rx="9" ry="2.2" fill="#7c2d12" opacity="0.35" />

            {/* Right Ear */}
            <path
              d="M 240 100 Q 252 105 248 120 Q 242 130 236 128 Z"
              fill={`url(#${idPrefix}_skin)`}
              stroke="#7c2d12"
              strokeWidth="2"
            />
            {/* Ear Inner Helix */}
            <path d="M 242 106 Q 246 112 243 122" stroke="#9a5a40" strokeWidth="1.5" fill="none" />

            {/* Uzumaki Whisker Marks (if clan is Uzumaki) */}
            {character.clan === 'Uzumaki' && (
              <g id="whisker-marks" opacity="0.75">
                <line x1="168" y1="130" x2="182" y2="133" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="166" y1="135" x2="182" y2="137" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="168" y1="140" x2="182" y2="141" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />

                <line x1="218" y1="130" x2="232" y2="128" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="218" y1="135" x2="234" y2="134" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="218" y1="140" x2="232" y2="139" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            )}

            {/* Clean Expressive Anime Mouth & Lips */}
            {isAttacking || isCasting ? (
              <g id="combat-mouth-shout">
                <path d="M 194 138 Q 200 136 206 138 Q 205 146 200 147 Q 195 146 194 138 Z" fill="#701a24" stroke="#7c2d12" strokeWidth="1.5" />
                <path d="M 196 138 Q 200 137 204 138 L 203 140 Q 200 140 197 140 Z" fill="#ffffff" />
                <path d="M 196 147 Q 200 148.5 204 147" stroke="#9a5a40" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              </g>
            ) : isVictory ? (
              <g id="smirking-mouth">
                <path d="M 194 141 Q 200 142 206 139.5" stroke="#7c2d12" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                <circle cx="206.5" cy="139.5" r="1.2" fill="#7c2d12" />
                <path d="M 196 143.5 Q 200 145.5 205 143.5" stroke="#9a5a40" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              </g>
            ) : isHurt ? (
              <g id="grimace-mouth">
                <rect x="194" y="140" width="12" height="3.5" rx="1" fill="#ffffff" stroke="#7c2d12" strokeWidth="1.2" />
                <line x1="197" y1="140" x2="197" y2="143.5" stroke="#94a3b8" strokeWidth="0.8" />
                <line x1="200" y1="140" x2="200" y2="143.5" stroke="#94a3b8" strokeWidth="0.8" />
                <line x1="203" y1="140" x2="203" y2="143.5" stroke="#94a3b8" strokeWidth="0.8" />
                <path d="M 195 145 Q 200 146 205 145" stroke="#9a5a40" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g id="natural-heroic-mouth">
                {/* Crisp anime mouth line */}
                <path
                  d="M 194 141 Q 200 142.2 206 141"
                  stroke="#7c2d12"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Soft lower lip accent */}
                <path
                  d="M 196 143.5 Q 200 145.2 204 143.5"
                  stroke="#9a5a40"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )}

            {/* Anime Nose */}
            <polygon points="196,126 199,132 195,133" fill="#9a5a40" />
            <line x1="197" y1="124" x2="199" y2="132" stroke="#7c2d12" strokeWidth="1.5" strokeLinecap="round" />

            {/* ============================================================ */}
            {/* Expressive Anime Eyes & Dojutsu */}
            {/* ============================================================ */}
            {/* ============================================================ */}
            {/* Expressive Anime Eyes & Dojutsu (Mathematically Symmetrical) */}
            {/* ============================================================ */}
            {/* LEFT EYE */}
            <g id="left-anime-eye">
              {/* White Sclera */}
              <path
                d="M 169 110 Q 182 102 195 110 Q 187 118 172 116 Z"
                fill="#ffffff"
                stroke="#475569"
                strokeWidth="1"
              />
              {/* Left Iris (Identical 7.5x8.0 size) */}
              <ellipse
                cx="182"
                cy="111"
                rx="7.5"
                ry="8.0"
                fill={
                  dojutsu.includes('Sharingan')
                    ? '#dc2626'
                    : dojutsu.includes('Byakugan')
                    ? '#ede9fe'
                    : dojutsu === 'Sage Eyes (Toad)'
                    ? '#eab308'
                    : `url(#${idPrefix}_eye)`
                }
              />

              {/* Special Dojutsu Patterns (Left Eye) */}
              {dojutsu.includes('Sharingan') ? (
                <g id="left-sharingan-pupil">
                  <circle cx="182" cy="111" r="5.2" fill="none" stroke="#090d16" strokeWidth="1.5" />
                  <circle cx="182" cy="111" r="2.5" fill="#090d16" />
                  <circle cx="179" cy="107" r="1.5" fill="#090d16" />
                  {(dojutsu.includes('2-Tomoe') || dojutsu.includes('3-Tomoe')) && (
                    <circle cx="186" cy="108" r="1.5" fill="#090d16" />
                  )}
                  {dojutsu.includes('3-Tomoe') && (
                    <circle cx="182" cy="115" r="1.5" fill="#090d16" />
                  )}
                </g>
              ) : dojutsu.includes('Byakugan') ? (
                <g id="left-byakugan-pupil">
                  <circle cx="182" cy="111" r="6.5" fill="none" stroke="#c4b5fd" strokeWidth="1.8" />
                  <circle cx="182" cy="111" r="2.8" fill="#ffffff" />
                  {dojutsu === 'Byakugan (Active Veined)' && (
                    <g opacity="0.7">
                      <path d="M 168 108 Q 161 105 156 112" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                      <path d="M 167 114 Q 159 118 155 115" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                    </g>
                  )}
                </g>
              ) : dojutsu === 'Sage Eyes (Toad)' ? (
                <g id="left-toad-sage-pupil">
                  <rect x="176" y="110" width="12" height="3" rx="1.5" fill="#18181b" />
                  <path d="M 168 108 Q 182 100 196 108" stroke="#f97316" strokeWidth="3" fill="none" opacity="0.6" />
                </g>
              ) : (
                <ellipse cx="182" cy="111" rx="3.2" ry="3.5" fill="#090d16" />
              )}

              {/* Eye Catch Specular Reflection (White glints) */}
              <circle cx="179" cy="107" r="2.2" fill="#ffffff" />
              <circle cx="185" cy="114" r="1.2" fill="#ffffff" />

              {/* Tapered Dark Eyelash Lash Line */}
              <path
                d="M 168 110 Q 182 101 196 109"
                stroke="#090d16"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Lower Lash Accent */}
              <path d="M 174 117 Q 182 119 190 117" stroke="#090d16" strokeWidth="1.3" fill="none" />
              {/* Double Eyelid Crease */}
              <path d="M 172 103 Q 182 99 192 103" stroke="#7c2d12" strokeWidth="1.3" fill="none" opacity="0.6" />
              {/* Left Eyebrow */}
              <path
                d="M 169 97 Q 182 93 195 98"
                stroke={hairColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* RIGHT EYE */}
            <g id="right-anime-eye">
              {/* White Sclera */}
              <path
                d="M 205 110 Q 218 102 231 110 Q 223 118 208 116 Z"
                fill="#ffffff"
                stroke="#475569"
                strokeWidth="1"
              />

              {/* Right Iris (Identical 7.5x8.0 size) */}
              <ellipse
                cx="218"
                cy="111"
                rx="7.5"
                ry="8.0"
                fill={
                  dojutsu.includes('Sharingan')
                    ? '#dc2626'
                    : dojutsu.includes('Byakugan')
                    ? '#ede9fe'
                    : dojutsu === 'Sage Eyes (Toad)'
                    ? '#eab308'
                    : `url(#${idPrefix}_eye)`
                }
              />

              {/* Special Dojutsu Patterns (Right Eye) */}
              {dojutsu.includes('Sharingan') ? (
                <g id="right-sharingan-pupil">
                  <circle cx="218" cy="111" r="5.2" fill="none" stroke="#090d16" strokeWidth="1.5" />
                  <circle cx="218" cy="111" r="2.5" fill="#090d16" />
                  <circle cx="215" cy="107" r="1.5" fill="#090d16" />
                  {(dojutsu.includes('2-Tomoe') || dojutsu.includes('3-Tomoe')) && (
                    <circle cx="222" cy="108" r="1.5" fill="#090d16" />
                  )}
                  {dojutsu.includes('3-Tomoe') && (
                    <circle cx="218" cy="115" r="1.5" fill="#090d16" />
                  )}
                </g>
              ) : dojutsu.includes('Byakugan') ? (
                <g id="right-byakugan-pupil">
                  <circle cx="218" cy="111" r="6.5" fill="none" stroke="#c4b5fd" strokeWidth="1.8" />
                  <circle cx="218" cy="111" r="2.8" fill="#ffffff" />
                  {dojutsu === 'Byakugan (Active Veined)' && (
                    <g opacity="0.7">
                      <path d="M 233 108 Q 240 105 245 112" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                      <path d="M 234 114 Q 242 118 246 115" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                    </g>
                  )}
                </g>
              ) : dojutsu === 'Sage Eyes (Toad)' ? (
                <g id="right-toad-sage-pupil">
                  <rect x="212" y="110" width="12" height="3" rx="1.5" fill="#18181b" />
                  <path d="M 204 108 Q 218 100 232 108" stroke="#f97316" strokeWidth="3" fill="none" opacity="0.6" />
                </g>
              ) : (
                <ellipse cx="218" cy="111" rx="3.2" ry="3.5" fill="#090d16" />
              )}

              {/* Vivid Specular Eye Catches (Life glints) */}
              <circle cx="215" cy="107" r="2.2" fill="#ffffff" />
              <circle cx="221" cy="114" r="1.2" fill="#ffffff" />

              {/* Tapered Dark Upper Lash Line */}
              <path
                d="M 204 110 Q 218 101 232 109"
                stroke="#090d16"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Lower Lash Accent */}
              <path d="M 210 117 Q 218 119 226 117" stroke="#090d16" strokeWidth="1.3" fill="none" />
              {/* Double Eyelid Crease */}
              <path d="M 208 103 Q 218 99 228 103" stroke="#7c2d12" strokeWidth="1.3" fill="none" opacity="0.6" />
              {/* Right Eyebrow */}
              <path
                d="M 205 97 Q 218 93 231 98"
                stroke={hairColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Kakashi Style Face Mask (if rogue or selected) */}
            {character.title?.includes('Shadow') && (
              <path
                d="M 166 125 Q 185 132 205 132 Q 225 132 238 125 L 235 155 Q 205 166 172 155 Z"
                fill="#18181b"
                stroke="#09090b"
                strokeWidth="2"
              />
            )}
          </g>

          {/* ============================================================ */}
          {/* LAYER 6: Headband (Hitai-ate) */}
          {/* ============================================================ */}
          {headbandPos === 'Forehead' && (
            <g id="forehead-protector" filter={`url(#${idPrefix}_soft_shadow)`}>
              {/* Cloth Band Wrapping Head */}
              <path
                d="M 152 75 Q 195 62 244 75 L 244 94 Q 195 82 152 94 Z"
                fill={headbandCloth}
                stroke="#090d16"
                strokeWidth="2"
              />
              {/* Curved Metal Protector Plate */}
              <path
                d="M 172 73 Q 198 68 226 73 L 225 90 Q 198 85 173 90 Z"
                fill={`url(#${idPrefix}_metal)`}
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Specular Glint Bar across plate */}
              <path
                d="M 174 76 Q 198 71 224 76 L 224 80 Q 198 75 174 80 Z"
                fill="#ffffff"
                opacity="0.7"
              />
              {/* Corner Rivet Screws */}
              <circle cx="176" cy="78" r="1.5" fill="#1e293b" />
              <circle cx="177" cy="85" r="1.5" fill="#1e293b" />
              <circle cx="221" cy="78" r="1.5" fill="#1e293b" />
              <circle cx="222" cy="85" r="1.5" fill="#1e293b" />

              {/* Village Symbol Engraved in Center */}
              <g id="village-crest" stroke="#1e293b" strokeWidth="1.5" fill="none">
                {character.clan === 'Senju' || character.clan === 'Uzumaki' ? (
                  // Hidden Leaf Swirl Emblem with triangle tip
                  <path d="M 197 78 A 3 3 0 1 1 201 82 A 2 2 0 1 1 199 80 M 194 84 L 198 81" />
                ) : (
                  // General Shinobi Shield Swirl
                  <path d="M 197 79 A 3.5 3.5 0 1 1 202 83" />
                )}
              </g>
            </g>
          )}

          {/* ============================================================ */}
          {/* LAYER 7: Front Hair Volumetric Locks & Specular Halo */}
          {/* ============================================================ */}
          <g id="front-hair" filter={`url(#${idPrefix}_soft_shadow)`}>
            {hairstyle === 'Naruto Spike' && (
              <g id="hair-naruto-spike">
                {/* Spiky crown cluster dome with bold anime clumping */}
                <path
                  d="M 148 78 Q 128 50 142 26 Q 154 44 160 55 Q 165 28 180 12 Q 190 34 192 48 Q 205 18 220 15 Q 222 38 226 54 Q 240 28 258 32 Q 252 56 246 74 Q 264 54 274 70 Q 260 88 248 95 L 240 85 Q 195 72 152 82 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Faceted Light Crests (Lit top facets) */}
                <path
                  d="M 170 22 L 180 12 L 186 26 M 212 22 L 220 15 L 224 30 M 248 36 L 258 32 L 254 46"
                  stroke="#fef08a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.95"
                />
                <circle cx="180" cy="12" r="1.5" fill="#ffffff" />
                <circle cx="220" cy="15" r="1.5" fill="#ffffff" />

                {/* Jagged Forehead Bangs (Draping boldly over the Hitai-ate headband plate - images (1).jpg) */}
                <path
                  d="M 170 74 Q 168 90 174 100 Q 178 88 182 74 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path d="M 171 78 Q 170 92 174 96" stroke="#fef08a" strokeWidth="1.5" fill="none" />
                <path
                  d="M 186 72 Q 192 92 196 102 Q 200 90 204 72 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path d="M 189 76 Q 193 92 196 98" stroke="#fef08a" strokeWidth="1.5" fill="none" />
                <path
                  d="M 206 72 Q 212 92 216 102 Q 220 90 224 72 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path d="M 209 76 Q 213 92 216 98" stroke="#fef08a" strokeWidth="1.5" fill="none" />
                <path
                  d="M 226 74 Q 232 88 238 98 Q 239 86 240 74 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path d="M 229 78 Q 233 88 237 94" stroke="#fef08a" strokeWidth="1.5" fill="none" />

                {/* Stepped Temple Sideburns */}
                <path
                  d="M 152 80 Q 148 105 156 126 Q 162 108 160 85 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path
                  d="M 242 80 Q 248 105 240 128 Q 236 108 238 85 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
              </g>
            )}

            {hairstyle === 'Sasuke Rogue Fringe' && (
              <g id="hair-sasuke-fringe">
                {/* Spiky rear ducktail crown */}
                <path
                  d="M 152 75 Q 138 38 152 20 Q 168 48 178 36 Q 188 16 210 18 Q 226 42 236 28 Q 252 42 246 75 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                <circle cx="210" cy="18" r="1.5" fill="#ffffff" />
                <path d="M 200 24 Q 210 18 220 28" stroke="#38bdf8" strokeWidth="1.8" fill="none" />

                {/* Center Parted M Bangs origin */}
                <path
                  d="M 188 68 Q 195 82 200 85 Q 205 82 212 68 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="1.5"
                />

                {/* Center V-Bang drooping down between eyes (images (1).jpg) */}
                <path
                  d="M 194 70 Q 198 94 200 106 Q 202 94 206 70 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path d="M 197 75 Q 199 92 200 102" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9" />

                {/* Iconic Asymmetric Parted Curtain Bangs (Left Heavy) */}
                <path
                  d="M 175 68 Q 165 105 158 144 Q 170 125 178 95 Q 192 115 190 135 Q 196 115 192 85 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.2"
                />
                {/* Right Framing Bang */}
                <path
                  d="M 215 68 Q 230 100 242 140 Q 234 110 226 85 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.2"
                />
                {/* Blue Specular Sheen Catchlights along curtain bangs */}
                <path
                  d="M 164 100 Q 160 122 159 138"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.9"
                />
                <path
                  d="M 233 100 Q 237 122 240 135"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.9"
                />
              </g>
            )}

            {hairstyle === 'Kakashi Tilt' && (
              <g id="hair-kakashi-tilt">
                {/* Sweeping gravity-defying silver mane tilted left */}
                <path
                  d="M 148 78 Q 115 50 110 25 Q 130 35 145 45 Q 135 15 158 5 Q 170 25 180 40 Q 185 10 215 8 Q 220 30 228 45 Q 245 25 258 40 Q 252 65 245 80 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Forehead framing bangs */}
                <path
                  d="M 155 78 Q 148 105 156 120 Q 160 100 168 82 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
              </g>
            )}

            {hairstyle === 'Minato Winged Flare' && (
              <g id="hair-minato-winged">
                {/* Spiky crown */}
                <path
                  d="M 150 78 Q 135 45 150 20 Q 165 40 180 25 Q 195 12 210 25 Q 225 35 240 20 Q 245 50 245 78 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Long framing jawline wings (Minato signature) */}
                <path
                  d="M 152 75 Q 140 115 148 145 Q 155 125 160 90 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path
                  d="M 240 75 Q 252 115 245 145 Q 238 125 235 90 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
              </g>
            )}

            {hairstyle === 'Madara Wild Cascade' && (
              <g id="hair-madara-cascade">
                {/* Massive wild spiky mane */}
                <path
                  d="M 130 85 Q 115 50 135 15 Q 155 35 165 5 Q 185 20 200 -2 Q 220 18 235 5 Q 250 35 265 15 Q 260 65 272 85 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Spiky waterfall locks flanking both shoulders */}
                <path
                  d="M 135 85 Q 105 130 115 170 Q 130 150 142 120 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path
                  d="M 265 85 Q 295 130 285 170 Q 270 150 258 120 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                {/* Framing bangs */}
                <path
                  d="M 160 75 Q 165 110 172 125 Q 175 105 175 75 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="1.5"
                />
                <path
                  d="M 225 75 Q 228 110 235 125 Q 240 105 240 75 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {hairstyle === 'Somnus Caelum' && (
              <g id="hair-somnus-caelum">
                {/* Heavy textured wild dreadlocks crown */}
                <path
                  d="M 145 78 Q 130 45 150 20 Q 170 38 185 15 Q 200 8 215 15 Q 230 38 250 20 Q 260 50 255 78 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Heavy braided dreadlock cords over shoulders */}
                <path
                  d="M 148 78 Q 135 120 140 165 Q 148 140 155 90 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path
                  d="M 252 78 Q 265 120 260 165 Q 252 140 245 90 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                {/* Lucian Royal Silver Coronet Band */}
                <path
                  d="M 162 76 Q 200 68 238 76 L 237 84 Q 200 76 163 84 Z"
                  fill={`url(#${idPrefix}_metal)`}
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {/* Central Royal Star Emblem */}
                <circle cx="200" cy="74" r="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                <circle cx="200" cy="74" r="1.5" fill="#38bdf8" />
              </g>
            )}

            {hairstyle === 'Noctis Caelum' && (
              <g id="hair-noctis-caelum">
                {/* 1. Volumetric Crown Base & Backward Spikes */}
                <path
                  d="M 148 78 Q 128 42 142 18 Q 158 38 168 50 Q 175 22 192 12 Q 202 30 210 44 Q 222 22 234 16 Q 240 34 246 54 Q 256 36 260 26 Q 260 52 250 78 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#040609"
                  strokeWidth="2.5"
                />

                {/* 2. Angel-Ring Halo & Specular High-Contrast Blue Catchlights */}
                <path
                  d="M 166 44 Q 198 28 236 40"
                  stroke="#3b82f6"
                  strokeWidth="3.2"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <path
                  d="M 184 34 Q 200 30 216 34"
                  stroke="#93c5fd"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="196" cy="33" r="2.2" fill="#ffffff" />
                <circle cx="205" cy="33" r="1.8" fill="#ffffff" />

                {/* 3. High-Left Backward Crest Specular Highlights */}
                <path d="M 144 26 Q 154 38 164 48" stroke="#3b82f6" strokeWidth="1.8" fill="none" opacity="0.85" />
                <path d="M 190 20 Q 196 32 202 42" stroke="#3b82f6" strokeWidth="1.8" fill="none" opacity="0.85" />
                <path d="M 232 24 Q 236 34 240 46" stroke="#3b82f6" strokeWidth="1.8" fill="none" opacity="0.85" />

                {/* 4. Left Framing Lock (meeting popped collar flap) */}
                <path
                  d="M 152 76 Q 144 112 152 142 Q 162 118 166 82 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#040609"
                  strokeWidth="2"
                />
                <path d="M 151 82 Q 147 114 153 136" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.8" />

                {/* 5. Forehead Secondary Wisps */}
                <path
                  d="M 162 74 Q 168 96 174 104 Q 177 88 178 74 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#040609"
                  strokeWidth="1.8"
                />
                <path
                  d="M 206 75 Q 214 96 220 104 Q 225 88 227 75 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#040609"
                  strokeWidth="1.8"
                />

                {/* 6. Signature Noctis Sweeping Brow Fringe (Falling between eyes) */}
                <path
                  d="M 174 74 Q 188 110 196 132 Q 203 110 201 75 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#040609"
                  strokeWidth="2.2"
                />
                <path
                  d="M 179 80 Q 190 108 195 126"
                  stroke="#3b82f6"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <circle cx="195" cy="122" r="1.2" fill="#93c5fd" />

                {/* 7. Near Right Cheek-Framing Lock */}
                <path
                  d="M 235 76 Q 244 110 238 136 Q 232 110 230 76 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#040609"
                  strokeWidth="2"
                />
                <path d="M 234 82 Q 240 108 236 128" stroke="#3b82f6" strokeWidth="1.4" fill="none" opacity="0.75" />
              </g>
            )}

            {/* Fallback / Other Hairstyles (Tousled / Modern Fringe) */}
            {(hairstyle === 'Squall Modern Fringe' ||
              hairstyle === 'Cloud Chocobo Spikes' ||
              hairstyle === 'Knight Pointed Helm' ||
              hairstyle === 'Itachi Low Ribbon' ||
              hairstyle === 'Sephiroth Parted Flow') && (
              <g id="hair-general-anime">
                <path
                  d="M 150 75 Q 140 35 165 20 Q 185 35 200 18 Q 220 32 238 22 Q 245 45 245 75 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Feathered Center Fringe */}
                <path
                  d="M 175 72 Q 185 105 188 120 Q 195 102 198 72 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
                <path
                  d="M 205 72 Q 215 102 218 118 Q 222 98 226 72 Z"
                  fill={`url(#${idPrefix}_hair)`}
                  stroke="#18181b"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Specular Anime Halo Sheen ("Angel Ring") across hair crown */}
            <path
              d="M 160 52 Q 200 42 235 52 Q 200 48 160 52 Z"
              fill={`url(#${idPrefix}_hair_sheen)`}
              opacity="0.85"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
