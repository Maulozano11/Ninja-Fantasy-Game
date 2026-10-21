import re, json, numpy as np, sys
def load(path):
    s = open(path).read()
    size = json.loads(re.search(r'export const SIZE[^=]*=\s*(\[[^\]]*\])', s).group(1))
    anchor = json.loads(re.search(r'export const ANCHOR[^=]*=\s*(\[[^\]]*\])', s).group(1))
    alpha = json.loads(re.search(r'export const ALPHABET[^=]*=\s*("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')', s).group(1).replace("'", '"')) if False else None
    m = re.search(r"export const ALPHABET[^=]*=\s*(['\"])(.*?)\1;", s)
    alpha = m.group(2).encode().decode('unicode_escape')
    pal = re.findall(r"'(#[0-9a-fA-F]{8})'", s[s.index('PALETTE'):s.index('FRAMES')])
    fr_txt = s[s.index('export const FRAMES'):]
    out = {}
    for anim in re.findall(r"\n\s*(\w+): \[\n", fr_txt):
        pass
    return size, anchor, alpha, pal, s
