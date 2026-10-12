// Chakra colors offered in the creator (rainbow order + white and black).
// The burst animations themselves live in chakra.ts.

import type { ChakraColorId } from './types';

export interface ChakraChoice {
  id: ChakraColorId;
  name: string;
  hex: string;
  burst: string;
  desc: string;
}

export const CHAKRA_CHOICES: ChakraChoice[] = [
  { id: 'red', name: 'Crimson', hex: '#ef4444', burst: 'Flame Aura', desc: 'Flames lick upward from your silhouette.' },
  { id: 'orange', name: 'Ember', hex: '#f97316', burst: 'Ember Nova', desc: 'Exploding embers and a shockwave ring.' },
  { id: 'yellow', name: 'Thunder', hex: '#facc15', burst: 'Storm Crackle', desc: 'Jagged lightning arcs around your body.' },
  { id: 'green', name: 'Gale', hex: '#22c55e', burst: 'Leaf Cyclone', desc: 'A spiral of wind and leaves.' },
  { id: 'blue', name: 'Tide', hex: '#3b82f6', burst: 'Rising Tide', desc: 'Rippling water and droplets rise.' },
  { id: 'indigo', name: 'Shade', hex: '#6366f1', burst: 'Shadow Veil', desc: 'Drifting tendrils of shadow smoke.' },
  { id: 'violet', name: 'Spirit', hex: '#a855f7', burst: 'Phantom Guardian', desc: 'A ghostly warrior looms behind you.' },
  { id: 'white', name: 'Radiant', hex: '#f8fafc', burst: 'Heaven Pillar', desc: 'Rays and a pillar of pure light.' },
  { id: 'black', name: 'Void', hex: '#18181b', burst: 'Void Rift', desc: 'Black orbs orbit through dark cracks.' },
];
