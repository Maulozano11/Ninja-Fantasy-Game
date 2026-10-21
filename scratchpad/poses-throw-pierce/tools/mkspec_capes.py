import json
S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce/tools/'
items = [('cape', 'cape_haori'), ('cape', 'cape_knight'), ('cape', 'cape_rogue'), ('cape', 'cape_traveler'), ('cape', 'cape_scarf'), ('cape', 'cape_rose'), ('cape', 'cape_crimson'), ('cape', 'cape_shadow'), ('top', 'top_royalcoat'), ('top', 'top_kimono'), ('bottom', 'bottom_hakama'), ('skirt', 'skirt_imperial'), ('skirt', 'skirt_apron'), ('skirt', 'skirt_tassets'), ('skirt', 'skirt_kilt')]
specs = []
for slot, i in items:
    specs.append({"key": i, "body": "male", "held": "held_katana", "pose": "attack", "frames": [1], "slots": {slot: {"id": i}}})
    specs.append({"key": i, "body": "male", "held": "held_katana", "pose": "throw", "frames": [1, 2, 3], "slots": {slot: {"id": i}}})
    specs.append({"key": i, "body": "male", "held": "held_katana", "pose": "pierce", "frames": [1, 2], "slots": {slot: {"id": i}}})
json.dump(specs, open(S + 'spec_capes.json', 'w'))
