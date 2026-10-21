"""Gives Warp Strike and Command the owner's Spanish names (Golpe Warp, Comando). Run from the worktree root."""
edits = {
    'src/battle/jutsu.ts': [
        ("""    name: 'Warp Strike',
    nameEs: 'Warp Strike',""", """    name: 'Warp Strike',
    nameEs: 'Golpe Warp',"""),
        ("""    name: 'Command',
    nameEs: 'Command',""", """    name: 'Command',
    nameEs: 'Comando',"""),
    ],
    'src/components/battle/BattleScreen.tsx': [
        ("""  ryusei_warp: ['Warp', 'Warp'],""", """  ryusei_warp: ['Warp', 'Golpe Warp'],"""),
        ("""  northstar_command: ['Command', 'Command'],""", """  northstar_command: ['Command', 'Comando'],"""),
    ],
    'src/components/battle/battleText.ts': [
        ("""Warp Strike salta a uno, incluso a través de muros; Intercambio Espacial""", """Golpe Warp salta a uno, incluso a través de muros; Intercambio Espacial"""),
        ("""(tus aliados no). Command pone a un esbirro de tu lado""", """(tus aliados no). Comando pone a un esbirro de tu lado"""),
    ],
    'src/data/shinobiData.ts': [
        ("""(tres como máximo; el más antiguo se va). Warp Strike (acción adicional, 2 chakra, 18 m)""", """(tres como máximo; el más antiguo se va). Golpe Warp (acción adicional, 2 chakra, 18 m)"""),
        ("""pierden la mitad del movimiento que les queda (los aliados no). Command (acción, 4 chakra, 9 m)""", """pierden la mitad del movimiento que les queda (los aliados no). Comando (acción, 4 chakra, 9 m)"""),
    ],
    'src/battle/battle.test.ts': [
        ("""    // Warp Strike and Command stay in English in both languages.
    assert.equal(es('ryusei_warp'), 'Warp Strike');
    assert.equal(es('northstar_command'), 'Command');""",
         """    // Warp Strike and Command take the owner's Spanish names from his icon sheets (2026-10-21).
    assert.equal(es('ryusei_warp'), 'Golpe Warp');
    assert.equal(es('northstar_command'), 'Comando');
    assert.equal(JUTSU.ryusei_warp.name, 'Warp Strike');
    assert.equal(JUTSU.northstar_command.name, 'Command');"""),
    ],
}
for path, reps in edits.items():
    s = open(path, encoding='utf8').read()
    for a, b in reps:
        assert s.count(a) == 1, (path, a[:50])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf8').write(s)
print('ok')
