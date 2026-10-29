// A stand-in for `npm run dev` in this sandbox (no vite, no lucide-react, no npm registry): the game
// bundled with esbuild and its CSS compiled with tailwind 4 (both from the machine's global tools).
// lucide icons become plain stubs; Vite's import.meta.glob is expanded at build time.
//   node build.mjs <repo> <outdir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require('/opt/npm-tools/node_modules/esbuild');
const tw = require('/opt/npm-tools/node_modules/tailwindcss/dist/lib.js');
const [repo, out] = process.argv.slice(2);
const SRC = path.join(repo, 'src');
fs.mkdirSync(out, { recursive: true });

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const code = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f));

// --- lucide-react: every name imported anywhere, as a small square icon ---------------------------
const names = new Set();
for (const f of code) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g))
    for (const n of m[1].split(',')) if (n.trim()) names.add(n.trim().split(/\s+as\s+/)[0]);
}
const lucide = `import React from 'react';
const mk = (n) => (p) => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', className: p.className, 'data-icon': n }, React.createElement('rect', { x: 3, y: 3, width: 10, height: 10, rx: 2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }));
${[...names].map((n) => `export const ${n} = mk('${n}');`).join('\n')}`;

// --- import.meta.glob → generated imports ---------------------------------------------------------
function globToRe(pattern) {
  return new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$');
}
const globPlugin = {
  name: 'glob',
  setup(b) {
    b.onLoad({ filter: /\.(tsx?)$/ }, (args) => {
      let text = fs.readFileSync(args.path, 'utf8');
      if (!text.includes('import.meta.glob') && !text.includes('import.meta.env')) return;
      const dir = path.dirname(args.path);
      let n = 0;
      const head = [];
      text = text.replace(/import\.meta\.glob\(\s*'([^']+)'[^)]*\)/g, (_, pat) => {
        const abs = path.resolve(dir, pat);
        const re = globToRe(abs);
        const base = abs.slice(0, abs.indexOf('*'));
        const root = base.slice(0, base.lastIndexOf('/'));
        const files = fs.existsSync(root) ? walk(root).filter((f) => re.test(f)) : [];
        const entries = files.map((f) => {
          const id = `__g${n++}`;
          head.push(`import ${id} from ${JSON.stringify(f)};`);
          const rel = './' + path.relative(dir, f);
          return `${JSON.stringify(rel.startsWith('./..') ? rel.slice(2) : rel)}: ${id}`;
        });
        return `({${entries.join(',')}})`;
      });
      text = text.replace(/import\.meta\.env\.DEV/g, 'true');
      return { contents: head.join('\n') + '\n' + text, loader: args.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: dir };
    });
  },
};
const stubs = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'stub' }));
    b.onLoad({ filter: /^lucide$/, namespace: 'stub' }, () => ({ contents: lucide, loader: 'jsx', resolveDir: repo }));
    b.onResolve({ filter: /\.css$/ }, () => ({ path: 'css', namespace: 'stub' }));
    b.onLoad({ filter: /^css$/, namespace: 'stub' }, () => ({ contents: '', loader: 'js' }));
    b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (a) => ({ path: require.resolve(a.path, { paths: [path.join(repo, 'node_modules')] }) }));
  },
};

await esbuild.build({
  entryPoints: [path.join(SRC, 'main.tsx')],
  bundle: true,
  outdir: out,
  format: 'esm',
  jsx: 'automatic',
  loader: { '.png': 'file', '.webp': 'file', '.jpg': 'file', '.jpeg': 'file', '.gif': 'file', '.mp3': 'file', '.ogg': 'file', '.wav': 'file' },
  assetNames: 'assets/[name]-[hash]',
  publicPath: '/',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [stubs, globPlugin],
  logLevel: 'warning',
});

// --- the CSS: tailwind over every class-like token in the sources ---------------------------------
const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8').replace(/@import url\([^)]*\);/g, '');
const twDir = '/opt/npm-tools/node_modules/tailwindcss';
const compiler = await tw.compile(css, {
  base: SRC,
  loadStylesheet: async (id, base) => {
    const file = id === 'tailwindcss' ? path.join(twDir, 'index.css') : id.startsWith('tailwindcss/') ? path.join(twDir, id.slice(12)) : path.resolve(base, id);
    const f = fs.existsSync(file) ? file : file + '.css';
    return { path: f, base: path.dirname(f), content: fs.readFileSync(f, 'utf8') };
  },
});
const cand = new Set();
for (const f of code) for (const m of fs.readFileSync(f, 'utf8').matchAll(/[A-Za-z0-9_\-:\[\]\/\.#%(),!@&>~+=*'"]+/g)) for (const t of m[0].split(/["'`]/)) if (t) cand.add(t);
fs.writeFileSync(path.join(out, 'main.css'), compiler.build([...cand]));
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>`,
);
console.log('built', names.size, 'lucide stubs,', cand.size, 'candidates');
