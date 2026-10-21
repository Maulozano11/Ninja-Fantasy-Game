import sys
p = sys.argv[1]
s = open(p).read()
old = "import { migrateCharacter, sanitizeMissionFields } from '../rules/ninja';\n"
assert old in s
s = s.replace(old, "import { migrateCharacter, natureOf, sanitizeMissionFields } from '../rules/ninja';\n", 1)
old = "  chakraMax: { en: 'Chakra', es: 'Chakra' },\n"
assert old in s
s = s.replace(old, old + "  nature: { en: 'Nature', es: 'Naturaleza' },\n", 1)
old = """      ))}
    </div>
  );

  const detail = (() => {"""
assert old in s
s = s.replace(old, """      ))}
      {/* The chakra type picked in Appearance > Chakra is the ninja's elemental nature. */}
      <div className="col-span-3 flex items-baseline justify-center gap-2 border border-[#3d3122] bg-black/30 px-1 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-[#b9a98a]">{T('nature')}</span>
        <span style={serif} className="text-base font-bold text-[#f2c46d]">
          {L(natureOf(character))}
        </span>
      </div>
    </div>
  );

  const detail = (() => {""", 1)
open(p, 'w').write(s)
print('ok')
