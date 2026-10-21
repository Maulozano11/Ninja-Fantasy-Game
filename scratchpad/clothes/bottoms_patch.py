p='/home/user/Ninja-Fantasy-Game/src/sprite/items/clothes.ts'
s=open(p).read()
a=s.index("/** Wide panel per leg from hip to hem (hakama): horizontal hem, straight-falling fabric. */")
b=s.index("export const BOTTOM_ITEMS: ItemDef[] = liftMain([")
new=open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/clothes/bottoms_helpers.ts.txt').read()
s=s[:a]+new+s[b:]
old='''function drapeLight(g: DrawCtx, slack: number): (x: number, y: number) => number {
  const leg = (u: number) => {
    const th = Math.asin(clamp(u, -1, 1)) + 0.12; // the front of the leg turns a little toward the facing side
    return Math.sin(th) * L3.x + Math.cos(th) * L3.z * 0.92 - 0.1 * L3.y;
  };'''
new2='''/** Light across cloth rounding over a leg, u = -1 on its left edge to 1 on its right edge. */
function hangLight(u: number): number {
  const th = Math.asin(clamp(u, -1, 1)) + 0.12; // the front of the leg turns a little toward the facing side
  return Math.sin(th) * L3.x + Math.cos(th) * L3.z * 0.92 - 0.1 * L3.y;
}

function drapeLight(g: DrawCtx, slack: number): (x: number, y: number) => number {
  const leg = hangLight;'''
assert old in s; s=s.replace(old,new2)
a=s.index("export const BOTTOM_ITEMS: ItemDef[] = liftMain([")
b=s.index("]);\n", a)
items=open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/clothes/bottoms_items.ts.txt').read()
s=s[:a]+items+s[b:]
open(p,'w').write(s)
print('ok')
