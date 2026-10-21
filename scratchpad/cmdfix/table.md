Counted on the integration branch as lines in `src` (without `src/assets`) that match the term,
case-insensitive. A two-word term also matches with `_` or `-` between the words (`body_flicker`).
Generated art in `src/assets` adds more (icon files and manifests such as `rasengan.png`).

| Term | Lines | Where |
|---|---|---|
| sharingan | 31 | shinobiData 13, types/shinobi 5, CharacterCreator 3, campActivities 2, rules/rest 2, battle.test, ArenaSandbox, CampaignMode, RestCamp, ruleText, legacy |
| byakugan | 15 | CharacterCreator 4, RestCamp 2, campActivities 2, shinobiData 2, types 2, CampaignMode, rest, legacy |
| mangekyo / kamui / amaterasu / susanoo | 7 / 2 / 4 / 4 | shinobiData, types, legacy, CharacterCreator |
| rasengan / rasenshuriken | 5 / 7 | shinobiData, types, legacy, units, BattleScreen, jutsu.ts |
| chidori / raikiri | 22 / 1 | shinobiData 8, battle.test 6, units 2, others |
| kirin | 16 | shinobiData 6, battle.test 5, vfxSprites 2, others |
| hokage / akatsuki / konoha | 3 / 3 / 3 | types, legacy, shinobiData (Konoha Senpuu) |
| kage (whole word) | 1 | shinobiData (Kage Bunshin) |
| eight gates | 6 | shinobiData (Taijutsu class text, feat `eight_gates_initiate`) |
| shadow clone | 7 | shinobiData 4, BattleScreen, battle/types, jutsu |
| kawarimi | 66 | engine 20, battle.test 10, shinobiData 7, battle/types 6, others (a core reaction) |
| shunshin / body flicker | 3 / 20 | shinobiData, battle.test, units, jutsu, BattleScreen (ids `body_flicker`) |
| goukakyu / suiryuudan / doryuudan / doryuheki / suijinheki / mikazuki | 33 / 6 / 5 / 11 / 9 / 1 | jutsu ids such as `fireball_goukakyu` |
| uchiha / hyuga / senju / uzumaki | 3 / 3 / 4 / 3 | old-clan migration in `rules/ninja.ts` + tests (Uddo and Akkai there are not Naruto names) |
| taki (whole word or `taki_`) | 11 | `taki_sixtyfour_palms` and the old clan Taki |
| Naruto character names (whole words: naruto, sasuke, kakashi, itachi, madara, hashirama, tobirama, hinata, neji, gaara, jiraiya, tsunade, orochimaru, minato, obito, shisui, kushina, nagato, kisame, deidara) | 28 | shinobiData 13, types 7, legacy 7, units 1 |
| tomoe / pinwheel / pale eye(s) | 26 | shinobiData 8, sprite/body 7, types 3, legacy 3, others (`katana.ts` 2 and `words.ts` 1 are a heraldic guard, fine) |
| sage eye(s) | 5 | shinobiData, types, CharacterCreator |
| kurama / tailed beast(s) | 5 | CampaignMode 3, ArenaSandbox, shinobiData |
| chunin / genin / jonin / ANBU | 10 / 3 / 23 / 6 | rules.test, Arena, Campaign, battle.test and units (`jonin` enemy kind id), armor, legacy |
| tenketsu | 11 | shinobiData, campActivities, rest, effects, RestCamp |
