const R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-tint/merge-check';
const { vfxTintIsNatural, VFX_ELEMENTS } = await import(R + '/src/sprite/vfxTint.ts');
for (const el of VFX_ELEMENTS) console.log(el, 'brown natural?', vfxTintIsNatural(el, 'brown'), 'beast', vfxTintIsNatural(el, 'brown', true), '#9a6a36', vfxTintIsNatural(el, '#9a6a36'));
