// =============================================================================================
// RAIJU (lightning)
// =============================================================================================
//
// The thunder beast of the old stories, painted to the owner's design: a natural, slim, long-legged
// golden wolf in a pouncing cycle that holds its body centre on the anchor. It coils, springs,
// stretches out with the forelegs reaching, strikes with the jaw wide, then tucks its legs back in.
// The volumes are smooth: chest, tucked waist, haunch and neck are fused into one height field, so
// they flow into each other and shade like soft fur (cream on top and on the back of the neck, warm
// gold, amber, brown-orange under the belly and on the far legs, a dark brown outline). A ruff of
// pointed fur tufts covers the neck and shoulders; the head is a wolf in profile, ears up, snarling,
// with bared teeth and a glowing white eye. Thin white-yellow lightning veins run over the body like
// glowing cracks and flicker every frame; small arcs jump above the back, sparks spit around the
// feet, the tail is a bright zigzag bolt with a forked tip, and the stretch trails pale streaks.

const RAI = (() => ({
  ramp: ['#4a1e06', '#7a3a0a', '#a85a10', '#d08418', '#eaa828', '#f8c840', '#ffe27a', '#fff4c8'].map((c) => hex(c)) as Color[],
  outline: hex('#4a2008'),
  line: hex('#7a3a0a'),
  soft: hex('#b8680e'),
  mouth: [hex('#3a1206'), hex('#6a2208'), hex('#a8401a')] as Color[],
  tooth: [hex('#fffaea'), hex('#e8cf96')] as Color[],
  arc: hex('#fffef0'),
  glow: hex('#ffe27a'),
  cool: hex('#c8f2ff'),
}))();
