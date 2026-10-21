// The worktree's own Vite config with its own dependency cache (node_modules is a symlink to the
// main checkout's, so the default cache would be shared with it).
import base from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-1/vite.config.ts';

export default (env) => ({
  ...base(env),
  root: '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-1',
  cacheDir: '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions/vite-cache',
});
