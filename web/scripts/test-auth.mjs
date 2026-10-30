import { mkdir, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const outfile = fileURLToPath(new URL('../node_modules/.tmp/auth-views-test.mjs', import.meta.url))
await mkdir(dirname(outfile), { recursive: true })
try {
  await build({
    entryPoints: [fileURLToPath(new URL('../tests/auth-views.test.tsx', import.meta.url))],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react/*', 'react-dom/*', 'firebase/*'],
    define: { 'import.meta.env': JSON.stringify({ BASE_URL: '/' }) },
    plugins: [{
      name: 'observe-auth-navigation',
      setup(plugin) {
        // Record the route requested by the real view; routing itself belongs to React Router.
        plugin.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'auth-test' }))
        plugin.onLoad({ filter: /.*/, namespace: 'auth-test' }, () => ({
          contents: `import React from 'react';
            export function Navigate({ to, replace }) { return React.createElement('span', { 'data-navigate': to, 'data-replace': String(Boolean(replace)) }); }
            export function Link({ to, state, children, ...props }) { return React.createElement('a', { href: to, ...props }, children); }`,
          loader: 'js',
        }))
      },
    }],
  })
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  await unlink(outfile).catch(() => {})
}
