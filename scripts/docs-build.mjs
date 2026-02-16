#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const docsDir = resolve(process.cwd(), 'docs');
rmSync(resolve(docsDir, '.astro'), { recursive: true, force: true });
rmSync(resolve(docsDir, 'dist'), { recursive: true, force: true });

execSync('bun run build', {
  cwd: docsDir,
  stdio: 'inherit',
});
