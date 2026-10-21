// Prints the bottom rows of a plant sheet's first frame as characters (for checking the base).
import { readFileSync } from 'node:fs';
const man = JSON.parse(readFileSync('/home/user/Ninja-Fantasy-Game/src/assets/world/plants/manifest.json', 'utf8'));
const name = process.argv[2];
const s = man.sprites[name];
console.log(name, s.frameW, s.frameH, s.anchor);
