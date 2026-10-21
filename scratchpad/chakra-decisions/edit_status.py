import sys
p = sys.argv[1] + '/docs/STATUS.md'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:90]
    s = s.replace(a, b)


rep("""| Chakra | 9 types, which are the ninja's elemental nature (Fire with 2 bursts, Water, Wind, Lightning, Earth; Shadow, Spirit, Light, Void without element), any colour for any type; 8 cast styles ("eye" hidden) |""",
    """| Chakra | 9 types, which are the ninja's elemental nature: 7 offered (Fire with 2 bursts, Water, Wind, Lightning, Earth; Light and Void without element) and 2 pending, out of the selection (Shadow, Spirit); any colour for any type; 8 cast styles ("eye" hidden) |""")

rep("""  S-rank. Battle-only: 8 clan abilities and the hydra's Venom spit and Roar.
""", """  S-rank. Battle-only: 8 clan abilities and the hydra's Venom spit and Roar.
- The nature gates the elemental jutsu in the creator (`chakra/decisions`, 2026-10-21): the Element
  and S-rank slots offer only the ninja's own element plus the jutsu with no element; Utility and
  the clan secret are free; Light and Void get no elemental jutsu yet (`src/rules/jutsuNature.ts`).
""")

rep("""| `worktree-*` | not on origin (local `6e2e8dc`) | Agent worktree leftovers | Stale |""",
    """| `chakra/decisions` | not pushed (local) | The owner's four answers on the chakra types (saved legends updated, Shadow and Spirit pending, Cinder Nova kept) and the nature gating the elemental jutsu in the creator | **For review** |
| `worktree-*` | not on origin (local `6e2e8dc`) | Agent worktree leftovers | Stale |""")

a = s.index('- `chakra/nature` (2026-10-21): the chakra type is the nature (his rule, built).')
b = s.index('- Decided 2026-10-21 (later): Warp Strike is renamed')
s = s[:a] + """- Chakra types (`docs/GAMEPLAY_DESIGN.md`, "Chakra type" and Open questions). **Decided
  2026-10-21** (his answers, built on `chakra/decisions`): the legends keep their new types; saved
  copies of the legends and companions move to their new type when they load; Shadow and Spirit
  are pending (out of the creator and the random ninja), Light and Void stay with their jutsu pending
  (Light: deity, angel and god; Void, Shadow and Spirit: demonic); Cinder Nova stays as a second Fire
  burst. **Still his:** approve or redo the Earth burst art (Shattered Earth); which ranks a new
  ninja may take ("low-rank ones only", not built); Kaien's Fireball and Raiga's Earth Wall (kept);
  Water has no S-rank jutsu and Wind one Element jutsu; the explosive tag and mystical palm stay
  ungated in Utility.
""" + s[b:]

a = s.index('### 4c. Elemental nature gates jutsu')
b = s.index('### 4d.')
s = s[:a] + """### 4c. Elemental nature gates jutsu
Built on `chakra/decisions` (2026-10-21): the chakra type picked in Appearance > Chakra is the
nature (`natureOf`, `src/rules/ninja.ts`), and in the creator's Jutsu step the Element I, Element II
and S-rank slots offer only jutsu of the ninja's element plus the ones with no element (taijutsu,
kenjutsu, genjutsu); Utility and the clan secret are not gated; Light and Void get no elemental
jutsu until their own exist. Changing the type swaps the jutsu of another element (lowest rank of
the new element first) and says which; a sheet's own off-nature jutsu (Kaien's Fireball, Raiga's
Earth Wall, older or imported sheets) stay, marked. The random ninja picks jutsu of its nature.
Enemies and battles are untouched. Left: the rank cap for a new ninja ("low-rank ones only"; the
owner decides which ranks), the jutsu of Light and Void (and later Shadow and Spirit), a Water
S-rank, a second Wind jutsu.

""" + s[b:]
open(p, 'w').write(s)
print('ok')
