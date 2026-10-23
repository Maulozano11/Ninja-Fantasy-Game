// Every battle map, registered by id.

import { registerMap } from '../map';
import { RIVER_FOREST } from './riverForest';
import { HEIGHT_TEST } from './heightTest';

registerMap(RIVER_FOREST);
registerMap(HEIGHT_TEST);

export { RIVER_FOREST, HEIGHT_TEST };
