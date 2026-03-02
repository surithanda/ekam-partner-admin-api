/**
 * Cross-platform test file finder for node --test.
 * Usage: node tests/run.mjs [unit|integration|all]
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] || 'all';

function findTests(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findTests(full));
    } else if (entry.endsWith('.test.mjs')) {
      results.push(full);
    }
  }
  return results;
}

let files = [];
if (mode === 'unit' || mode === 'all') {
  files.push(...findTests(join(__dirname, 'unit')));
}
if (mode === 'integration' || mode === 'all') {
  files.push(...findTests(join(__dirname, 'integration')));
}

if (files.length === 0) {
  console.log('No test files found.');
  process.exit(0);
}

const quoted = files.map(f => `"${f}"`).join(' ');
const cmd = `node --test ${quoted}`;

try {
  execSync(cmd, { stdio: 'inherit', cwd: join(__dirname, '..') });
} catch (e) {
  process.exit(e.status || 1);
}
