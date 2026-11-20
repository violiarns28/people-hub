import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Characters that read as machine-written copy. Plain ASCII punctuation is used instead. */
const FORBIDDEN = /[—–…“”‘’·]/;
const SCANNED = /\.(ts|html|css)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('typography', () => {
  it('uses no em dash, en dash, ellipsis char, curly quotes or middle dot in source', () => {
    const offenders = ['src', 'e2e']
      .flatMap((root) => walk(join(process.cwd(), root)))
      .filter((file) => SCANNED.test(file) && !file.endsWith('typography.spec.ts'))
      .filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
