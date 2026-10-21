"""Exec the converter up to a marker into a namespace, for experiments."""
import sys
SRC='/home/user/Ninja-Fantasy-Game/tools/refs/crows-from-ref.py'
def load(marker="# --- his pictures' pieces (key frames)", src=None, out='/dev/null'):
    code=open(src or SRC,encoding='utf-8').read()
    if marker:
        code=code.split(marker)[0]
    ns={'__name__':'crows_exp'}
    old=sys.argv
    sys.argv=['x','/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg',out]
    try:
        exec(compile(code,src or SRC,'exec'),ns)
    finally:
        sys.argv=old
    return ns
