import sys
p = sys.argv[1]
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:90]
    s = s.replace(a, b)


rep("""import { migrateCharacter, natureOf, sanitizeMissionFields } from '../rules/ninja';
""", """import { migrateCharacter, natureOf, sanitizeMissionFields } from '../rules/ninja';
import { fitLoadout, jutsuChoices, offNatureJutsus, type JutsuSwap } from '../rules/jutsuNature';
import { chakraNature, chakraType } from '../sprite/chakraNature';
import type { ChakraNature } from '../types/shinobi';
""")
rep("""  slotUltimate: { en: 'S-rank', es: 'Rango S' },
""", """  slotUltimate: { en: 'S-rank', es: 'Rango S' },
  natureRule: {
    en: 'Nature: {n}. The Element and S-rank slots offer {n} jutsu and jutsu with no element (taijutsu, kenjutsu, genjutsu).',
    es: 'Naturaleza: {n}. Las ranuras de Elemento y Rango S ofrecen jutsus de {n} y jutsus sin elemento (taijutsu, kenjutsu, genjutsu).',
  },
  natureRuleNone: {
    en: 'Nature: {n}. Its own jutsu will come later; for now it learns no elemental jutsu, only jutsu with no element (taijutsu, kenjutsu, genjutsu).',
    es: 'Naturaleza: {n}. Sus jutsus llegarán más adelante; por ahora no aprende jutsus elementales, solo jutsus sin elemento (taijutsu, kenjutsu, genjutsu).',
  },
  offNature: { en: 'not your nature', es: 'no es de tu naturaleza' },
  natureSwaps: {
    en: 'Now {n}: the jutsu of another element were changed. {list}.',
    es: 'Ahora {n}: se cambiaron los jutsus de otro elemento. {list}.',
  },
""")
rep("""  /** The appearance section open: the head brings the camera to the face, as in Baldur's Gate 3. */
  const [lookGroup, setLookGroup] = useState<AppearanceGroup>('body');
""", """  /** The appearance section open: the head brings the camera to the face, as in Baldur's Gate 3. */
  const [lookGroup, setLookGroup] = useState<AppearanceGroup>('body');
  /** The jutsu the last change of chakra type swapped, to tell the player (shown while that type stays). */
  const [natureSwaps, setNatureSwaps] = useState<{ nature: ChakraNature; swaps: JutsuSwap[] } | null>(null);
""")
rep("""    setCharacter({
      ...character,
      appearance: next,
      armorStyle,
      palette: { ...character.palette, chakraAuraColor: auraHex },
      ...derived,
    });
  };""", """    // The chakra type is the nature, and the nature decides the elemental jutsu: a new type swaps the
    // jutsu of another element for ones of its own (rules/jutsuNature.ts), and says which.
    const nature = chakraNature(next.chakra);
    const fitted = nature !== natureOf(character) ? fitLoadout(character.selectedJutsus, nature, character.clan) : null;
    if (fitted) setNatureSwaps(fitted.swaps.length ? { nature, swaps: fitted.swaps } : null);
    setCharacter({
      ...character,
      appearance: next,
      armorStyle,
      palette: { ...character.palette, chakraAuraColor: auraHex },
      ...(fitted ? { selectedJutsus: fitted.loadout } : {}),
      ...derived,
    });
  };""")
rep("""    const randomLook = randomAppearance();
    const randomArmor = armorStyleFor(randomLook);
""", """    const randomLook = randomAppearance();
    const randomArmor = armorStyleFor(randomLook);
    // Jutsu of its own nature: Element I and the S-rank of its element when there is one, Element II
    // any it may learn; the clan secret is its clan's.
    const nature = chakraNature(randomLook.chakra);
    const one = <J,>(xs: J[]): J => xs[Math.floor(Math.random() * xs.length)];
    const own = <J extends { nature: string }>(xs: J[]): J[] => (xs.some((j) => j.nature === nature) ? xs.filter((j) => j.nature === nature) : xs);
    const element1 = one(own(jutsuChoices('slot2Elemental', nature, randomClan)));
    const element2 = one(jutsuChoices('slot3Elemental', nature, randomClan).filter((j) => j.id !== element1.id));
    const ultimate = one(own(jutsuChoices('slot5Ultimate', nature, randomClan)));
""")
rep("""      dojutsu: randomDojutsu,
      stats: randomizedStats,
      appearance: randomLook,""", """      dojutsu: randomDojutsu,
      stats: randomizedStats,
      selectedJutsus: {
        ...character.selectedJutsus,
        slot2Elemental: element1.id,
        slot3Elemental: element2.id,
        slot4Clan: clanInfo.signatureJutsuId,
        slot5Ultimate: ultimate.id,
      },
      appearance: randomLook,""")
rep("""      ...derived,
    });
  };

  const handleExport = () => {""", """      ...derived,
    });
    setNatureSwaps(null);
  };

  const handleExport = () => {""")
rep("""    setImportError('');
    setCharacter(imported);
    setImportExportModal(false);""", """    setImportError('');
    setCharacter(imported);
    setNatureSwaps(null);
    setImportExportModal(false);""")
rep("""  // Filtered Jutsus
  const utilityJutsus = JUTSUS_DATA.filter((j) => j.category === 'Utility');
  const elementalJutsus = JUTSUS_DATA.filter((j) => j.category === 'Elemental');
  const clanJutsus = JUTSUS_DATA.filter((j) => j.category === 'Clan' && (!j.requiredClan || j.requiredClan === character.clan));
  const ultimateJutsus = JUTSUS_DATA.filter((j) => j.category === 'Ultimate');
""", """  // The jutsu each slot offers: the Element and S-rank slots only those of the ninja's nature, plus
  // the ones with no element (rules/jutsuNature.ts). A jutsu already chosen of another element (a
  // legend's second element, an older sheet) stays until the slot or the type is changed.
  const nature = natureOf(character);
  const offNature = new Set(offNatureJutsus(character.selectedJutsus, nature));
  const jutsuTitle = (id: string) => jutsuParts(JUTSUS_DATA.find((j) => j.id === id) ?? { name: id })[0];
  const natureSwapText =
    natureSwaps && natureSwaps.nature === nature
      ? T('natureSwaps', { n: L(nature), list: natureSwaps.swaps.map((x) => `${jutsuTitle(x.from)} → ${jutsuTitle(x.to)}`).join('; ') })
      : undefined;
""")
rep("""  const slots: { key: SlotKey; label: string; list: typeof JUTSUS_DATA; fixed?: boolean }[] = [
    { key: 'slot1Utility', label: T('slotUtility'), list: utilityJutsus },
    { key: 'slot2Elemental', label: T('slotElementA'), list: elementalJutsus },
    { key: 'slot3Elemental', label: T('slotElementB'), list: elementalJutsus },
    { key: 'slot4Clan', label: T('slotClan'), list: clanJutsus, fixed: true },
    { key: 'slot5Ultimate', label: T('slotUltimate'), list: ultimateJutsus },
  ];""", """  const slots: { key: SlotKey; label: string; list: typeof JUTSUS_DATA; fixed?: boolean }[] = [
    { key: 'slot1Utility', label: T('slotUtility'), list: jutsuChoices('slot1Utility', nature, character.clan) },
    { key: 'slot2Elemental', label: T('slotElementA'), list: jutsuChoices('slot2Elemental', nature, character.clan) },
    { key: 'slot3Elemental', label: T('slotElementB'), list: jutsuChoices('slot3Elemental', nature, character.clan) },
    { key: 'slot4Clan', label: T('slotClan'), list: jutsuChoices('slot4Clan', nature, character.clan), fixed: true },
    { key: 'slot5Ultimate', label: T('slotUltimate'), list: jutsuChoices('slot5Ultimate', nature, character.clan) },
  ];""")
rep("""              if (presetOf >= 0) setCharacter({ ...character, id: `ninja_${Date.now().toString(36)}` });
            }}""", """              if (presetOf >= 0) setCharacter({ ...character, id: `ninja_${Date.now().toString(36)}` });
              setNatureSwaps(null);
            }}""")
rep("""                soundManager.playCriticalHit();
                setCharacter(p.character);
              }}""", """                soundManager.playCriticalHit();
                setCharacter(p.character);
                setNatureSwaps(null);
              }}""")
rep("""      {step === 'jutsus' &&
        slots.map((slot) => {""", """      {step === 'jutsus' && (
        <div className="px-3 pb-2 space-y-1.5">
          <p className="text-[12px] leading-snug text-[#b9a98a]">{T(chakraType(nature).elemental ? 'natureRule' : 'natureRuleNone', { n: L(nature) })}</p>
          {natureSwapText && <p className="text-[12px] leading-snug text-[#f2c46d] border border-[#6b5434] bg-[#3a2a12]/60 px-2 py-1">{natureSwapText}</p>}
        </div>
      )}
      {step === 'jutsus' &&
        slots.map((slot) => {""")
rep("""                sub={chosen ? `${slot.label} · ${jutsuParts(chosen)[1]}` : slot.label}""", """                sub={
                  chosen ? (
                    <>
                      {`${slot.label} · ${jutsuParts(chosen)[1]}`}
                      {offNature.has(chosen.id) && <span className="text-[#e8956a]"> · {T('offNature')}</span>}
                    </>
                  ) : (
                    slot.label
                  )
                }""")
rep("""onPreviewStance={setPreviewStance} onGroup={setLookGroup} />""", """onPreviewStance={setPreviewStance} onGroup={setLookGroup} chakraNote={natureSwapText} />""")
open(p, 'w').write(s)
print('ok')
