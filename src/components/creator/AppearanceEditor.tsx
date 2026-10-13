import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { itemsForSlot, getItem } from '../../sprite/catalog';
import type { ItemDef } from '../../sprite/ctx';
import { EMBLEMS } from '../../sprite/items/headband';
import { CHAKRA_CHOICES } from '../../sprite/chakraInfo';
import { CLOTH_COLORS, CLOTH_FAMILIES, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from '../../sprite/palettes';
import type {
  BodyType,
  EyeShape,
  EyeSpecial,
  FaceShape,
  HeadbandPosition,
  ItemChoice,
  NeckType,
  SlotId,
  SpriteAppearance,
  SpritePose,
} from '../../sprite/types';
import type { ShinobiCharacter } from '../../types/shinobi';
import { soundManager } from '../../utils/audio';
import { PixelEditor } from './PixelEditor';
import { SpriteThumb } from './SpriteThumb';

type Category =
  | 'body'
  | 'face'
  | 'top'
  | 'bottom'
  | 'armor'
  | 'skirt'
  | 'waist'
  | 'hands'
  | 'feet'
  | 'cape'
  | 'held'
  | 'gear'
  | 'headband'
  | 'chakra'
  | 'paint';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'body', label: 'Body' },
  { id: 'face', label: 'Face' },
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Pants' },
  { id: 'armor', label: 'Armor' },
  { id: 'skirt', label: 'Skirts' },
  { id: 'waist', label: 'Belts & Sashes' },
  { id: 'hands', label: 'Gloves' },
  { id: 'feet', label: 'Boots' },
  { id: 'cape', label: 'Capes' },
  { id: 'held', label: 'Weapon' },
  { id: 'gear', label: 'Accessories' },
  { id: 'headband', label: 'Headband' },
  { id: 'chakra', label: 'Chakra' },
  { id: 'paint', label: 'Pixel Paint' },
];

const SLOT_CATEGORIES: Partial<Record<Category, SlotId>> = {
  top: 'top',
  bottom: 'bottom',
  armor: 'armor',
  skirt: 'skirt',
  waist: 'waist',
  hands: 'hands',
  feet: 'feet',
  cape: 'cape',
  held: 'held',
};

/** Sub-sections of the Face category. */
type FaceTab = 'shape' | 'eyes' | 'hair' | 'neck' | 'marks';

const FACE_TABS: { id: FaceTab; label: string }[] = [
  { id: 'shape', label: 'Shape' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'hair', label: 'Hair' },
  { id: 'neck', label: 'Neck' },
  { id: 'marks', label: 'Face Marks' },
];

const BODIES: { id: BodyType; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'bulky', label: 'Bulky' },
];

const FACE_SHAPES: { id: FaceShape; label: string; sub: string }[] = [
  { id: 'tapered', label: 'Tapered', sub: 'V-line jaw' },
  { id: 'soft', label: 'Soft', sub: 'Fuller cheeks' },
  { id: 'square', label: 'Square', sub: 'Strong jaw' },
];

const NECKS: { id: NeckType; label: string; sub: string }[] = [
  { id: 'slim', label: 'Slim', sub: 'Slender' },
  { id: 'strong', label: 'Strong', sub: 'Thick, muscular' },
];

const EYE_SHAPES: { id: EyeShape; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'round', label: 'Round' },
  { id: 'calm', label: 'Calm' },
  { id: 'fierce', label: 'Fierce' },
  { id: 'bright', label: 'Bright' },
  { id: 'piercing', label: 'Piercing' },
];

const HEADBAND_POSITIONS: { id: HeadbandPosition; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'forehead', label: 'Forehead' },
  { id: 'neck', label: 'Neck' },
  { id: 'arm', label: 'Arm' },
  { id: 'waist', label: 'Waist' },
];

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">{children}</div>
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
    <label className="relative w-7 h-7 rounded-full border-2 border-dashed border-slate-500 overflow-hidden cursor-pointer" title="Custom color">
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
      <div className="text-xs text-slate-300 mb-1.5">{label}</div>
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
}> = ({ look, eye, character, onChange, onPreviewStance }) => {
  const [cat, setCat] = useState<Category>('body');
  const [faceTab, setFaceTab] = useState<FaceTab>('shape');
  const slot = SLOT_CATEGORIES[cat];

  const setSlot = (s: SlotId, choice: ItemChoice | null) => {
    soundManager.playSelect();
    const slots = { ...look.slots };
    if (choice) slots[s] = choice;
    else delete slots[s];
    onChange({ ...look, slots });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              soundManager.playSelect();
              setCat(c.id);
              if (c.id === 'chakra') onPreviewStance('charge');
            }}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              cat === c.id
                ? 'bg-cyan-600 border-cyan-500 text-white font-semibold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {cat === 'body' && (
        <div className="space-y-5">
          <div>
            <SectionLabel>Body Type</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
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
        </div>
      )}

      {cat === 'face' && (
        <div className="flex flex-wrap gap-1.5">
          {FACE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundManager.playSelect();
                setFaceTab(t.id);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                faceTab === t.id
                  ? 'bg-slate-700 border-slate-500 text-white font-semibold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {cat === 'face' && faceTab === 'shape' && (
        <div>
          <SectionLabel>Face Shape</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FACE_SHAPES.map((f) => (
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

      {cat === 'face' && faceTab === 'eyes' && (
        <div className="space-y-5">
          <div>
            <SectionLabel>Eye Shape</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {EYE_SHAPES.map((e) => (
                <OptionCard
                  key={e.id}
                  selected={look.eyeShape === e.id}
                  label={e.label}
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
              Your clan's special eyes (chosen in Clan & Identity) override the eye color while active.
            </p>
          )}
        </div>
      )}

      {cat === 'face' && faceTab === 'hair' && <SlotPicker slot="hair" look={look} eye={eye} crop="head" setSlot={setSlot} />}

      {cat === 'face' && faceTab === 'neck' && (
        <div>
          <SectionLabel>Neck</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NECKS.map((n) => (
              <OptionCard
                key={n.id}
                selected={(look.neck || 'slim') === n.id}
                label={n.label}
                sub={n.sub}
                onClick={() => {
                  soundManager.playSelect();
                  onChange({ ...look, neck: n.id });
                }}
              >
                <SpriteThumb look={{ ...look, neck: n.id }} eye={eye} crop="head" />
              </OptionCard>
            ))}
          </div>
        </div>
      )}

      {cat === 'face' && faceTab === 'marks' && <SlotPicker slot="face" look={look} eye={eye} crop="head" setSlot={setSlot} />}

      {slot && <SlotPicker slot={slot} look={look} eye={eye} crop="full" setSlot={setSlot} />}

      {cat === 'gear' && <AccessoryPicker look={look} eye={eye} onChange={onChange} />}

      {cat === 'headband' && (
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
              label="Slashed (rogue)"
              value={look.headband.slashed}
              onChange={(slashed) => onChange({ ...look, headband: { ...look.headband, slashed } })}
            />
            <Toggle
              label="Long cloth tails"
              value={look.headband.tails}
              onChange={(tails) => onChange({ ...look, headband: { ...look.headband, tails } })}
            />
          </div>
          <div>
            <SectionLabel>Emblem</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {EMBLEMS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onChange({ ...look, headband: { ...look.headband, emblem: e.id } })}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border transition ${
                    look.headband.emblem === e.id
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
          <ColorRow
            label="Cloth"
            value={look.headband.cloth}
            swatches={CLOTH_COLORS}
            families={CLOTH_FAMILIES}
            onChange={(cloth) => onChange({ ...look, headband: { ...look.headband, cloth } })}
          />
          <ColorRow
            label="Plate"
            value={look.headband.plate}
            swatches={['#cbd5e1', '#9ca3af', '#d4af37', '#b87333', '#4b5563', '#f8fafc']}
            onChange={(plate) => onChange({ ...look, headband: { ...look.headband, plate } })}
          />
        </div>
      )}

      {cat === 'chakra' && (
        <div className="space-y-5">
          <div>
            <SectionLabel>Chakra Color & Burst</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CHAKRA_CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    soundManager.playChakraSurge();
                    onChange({ ...look, chakra: { ...look.chakra, color: c.id } });
                    onPreviewStance('charge');
                  }}
                  className={`p-2.5 text-left rounded-xl border transition ${
                    look.chakra.color === c.id
                      ? 'bg-slate-800 border-white/70 ring-1 ring-white/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} />
                    <span className="text-xs font-semibold text-white">{c.name}</span>
                  </div>
                  <div className="text-[11px] text-cyan-300 mt-1">{c.burst}</div>
                  <div className="text-[10px] text-slate-500">{c.desc}</div>
                </button>
              ))}
            </div>
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

      {cat === 'paint' && <PixelEditor look={look} eye={eye} character={character} onChange={onChange} />}
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
    <div className={`text-[11px] leading-tight text-center ${selected ? 'text-white font-semibold' : 'text-slate-300'}`}>{label}</div>
    {sub && <div className="text-[10px] text-slate-500 text-center leading-tight">{sub}</div>}
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
    {label}
  </button>
);

const SlotPicker: React.FC<{
  slot: SlotId;
  look: SpriteAppearance;
  eye: EyeSpecial;
  crop: 'full' | 'head';
  setSlot: (s: SlotId, c: ItemChoice | null) => void;
}> = ({ slot, look, eye, crop, setSlot }) => {
  const items = useMemo(() => itemsForSlot(slot).filter((d) => !d.id.endsWith('_none')), [slot]);
  const current = look.slots[slot];
  const currentDef = current ? getItem(current.id) : undefined;
  const options: (ItemDef | null)[] = [null, ...items];
  const idx = Math.max(0, options.findIndex((o) => (o ? o.id === current?.id : !current)));

  const choose = (def: ItemDef | null) => {
    if (!def) return setSlot(slot, null);
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
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-bold text-white">{currentDef?.name ?? 'None'}</div>
          <div className="text-[11px] text-slate-400">{currentDef?.desc ?? 'Nothing equipped in this slot.'}</div>
        </div>
        <button
          type="button"
          onClick={() => choose(options[(idx + 1) % options.length])}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          aria-label="Next"
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
                setSlot(slot, { id: currentDef.id, colors });
              }}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {options.map((def) => {
          const sel = def ? def.id === current?.id : !current;
          const slots = { ...look.slots };
          if (def) slots[slot] = { id: def.id, colors: sel && current ? current.colors : [] };
          else delete slots[slot];
          return (
            <OptionCard key={def?.id ?? 'none'} selected={sel} label={def?.name ?? 'None'} onClick={() => choose(def)}>
              <SpriteThumb look={{ ...look, slots }} eye={eye} crop={crop} />
            </OptionCard>
          );
        })}
      </div>
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
      <p className="text-xs text-slate-400">Wear as many as you like.</p>
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
