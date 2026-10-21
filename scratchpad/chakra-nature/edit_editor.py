import sys
p = sys.argv[1]
s = open(p).read()
start = s.index("        {part === 'chakra' && (\n          <div className=\"space-y-5\">\n            <div>\n              <SectionLabel>Chakra Nature & Burst</SectionLabel>")
end = s.index("            <div>\n              <SectionLabel>Casting Style</SectionLabel>")
new = '''        {part === 'chakra' && (
          <div className="space-y-5">
            {/* The chakra type is the ninja's elemental nature (the owner, 2026-10-21); the color below is only a look. */}
            <div data-nature={nature}>
              <div className="flex items-baseline justify-between gap-2">
                <SectionLabel>Chakra Type</SectionLabel>
                <div className="text-xs text-slate-400 mb-2">
                  {L('Nature')}: <span style={serif} className="text-sm font-bold text-[#f2c46d]">{L(nature)}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 -mt-1 mb-2">{L('Your chakra type is your elemental nature: it decides the elemental jutsu you can learn.')}</p>
              {[true, false].map((elemental) => (
                <div key={String(elemental)} className="mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{L(elemental ? 'Elements' : 'No element')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CHAKRA_TYPES.filter((t) => t.elemental === elemental).map((t) => {
                      const on = t.nature === nature;
                      const burst = on ? look.chakra.color : t.bursts[0];
                      return (
                        <button
                          key={t.nature}
                          type="button"
                          onClick={() => {
                            soundManager.playChakraSurge();
                            onChange({ ...look, chakra: withNature(look.chakra, t.nature) });
                            onPreviewStance('charge');
                          }}
                          className={`flex flex-col items-center w-[84px] pt-1 pb-1.5 border transition ${
                            on ? 'border-[#f2c46d] bg-[#3a2a12]/70 ring-1 ring-[#f2c46d]/50' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                          }`}
                        >
                          <BurstThumb look={look} burst={burst} eye={eye} />
                          <span style={serif} className={`text-[13px] font-bold leading-tight ${on ? 'text-[#f2c46d]' : 'text-slate-200'}`}>
                            {L(t.nature)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
                {CHAKRA_CHOICES.map((c) => (
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
'''
s = s[:start] + new + s[end:]
a = "import { CHAKRA_CHOICES, chakraHex } from '../../sprite/chakraInfo';\n"
assert a in s
s = s.replace(a, a + "import { CHAKRA_TYPES, chakraNature, chakraType, withNature } from '../../sprite/chakraNature';\n", 1)
a = "import { SpriteThumb } from './SpriteThumb';\n"
assert a in s
s = s.replace(a, a + "import { BurstThumb } from './BurstThumb';\n", 1)
old = "  const slotPart = SLOT_PARTS[part];\n"
assert old in s
s = s.replace(old, old + """  /** The chakra's type (the ninja's nature) and the burst drawn for it. */
  const nature = chakraNature(look.chakra);
  const burstInfo = CHAKRA_CHOICES.find((c) => c.id === look.chakra.color) ?? CHAKRA_CHOICES[0];
""", 1)
open(p, 'w').write(s)
print('ok')
