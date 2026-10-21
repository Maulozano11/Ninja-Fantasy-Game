import json, sys
items = {"hands": {"id": "hands_noble_fingerless", "colors": []}, "feet": {"id": "feet_noble_boots", "colors": []}}
sword = dict(items, held={"id": "held_flame_sword", "colors": []})
looks = {"sw": {"slots": sword}, "bare": {"slots": items}}
for st in ["book", "sphere", "lightning", "wave", "flash", "script", "signs"]:
    looks["c_" + st] = {"slots": sword, "cast": {"style": st}}
for b in ["female", "bulky", "slender"]:
    looks[b] = {"body": b, "slots": sword}
frames = {"idle": 1, "handsigns": 3, "attack": 3, "cast": 2, "hurt": 2, "victory": 2, "charge": 2, "walk": 8, "run": 6,
          "crouch": 2, "sneak": 6, "downed": 2, "lean": 4, "sit": 4, "read": 12, "train": 8}
shots = []
for p, n in frames.items():
    for f in range(n):
        shots.append(["sw", p, f])
for p in ["idle", "train", "handsigns", "cast", "read"]:
    for f in range(frames[p] if p != "read" else 3):
        shots.append(["bare", p, f])
for st in ["book", "sphere", "lightning", "wave", "flash", "script", "signs"]:
    for f in range(2):
        shots.append(["c_" + st, "cast", f])
for b in ["female", "bulky", "slender"]:
    for p, f in [("idle", 0), ("walk", 2), ("walk", 6), ("run", 2), ("attack", 1), ("crouch", 0), ("sit", 0), ("cast", 0), ("handsigns", 0), ("downed", 0)]:
        shots.append([b, p, f])
json.dump({"looks": looks, "shots": shots}, open(sys.argv[1], "w"), indent=1)
print(len(shots))
