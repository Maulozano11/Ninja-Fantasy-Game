// Local only (not committed): the dev server for captures, with its own dependency cache.
import base from './vite.config';
export default (env: any) => ({ ...(base as any)(env), cacheDir: '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw/fugaz/work/vite-cache' });
