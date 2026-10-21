import sys
root = sys.argv[1]
section = open(sys.argv[2]).read()

p = root + '/docs/GAMEPLAY_DESIGN.md'
s = open(p).read()
a = s.index('## Chakra type: the elemental nature (decided 2026-10-21)')
b = s.index('## Language, sound and tips')
s = s[:a] + section + s[b:]

old_q = s[s.index('- Chakra types ("Chakra type" above): approve or change the burst-to-type'):s.index('## Three new jutsu (agreed 2026-10-20)')]
new_q = """- The Earth burst (Shattered Earth, "Chakra type" above): approve or redo it.
  It was drawn because Earth had none; Kenji is Earth (his answer 1), but the
  art itself waits for his yes.
- "A new ninja starts with low-rank ones only": which ranks may a new ninja
  take (D and C? up to B?), and what happens to the creator's S-rank slot, the
  A-rank picks (Chidori, Temple of Nirvana) and the clan secrets (all A)? Not
  built: today the nature gates the element, not the rank.
- Legends with a jutsu of a second element (Kaien's Fireball, Raiga's Earth
  Wall): kept as they are (a legend is a preset, not a creator pick; the Jutsu
  step marks the jutsu "no es de tu naturaleza"). Keep, or change them?
- Gaps the gate shows: Water has no S-rank jutsu (a Water ninja's S-rank slot
  offers only Yasaka no Magatama and Night Guy); Wind has one Element jutsu
  (Great Breakthrough), so its second Element slot takes a jutsu with no
  element.
- The explosive tag (Fire) and the mystical palm (Water) sit in the Utility
  slot and are not gated by the nature: confirm.
- The jutsu of Light (deity, angel and god) and of Void, Shadow and Spirit
  (demonic): to design when he says.

"""
s = s.replace(old_q, new_q)
open(p, 'w').write(s)
print('ok')
