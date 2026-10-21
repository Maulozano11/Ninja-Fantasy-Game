// The painted art of each battle map (ground, backdrop) and the sprites that are part of the
// scenery but not of the map's props (the river bridge). Kept out of src/battle so the engine and
// its tests never import images.

import type { PropDef } from '../../battle/types';
import riverGround from '../../assets/maps/river_forest/ground.webp';
import riverBackdrop from '../../assets/maps/river_forest/backdrop.webp';
import riverMeta from '../../assets/maps/river_forest/map.json';

export interface MapArt {
  ground: string;
  backdrop: string;
  /** The backdrop scrolls this much slower than the ground; its top sits at this map y. */
  parallax: number;
  backdropTop: number;
  /** Scenery sprites drawn with the props (meters, like props). */
  extras: PropDef[];
  /** Colour behind everything (the sky above the backdrop). */
  sky: string;
}

const PXM = riverMeta.pxPerM;
const PZM = riverMeta.pxPerMDepth;
const bridgeX = riverMeta.bridge.anchorX / PXM;
const bridgeZ = (riverMeta.bridge.anchorY + 1 - riverMeta.backY) / PZM;

export const MAP_ART: Record<string, MapArt> = {
  river_forest: {
    ground: riverGround,
    backdrop: riverBackdrop,
    parallax: 0.3,
    backdropTop: riverMeta.backY - 560,
    sky: '#12221f',
    extras: [
      // The deck sorts with its back edge (ninjas on it stand in front), the front rail with its front.
      { id: 'bridge', group: 'bridge', name: 'bridge', x: bridgeX, z: bridgeZ, level: 0, sortZ: bridgeZ - 2.4 },
      { id: 'bridge_rail', group: 'bridge', name: 'bridge_rail_front', x: bridgeX, z: bridgeZ, level: 0, sortZ: bridgeZ + 0.05 },
    ],
  },
};
