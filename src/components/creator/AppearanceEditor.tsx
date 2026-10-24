import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Lock, Paintbrush, PersonStanding, ScanFace, Shield, Shirt, Sword } from 'lucide-react';
import { fitsBody, itemsForSlot, getItem } from '../../sprite/catalog';
import { resolveParts, type ItemDef } from '../../sprite/ctx';
import { CHAKRA_CHOICES, TINT_CHOICES, chakraChoice, chakraHex } from '../../sprite/chakraInfo';
import { CHAKRA_TYPES, chakraNature, chakraType, withNature } from '../../sprite/chakraNature';
import { CAST_STYLE_INFO, defaultCastStyle } from '../../sprite/castInfo';
import { CAST_STYLES, isFemaleBody } from '../../sprite/types';
import { CLOTH_COLORS, CLOTH_FAMILIES, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from '../../sprite/palettes';
import type {
  ArmType,
  BodyType,
  EyeShape,
  EyeSpecial,
  FaceShape,
  HandSize,
  HeadbandPosition,
  ItemChoice,
  SlotId,
  SpriteAppearance,
  SpritePose,
} from '../../sprite/types';
import type { ShinobiCharacter } from '../../types/shinobi';
import { soundManager } from '../../utils/audio';
import { PixelEditor } from './PixelEditor';
import { L } from './words';
import { useLang } from '../../i18n';
import { SpriteThumb } from './SpriteThumb';
import { BurstThumb } from './BurstThumb';
import { PartThumb } from './PartThumb';
import { serif } from './stage';

/**
 * The editor's sections, grouped as Baldur's Gate 3 groups its appearance: everything of the head in
 * one place (face shape, eyes, hair, marks and masks, headband), the body apart, then clothes, gear,
 * weapon, chakra and pixel paint. A section with several parts shows them as tabs.
 */
export type AppearanceGroup = 'body' | 'head' | 'clothes' | 'gear' | 'weapon' | 'chakra' | 'paint';

type Part =
  | 'build'
  | 'shape'
  | 'eyes'
  | 'hair'
  | 'marks'
  | 'headband'
  | 'top'
  | 'bottom'
  | 'skirt'
  | 'waist'
  | 'cape'
  | 'armor'
  | 'hands'
  | 'feet'
  | 'gear'
  | 'held'
  | 'chakra'
  | 'paint';

const GROUPS: { id: AppearanceGroup; label: string; icon: React.ReactNode; parts: { id: Part; label: string }[] }[] = [
  { id: 'body', label: 'Body', icon: <PersonStanding className="w-5 h-5" />, parts: [{ id: 'build', label: 'Build' }] },
  {
    id: 'head',
    label: 'Head',
    icon: <ScanFace className="w-5 h-5" />,
    parts: [
      { id: 'shape', label: 'Face Shape' },
      { id: 'eyes', label: 'Eyes' },
      { id: 'hair', label: 'Hair' },
      { id: 'marks', label: 'Marks & Masks' },
      { id: 'headband', label: 'Headband' },
    ],
  },
  {
    id: 'clothes',
    label: 'Clothes',
    icon: <Shirt className="w-5 h-5" />,
    parts: [
      { id: 'top', label: 'Tops' },
      { id: 'bottom', label: 'Pants' },
      { id: 'skirt', label: 'Skirts' },
      { id: 'waist', label: 'Belts & Sashes' },
      { id: 'cape', label: 'Capes' },
    ],
  },
  {
    id: 'gear',
    label: 'Gear',
    icon: <Shield className="w-5 h-5" />,
    parts: [
      { id: 'armor', label: 'Armor' },
      { id: 'hands', label: 'Gloves' },
      { id: 'feet', label: 'Boots' },
      { id: 'gear', label: 'Accessories' },
    ],
  },
  { id: 'weapon', label: 'Weapon', icon: <Sword className="w-5 h-5" />, parts: [{ id: 'held', label: 'Weapon' }] },
  { id: 'chakra', label: 'Chakra', icon: <Flame className="w-5 h-5" />, parts: [{ id: 'chakra', label: 'Chakra' }] },
  { id: 'paint', label: 'Pixel Paint', icon: <Paintbrush className="w-5 h-5" />, parts: [{ id: 'paint', label: 'Pixel Paint' }] },
];

/** Parts that are one equipment slot, and how their thumbnails are cropped. */
const SLOT_PARTS: Partial<Record<Part, { slot: SlotId; crop: 'full' | 'head' }>> = {
  hair: { slot: 'hair', crop: 'head' },
  marks: { slot: 'face', crop: 'head' },
  top: { slot: 'top', crop: 'full' },
  bottom: { slot: 'bottom', crop: 'full' },
  skirt: { slot: 'skirt', crop: 'full' },
  waist: { slot: 'waist', crop: 'full' },
  cape: { slot: 'cape', crop: 'full' },
  armor: { slot: 'armor', crop: 'full' },
  hands: { slot: 'hands', crop: 'full' },
  feet: { slot: 'feet', crop: 'full' },
  held: { slot: 'held', crop: 'full' },
};

const BODIES: { id: BodyType; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'bulky', label: 'Bulky' },
];

const FACE_SHAPES: { id: FaceShape; label: string; sub: string }[] = [
  { id: 'tapered', label: 'Tapered', sub: 'V-line jaw' },
  { id: 'soft', label: 'Soft', sub: 'Fuller cheeks' },
  { id: 'square', label: 'Square', sub: 'Strong jaw' },
  { id: 'valiant', label: 'Valiant', sub: "Aiden's face" },
  { id: 'night', label: 'Night', sub: "Ren's face" },
  { id: 'founder', label: 'Founder', sub: "Solen's face" },
  { id: 'fine', label: 'Fine', sub: "Lyra's face" },
  { id: 'aurelia', label: 'Serene', sub: "Aurelia's face" },
  { id: 'roman', label: 'Roman', sub: "The Roman's face" },
  { id: 'hoplite', label: 'Bronze warrior', sub: "The bronze warrior's face" },
  { id: 'general', label: 'Roman general', sub: "The Roman general's face" },
];

const ARMS: { id: ArmType; label: string; sub: string }[] = [
  { id: 'standard', label: 'Standard', sub: "The body's own" },
  { id: 'long', label: 'Long', sub: "Lyra's arms" },
];

const HANDS: { id: HandSize; label: string; sub: string }[] = [
  { id: 'normal', label: 'Normal hands', sub: "The body's own hands" },
  { id: 'small', label: 'Small hands', sub: "Aurelia's hands" },
];

const EYE_SHAPES: { id: EyeShape; label: string; sub?: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'round', label: 'Round' },
  { id: 'calm', label: 'Calm' },
  { id: 'fierce', label: 'Fierce' },
  { id: 'bright', label: 'Bright' },
  { id: 'piercing', label: 'Piercing' },
  { id: 'valiant', label: 'Valiant', sub: "Aiden's eyes" },
  { id: 'night', label: 'Night', sub: "Ren's eyes" },
  { id: 'dawn', label: 'Dawn', sub: "Aurelia's eyes" },
  { id: 'keen', label: 'Keen', sub: "Lyra's eyes" },
  { id: 'roman', label: 'Roman', sub: "The Roman's eyes" },
  { id: 'hoplite', label: 'Bronze warrior', sub: "The bronze warrior's eyes" },
  { id: 'general', label: 'Roman general', sub: "The Roman general's eyes" },
];

const HEADBAND_POSITIONS: { id: HeadbandPosition; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'forehead', label: 'Forehead' },
  { id: 'neck', label: 'Neck' },
  { id: 'arm', label: 'Arm' },
  { id: 'waist', label: 'Waist' },
];

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">{typeof children === 'string' ? L(children) : children}</div>
);

export const ColorRow: React.FC<{
  label: string;
  value: string;
  swatches: string[];
  /** Optional color families (dark to light), shown as chip strips instead of `swatches`. */
  families?: { name: string; colors: string[] }[];
  onChange: (hex: string) => void;
}> = ({ label, value, swatches, families, onChange }) => {
  const picker = (
    <label className="relative w-7 h-7 rounded-full border-2 border-dashed border-slate-500 overflow-hidden cursor-pointer" title={L('Custom color')}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <span className="absolute inset-1 rounded-full" style={{ backgroundColor: value }} />
    </label>
  );
  const selected = (c: string) => value.toLowerCase() === c.toLowerCase();
  return (
    <div>
      <div className="text-xs text-slate-300 mb-1.5">{L(label)}</div>
      {families ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {families.map((f) => (
            <div key={f.name} className="flex" title={f.name}>
              {f.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange(c)}
                  className={`w-5 h-5 border transition first:rounded-l-md last:rounded-r-md ${
                    selected(c) ? 'border-white scale-125 z-10 rounded-sm' : 'border-slate-900/60'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          ))}
          {picker}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${selected(c) ? 'border-white scale-110' : 'border-slate-800'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          {picker}
        </div>
      )}
    </div>
  );
};

/** Cloth and leather slots get the big color families; metal and glow keep their short list. */
function familiesFor(def: ItemDef, i: number): typeof CLOTH_FAMILIES | undefined {
  const kind = def.colors[i]?.kind;
  return !kind || kind === 'cloth' || kind === 'leather' ? CLOTH_FAMILIES : undefined;
}

function swatchesFor(def: ItemDef, i: number): string[] {
  const kind = def.colors[i]?.kind;
  if (kind === 'hair') return HAIR_COLORS;
  return CLOTH_COLORS;
}

export const AppearanceEditor: React.FC<{
  look: SpriteAppearance;
  eye: EyeSpecial;
  character: ShinobiCharacter;
  onChange: (look: SpriteAppearance) => void;
  onPreviewStance: (stance: SpritePose) => void;
  /** Tells the creator which section is open (it brings the camera to the face for the head). */
  onGroup?: (g: AppearanceGroup) => void;
  /** What the last change of chakra type did to the jutsu (already in the screen's language). */
  chakraNote?: string;
  /** The ninja has been made: its chakra type can no longer change (rules/progression.ts). */
  typeFixed?: boolean;
}> = ({ look, eye, character, onChange, onPreviewStance, onGroup, chakraNote, typeFixed }) => {
  useLang();
  const [group, setGroup] = useState<AppearanceGroup>('body');
  const [parts, setParts] = useState<Partial<Record<AppearanceGroup, Part>>>({});
  const g = GROUPS.find((x) => x.id === group)!;
  const part = parts[group] ?? g.parts[0].id;

  const setSlot = (s: SlotId, choice: ItemChoice | null) => {
    soundManager.playSelect();
    const slots = { ...look.slots };
    if (choice) slots[s] = choice;
    else delete slots[s];
    onChange({ ...look, slots });
  };
  const openGroup = (id: AppearanceGroup) => {
    soundManager.playSelect();
    setGroup(id);
    onGroup?.(id);
    if (id === 'chakra') onPreviewStance('charge');
  };
  const slotPart = SLOT_PARTS[part];
  /** The chakra's type (the ninja's nature) and the burst drawn for it. */
  const nature = chakraNature(look.chakra);
  const burstInfo = chakraChoice(look.chakra.color);

  return (
    <div className="flex gap-3 min-h-full">
      {/* The sections, down the side as in Baldur's Gate 3. */}
      <nav className="sticky top-0 self-start flex flex-col gap-1 w-[68px] shrink-0" aria-label="Sections">
        {GROUPS.map((x) => {
          const on = x.id === group;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => openGroup(x.id)}
              className={`group flex flex-col items-center gap-1 py-2 border transition ${
                on ? 'border-[#c99a4b] bg-[linear-gradient(180deg,rgba(242,196,109,0.16),rgba(242,196,109,0.03))]' : 'border-transparent hover:border-[#5b4426]'
              }`}
            >
              <span className={on ? 'text-[#f2c46d]' : 'text-[#b9a98a] group-hover:text-[#efe3c4]'}>{x.icon}</span>
              <span style={serif} className={`text-[9px] font-bold uppercase tracking-wider leading-tight text-center ${on ? 'text-[#f2c46d]' : 'text-[#b9a98a]'}`}>
                {L(x.label)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0 space-y-4 pb-2">
        <div className="border-b border-[#3d3122] pb-2">
          <div style={serif} className="text-sm font-bold uppercase tracking-[0.18em] text-[#f2c46d]">
            {L(g.label)}
          </div>
          {g.parts.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {g.parts.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => {
                    soundManager.playSelect();
                    setParts({ ...parts, [group]: pt.id });
                  }}
                  className={`px-2.5 py-1 text-xs border transition ${
                    part === pt.id ? 'border-[#c99a4b] text-[#f2c46d] bg-[#3a2a12]' : 'border-[#3d3122] text-[#d9caa6] hover:border-[#8a6a3a]'
                  }`}
                >
                  {L(pt.label)}
                </button>
              ))}
            </div>
          )}
        </div>

        {part === 'build' && (
          <div className="space-y-5">
            <div>
              <SectionLabel>Body Type</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BODIES.map((b) => (
                  <OptionCard
                    key={b.id}
                    selected={look.body === b.id}
                    label={b.label}
                    onClick={() => {
                      soundManager.playSelect();
                      onChange({ ...look, body: b.id });
                    }}
                  >
                    <SpriteThumb look={{ ...look, body: b.id }} eye={eye} />
                  </OptionCard>
                ))}
              </div>
            </div>
            <ColorRow label="Skin Tone" value={look.skin} swatches={SKIN_TONES} onChange={(skin) => onChange({ ...look, skin })} />
            <div>
              <SectionLabel>Arms</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ARMS.map((n) => (
                  <OptionCard
                    key={n.id}
                    selected={(look.arms || 'standard') === n.id}
                    label={n.label}
                    sub={n.sub}
                    onClick={() => {
                      soundManager.playSelect();
                      onChange({ ...look, arms: n.id });
                    }}
                  >
                    <SpriteThumb look={{ ...look, arms: n.id }} eye={eye} />
                  </OptionCard>
                ))}
              </div>
            </div>
            {isFemaleBody(look.body) && (
              <div>
                <SectionLabel>Hands</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {HANDS.map((h) => (
                    <OptionCard
                      key={h.id}
                      selected={(look.hands || 'normal') === h.id}
                      label={h.label}
                      sub={h.sub}
                      onClick={() => {
                        soundManager.playSelect();
                        onChange({ ...look, hands: h.id });
                      }}
                    >
                      <SpriteThumb look={{ ...look, hands: h.id }} eye={eye} />
                    </OptionCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {part === 'shape' && (
          <div>
            <SectionLabel>Face Shape</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FACE_SHAPES.filter((f) => (f.id !== 'hoplite' && f.id !== 'general') || !isFemaleBody(look.body)).map((f) => (
                <OptionCard
                  key={f.id}
                  selected={(look.faceShape || 'tapered') === f.id}
                  label={f.label}
                  sub={f.sub}
                  onClick={() => {
                    soundManager.playSelect();
                    onChange({ ...look, faceShape: f.id });
                  }}
                >
                  <SpriteThumb look={{ ...look, faceShape: f.id }} eye={eye} crop="head" />
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {part === 'eyes' && (
          <div className="space-y-5">
            <div>
              <SectionLabel>Eye Shape</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {EYE_SHAPES.filter((e) => (e.id !== 'hoplite' && e.id !== 'general') || !isFemaleBody(look.body)).map((e) => (
                  <OptionCard
                    key={e.id}
                    selected={look.eyeShape === e.id}
                    label={e.label}
                    sub={e.sub}
                    onClick={() => {
                      soundManager.playSelect();
                      onChange({ ...look, eyeShape: e.id });
                    }}
                  >
                    <SpriteThumb look={{ ...look, eyeShape: e.id }} eye={eye} crop="head" />
                  </OptionCard>
                ))}
              </div>
            </div>
            <ColorRow label="Eye Color" value={look.eyeColor} swatches={EYE_COLORS} onChange={(eyeColor) => onChange({ ...look, eyeColor })} />
            {eye !== 'none' && (
              <p className="text-[11px] text-amber-300/90">
                {L("Your clan's special eyes (chosen in the Clan step) override the eye color while active.")}
              </p>
            )}
          </div>
        )}

        {slotPart && <SlotPicker key={part} slot={slotPart.slot} look={look} eye={eye} crop={slotPart.crop} setSlot={setSlot} />}

        {part === 'gear' && <AccessoryPicker look={look} eye={eye} onChange={onChange} />}

        {part === 'headband' && (
          <div className="space-y-5">
            <div>
              <SectionLabel>Placement</SectionLabel>
              <div className="grid grid-cols-5 gap-2">
                {HEADBAND_POSITIONS.map((p) => (
                  <OptionCard
                    key={p.id}
                    selected={look.headband.position === p.id}
                    label={p.label}
                    onClick={() => {
                      soundManager.playSelect();
                      onChange({ ...look, headband: { ...look.headband, position: p.id } });
                    }}
                  >
                    <SpriteThumb look={{ ...look, headband: { ...look.headband, position: p.id } }} eye={eye} />
                  </OptionCard>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="Long cloth tails"
                value={look.headband.tails}
                onChange={(tails) => onChange({ ...look, headband: { ...look.headband, tails } })}
              />
            </div>
            <ColorRow
              label="Cloth"
              value={look.headband.cloth}
              swatches={CLOTH_COLORS}
              families={CLOTH_FAMILIES}
              onChange={(cloth) => onChange({ ...look, headband: { ...look.headband, cloth } })}
            />
          </div>
        )}

        {part === 'chakra' && (
          <div className="space-y-5">
            {/* The chakra type is the ninja's elemental nature (the owner, 2026-10-21); the color below is only a look. */}
            <div data-nature={nature}>
              <div className="flex items-baseline justify-between gap-2">
                <SectionLabel>Chakra Type</SectionLabel>
                <div className="text-xs text-slate-400 mb-2">
                  {L('Nature')}: <span style={serif} className="text-sm font-bold text-[#f2c46d]">{L(nature)}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 -mt-1 mb-2">{L('Your chakra type is your elemental nature: it decides your elemental jutsu.')}</p>
              {/* The owner (2026-10-21): the type can't be changed once the ninja is made; a second element comes at level 5 (rules/natureGrowth.ts). */}
              {typeFixed && (
                <p data-type-fixed className="flex items-start gap-1.5 text-[11px] text-[#f2c46d] border border-[#6b5434] bg-[#2b1f0d] px-2 py-1.5 mb-2">
                  <Lock className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>{L('Your chakra type was fixed when this ninja was made: it can no longer change. At level 5 it may take a second element (Jutsu step).')}</span>
                </p>
              )}
              {[true, false].map((elemental) => (
                <div key={String(elemental)} className="mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{L(elemental ? 'Elements' : 'No element')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* A pending type (Shadow, Spirit) is not offered; a ninja that has it sees its own tile, marked, until it picks another. */}
                    {CHAKRA_TYPES.filter((t) => t.elemental === elemental && (!t.pending || t.nature === nature)).map((t) => {
                      const on = t.nature === nature;
                      const burst = on ? look.chakra.color : t.bursts[0];
                      // A made ninja's other types are shown, out of reach.
                      const locked = !!typeFixed && !on;
                      return (
                        <button
                          key={t.nature}
                          type="button"
                          disabled={locked}
                          title={locked ? L('Fixed when the ninja was made') : undefined}
                          onClick={() => {
                            if (locked) return;
                            soundManager.playChakraSurge();
                            onChange({ ...look, chakra: withNature(look.chakra, t.nature) });
                            onPreviewStance('charge');
                          }}
                          className={`relative flex flex-col items-center w-[80px] pt-1 pb-1.5 border transition ${
                            on ? 'border-[#f2c46d] bg-[#3a2a12]/70 ring-1 ring-[#f2c46d]/50' : locked ? 'border-slate-900 bg-slate-950/60 opacity-35 grayscale cursor-not-allowed' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                          }`}
                        >
                          {on && typeFixed && <Lock className="absolute right-1 top-1 w-3 h-3 text-[#f2c46d]" />}
                          <BurstThumb look={look} burst={burst} eye={eye} />
                          <span style={serif} className={`text-[13px] font-bold leading-tight ${on ? 'text-[#f2c46d]' : 'text-slate-200'}`}>
                            {L(t.nature)}
                          </span>
                          {t.pending && <span className="text-[10px] uppercase tracking-wider text-amber-400/90 leading-tight">{L('Pending')}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {/* The owner (2026-10-21): Light and Void stay; their own jutsu come later. */}
                  {!elemental && <p className="text-[11px] text-slate-400 mt-1">{L('Light and Void: their own jutsu will come later. For now they learn no elemental jutsu.')}</p>}
                </div>
              ))}
              {chakraType(nature).pending && !typeFixed && (
                <p className="text-[11px] text-amber-300/90 border border-amber-900/60 bg-amber-950/30 px-2 py-1.5">
                  {L('This type is pending: it can no longer be picked. Your ninja keeps it until you choose another one.')}
                </p>
              )}
              {/* Sticks to the bottom of the panel while it is below the fold (a short screen), so the swap is seen right after the click. */}
              {chakraNote && (
                <p className="sticky bottom-0 z-10 mt-1.5 text-[11px] text-[#f2c46d] border border-[#6b5434] bg-[#2b1f0d] shadow-[0_-8px_16px_rgba(0,0,0,0.55)] px-2 py-1.5">
                  {chakraNote}
                </p>
              )}
            </div>
            <div>
              <SectionLabel>Chakra Color</SectionLabel>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playChakraSurge();
                    onChange({ ...look, chakra: { ...look.chakra, tint: undefined } });
                    onPreviewStance('charge');
                  }}
                  className={`px-2.5 h-7 text-xs rounded-full border transition ${
                    !look.chakra.tint ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950/60 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={L("The burst's own color")}
                >
                  {L('Natural')}
                </button>
                {TINT_CHOICES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      soundManager.playChakraSurge();
                      onChange({ ...look, chakra: { ...look.chakra, tint: c.id } });
                      onPreviewStance('charge');
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      look.chakra.tint === c.id ? 'border-white scale-110' : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={L(c.name)}
                  />
                ))}
                <label className="relative w-7 h-7 rounded-full border-2 border-dashed border-slate-500 overflow-hidden cursor-pointer" title={L('Custom color')}>
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(look.chakra.tint ?? '') ? look.chakra.tint : chakraHex(look.chakra)}
                    onChange={(e) => {
                      onChange({ ...look, chakra: { ...look.chakra, tint: e.target.value } });
                      onPreviewStance('charge');
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="absolute inset-1 rounded-full" style={{ backgroundColor: chakraHex(look.chakra) }} />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {L('Only a look: the color never changes the nature. Green fire is still Fire; black lightning is still Lightning.')}
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/60 px-2.5 py-2">
              <div className="text-xs font-semibold text-white">
                {L(nature)} · <span className="text-cyan-300">{L(burstInfo.burst)}</span>
              </div>
              <div className="text-[11px] text-slate-400">{L(burstInfo.desc)}</div>
              {chakraType(nature).bursts.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{L('Burst')}</span>
                  {chakraType(nature).bursts.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        soundManager.playChakraSurge();
                        onChange({ ...look, chakra: { ...look.chakra, color: b } });
                        onPreviewStance('charge');
                      }}
                      className={`px-2.5 py-1 text-xs border transition ${
                        look.chakra.color === b ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950/60 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {L(CHAKRA_CHOICES.find((c) => c.id === b)?.burst ?? b)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <SectionLabel>Casting Style</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CAST_STYLES.map((s) => (
                  <OptionCard
                    key={s}
                    selected={defaultCastStyle(look) === s}
                    label={L(CAST_STYLE_INFO[s].label)}
                    sub={CAST_STYLE_INFO[s].desc}
                    onClick={() => {
                      soundManager.playChakraSurge();
                      onChange({ ...look, cast: { ...(look.cast ?? { style: s }), style: s } });
                      onPreviewStance('cast');
                    }}
                  >
                    <SpriteThumb look={{ ...look, cast: { ...(look.cast ?? { style: s }), style: s } }} eye={eye} pose="cast" />
                  </OptionCard>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">{L('The default for every jutsu. Each jutsu can use its own style in Jutsu Loadout.')}</p>
            </div>
            <div>
              <SectionLabel>Show the burst when…</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Toggle
                  label="Charging chakra"
                  value={look.chakra.onCharge}
                  onChange={(onCharge) => {
                    onChange({ ...look, chakra: { ...look.chakra, onCharge } });
                    onPreviewStance('charge');
                  }}
                />
                <Toggle
                  label="Casting"
                  value={look.chakra.onCast}
                  onChange={(onCast) => {
                    onChange({ ...look, chakra: { ...look.chakra, onCast } });
                    onPreviewStance('cast');
                  }}
                />
                <Toggle
                  label="Victory pose"
                  value={look.chakra.onVictory}
                  onChange={(onVictory) => {
                    onChange({ ...look, chakra: { ...look.chakra, onVictory } });
                    onPreviewStance('victory');
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {part === 'paint' && <PixelEditor look={look} eye={eye} character={character} onChange={onChange} />}
      </div>
    </div>
  );
};

const OptionCard: React.FC<{
  selected: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
  children?: React.ReactNode;
}> = ({ selected, label, sub, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition ${
      selected ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50' : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
    }`}
  >
    <div className="rounded-lg bg-slate-900/80">{children}</div>
    <div className={`text-[11px] leading-tight text-center ${selected ? 'text-white font-semibold' : 'text-slate-300'}`}>{L(label)}</div>
    {sub && <div className="text-[10px] text-slate-500 text-center leading-tight">{L(sub)}</div>}
  </button>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <button
    type="button"
    onClick={() => {
      soundManager.playSelect();
      onChange(!value);
    }}
    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition ${
      value ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
    }`}
  >
    <span className={`w-3 h-3 rounded-sm border ${value ? 'bg-white border-white' : 'border-slate-500'}`} />
    {L(label)}
  </button>
);

const SlotPicker: React.FC<{
  slot: SlotId;
  look: SpriteAppearance;
  eye: EyeSpecial;
  crop: 'full' | 'head';
  setSlot: (s: SlotId, c: ItemChoice | null) => void;
}> = ({ slot, look, eye, crop, setSlot }) => {
  const items = useMemo(() => itemsForSlot(slot).filter((d) => !d.id.endsWith('_none') && fitsBody(d, look.body)), [slot, look.body]);
  const current = look.slots[slot];
  const currentDef = current ? getItem(current.id) : undefined;
  const options: (ItemDef | null)[] = [null, ...items];
  const idx = Math.max(0, options.findIndex((o) => (o ? o.id === current?.id : !current)));

  const choose = (def: ItemDef | null) => {
    if (!def) return setSlot(slot, null);
    // The item already worn stays as it is (its colors and parts).
    if (current && def.id === current.id) return;
    // Keep the player's colors when switching between items with compatible slots.
    const keep = current && currentDef ? current.colors : [];
    setSlot(slot, { id: def.id, colors: def.colors.map((c, i) => (currentDef?.colors[i]?.kind === c.kind && keep[i]) || c.default) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => choose(options[(idx - 1 + options.length) % options.length])}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          aria-label={L('Previous')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-bold text-white">{currentDef ? L(currentDef.name) : L('None')}</div>
          <div className="text-[11px] text-slate-400">{currentDef ? L(currentDef.desc) : L('Nothing equipped in this slot.')}</div>
        </div>
        <button
          type="button"
          onClick={() => choose(options[(idx + 1) % options.length])}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          aria-label={L('Next')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {currentDef && currentDef.colors.length > 0 && (
        <div className="space-y-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          {currentDef.colors.map((c, i) => (
            <ColorRow
              key={c.key}
              label={c.label}
              value={current!.colors[i] || c.default}
              swatches={swatchesFor(currentDef, i)}
              families={familiesFor(currentDef, i)}
              onChange={(hex) => {
                const colors = currentDef.colors.map((cc, j) => current!.colors[j] || cc.default);
                colors[i] = hex;
                setSlot(slot, { ...current!, id: currentDef.id, colors });
              }}
            />
          ))}
        </div>
      )}

      {currentDef?.parts && <PartPicker def={currentDef} choice={current!} look={look} onChange={(c) => setSlot(slot, c)} />}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {options.map((def) => {
          const sel = def ? def.id === current?.id : !current;
          const slots = { ...look.slots };
          if (def) slots[slot] = sel && current ? current : { id: def.id, colors: [] };
          else delete slots[slot];
          return (
            <OptionCard key={def?.id ?? 'none'} selected={sel} label={def?.name ?? L('None')} onClick={() => choose(def)}>
              <SpriteThumb look={{ ...look, slots }} eye={eye} crop={crop} />
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
};

/**
 * An item's parts (a katana's steel, blade, guard and hilt): each version a row with the item drawn
 * with it, and the story of the one picked.
 */
const PartPicker: React.FC<{
  def: ItemDef;
  choice: ItemChoice;
  look: SpriteAppearance;
  onChange: (c: ItemChoice) => void;
}> = ({ def, choice, look, onChange }) => {
  const chosen = resolveParts(def, choice.parts);
  // The thumbnails at a whole-number zoom, so every pixel of the art is drawn the same size: 2x
  // where the row leaves room beside it for the name, else 1x.
  const box = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRoom(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const artW = def.partsPreview?.(look, chosen).rows[0]?.length ?? 1;
  const zoom = Math.max(1, Math.min(2, Math.floor((room - 120) / artW)));
  return (
    <div ref={box} className="space-y-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
      {def.parts!.map((ps) => (
        <div key={ps.key}>
          <div className="text-xs text-slate-300 mb-1.5">{L(ps.label)}</div>
          <div className="flex flex-col gap-1.5">
            {ps.options.map((o) => {
              const parts = { ...chosen, [ps.key]: o.id };
              const sel = o.id === chosen[ps.key];
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    soundManager.playSelect();
                    onChange({ ...choice, parts });
                  }}
                  className={`flex items-center gap-3 p-1.5 rounded-xl border text-left transition ${
                    sel ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50' : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {def.partsPreview && (
                    <div className="shrink-0 rounded-lg bg-slate-900/80 p-1">
                      <PartThumb art={def.partsPreview(look, parts)} zoom={zoom} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className={`text-[11px] leading-tight ${sel ? 'text-white font-semibold' : 'text-slate-300'}`}>{L(o.label)}</div>
                    {sel && <div className="text-[10px] leading-snug text-slate-400 mt-0.5">{L(o.desc)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const AccessoryPicker: React.FC<{
  look: SpriteAppearance;
  eye: EyeSpecial;
  onChange: (look: SpriteAppearance) => void;
}> = ({ look, eye, onChange }) => {
  const items = useMemo(() => itemsForSlot('accessory'), []);
  const worn = new Map(look.accessories.map((a) => [a.id, a]));
  const toggle = (def: ItemDef) => {
    soundManager.playSelect();
    const accessories = worn.has(def.id)
      ? look.accessories.filter((a) => a.id !== def.id)
      : [...look.accessories, { id: def.id, colors: def.colors.map((c) => c.default) }];
    onChange({ ...look, accessories });
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{L('Wear as many as you like.')}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((def) => (
          <OptionCard key={def.id} selected={worn.has(def.id)} label={def.name} onClick={() => toggle(def)}>
            <SpriteThumb
              look={{ ...look, accessories: worn.has(def.id) ? look.accessories : [...look.accessories, { id: def.id, colors: [] }] }}
              eye={eye}
             
            />
          </OptionCard>
        ))}
      </div>
      {look.accessories.map((a) => {
        const def = getItem(a.id);
        if (!def || !def.colors.length) return null;
        return (
          <div key={a.id} className="space-y-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-xs font-semibold text-white">{def.name}</div>
            {def.colors.map((c, i) => (
              <ColorRow
                key={c.key}
                label={c.label}
                value={a.colors[i] || c.default}
                swatches={swatchesFor(def, i)}
                families={familiesFor(def, i)}
                onChange={(hex) => {
                  const colors = def.colors.map((cc, j) => a.colors[j] || cc.default);
                  colors[i] = hex;
                  onChange({ ...look, accessories: look.accessories.map((x) => (x.id === a.id ? { ...x, colors } : x)) });
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
