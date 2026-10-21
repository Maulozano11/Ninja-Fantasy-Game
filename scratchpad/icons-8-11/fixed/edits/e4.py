p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_6a85ff87-34d-1/tools/ui/ui-icons-23.ts'
s = open(p).read()


def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:80], s.count(old))
    s = s.replace(old, new)


rep("  pal.cw = +(process.env.QC ?? spec.qChroma ?? 1); // TEMP QC", "  pal.cw = spec.qChroma ?? 1;")
rep("const COVER: Cover = { thr: +(process.env.CV_THR ?? 0.06), minMass: +(process.env.CV_MASS ?? 6), add: +(process.env.CV_ADD ?? 20), cw: +(process.env.CV_CW ?? 2), wl: +(process.env.CV_WL ?? 0.6) };",
    """// A colour is lost when its nearest entry is 0.06 away (OKLab, hue and chroma counted twice, lightness
// 0.6: the k-means ramp has the lightness steps, what it misses is hues); a group needs the weight of six
// 88 pixels (a 44 pixel counts four); up to 20 entries. Each icon's entries are listed in its manifest
// (paletteCovered).
const COVER: Cover = { thr: 0.06, minMass: 6, add: 20, cw: 2, wl: 0.6 };""")

# The manifest: the entries the coverage added (sheets 8 to 11 only, so sheets 2 to 7 stay as they were).
rep("""        paletteDetailOnly: b.pal.rgb.filter((_, i) => b.pal.spare[i]).map(toHex),""",
    """        paletteDetailOnly: b.pal.rgb.filter((_, i) => b.pal.spare[i]).map(toHex),
        ...(b.spec.cover ? { paletteCovered: b.covered.map(toHex) } : {}),""")
rep("""    (built.some((b) => +b.spec.sheet >= 8) ? '. Sheets 8 to 11 use no bilateral filter (it lightened his dark figures into his ground)' : '') +""",
    """    (built.some((b) => +b.spec.sheet >= 8)
      ? ". Sheets 8 to 11 use no bilateral filter (it lightened his dark figures into his ground), and their palettes give his rare colours a slot each: after the k-means, every colour of the 44's and the 88's pictures still far from the palette in hue (his skin, his violet chains, a dragon's teeth, his greys and whites) is grouped and the group missed most gets its own entry, his nearest real colour, up to 20 (paletteCovered); his thin marks of one colour (skin, violet chains, embers, teeth, mouth cores, foam) are kept by colour rules"
      : '') +""")

# Header: how an icon is made, step 2, for sheets 8 to 11.
rep("""//     picture (his whitest core, a spark). One palette per icon, used at both sizes. No dither.""",
    """//     picture (his whitest core, a spark). One palette per icon, used at both sizes. No dither.
//     Sheets 8 to 11 add his rare colours (coverPalette): the k-means follows how much of the picture
//     a colour covers, so a small part of another hue (his ninjas' skin, his violet chains, a dragon's
//     teeth, the white of his spray) went to the nearest entry in lightness, of the wrong hue.""")
open(p, 'w').write(s)
print('ok')
