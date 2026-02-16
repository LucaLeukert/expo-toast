#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');

const readmePath = resolve(root, 'README.md');
const changelogPath = resolve(root, 'CHANGELOG.md');
const outReadmePath = resolve(root, 'docs/src/content/docs/reference/readme.mdx');
const outChangelogPath = resolve(root, 'docs/src/content/docs/reference/changelog.mdx');

function normalize(content) {
  return `${content.replace(/\r\n/g, '\n').trimEnd()}\n`;
}

function stripH1(content) {
  const normalized = normalize(content);
  return normalized.replace(/^#\s+.*\n+/, '');
}

function renderDoc(title, description, sourceContent, slug) {
  const slugLine = slug ? `slug: ${slug}\n` : '';
  return normalize(
    `---\ntitle: ${title}\ndescription: ${description}\n${slugLine}---\n\n${sourceContent}`,
  );
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function syncOne(inputPath, outputPath, title, description, slug) {
  const source = readFileSync(inputPath, 'utf8');
  const body = stripH1(source);
  const rendered = renderDoc(title, description, body, slug);

  ensureDir(outputPath);

  if (checkOnly) {
    let current = '';
    try {
      current = readFileSync(outputPath, 'utf8');
    } catch {
      throw new Error(`Missing synced doc: ${outputPath}`);
    }

    if (normalize(current) !== rendered) {
      throw new Error(`Out-of-sync doc: ${outputPath}. Run \`bun run docs:sync\`.`);
    }
    return;
  }

  writeFileSync(outputPath, rendered);
}

try {
  syncOne(
    readmePath,
    outReadmePath,
    'README',
    'Synced from repository root README.md',
    'reference/readme',
  );
  syncOne(
    changelogPath,
    outChangelogPath,
    'Changelog',
    'Synced from repository root CHANGELOG.md',
    'reference/changelog',
  );
  if (!checkOnly) {
    console.log('Synced docs from README.md and CHANGELOG.md');
  }
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
