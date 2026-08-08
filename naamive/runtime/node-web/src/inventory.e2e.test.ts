import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parsePackageInventoryFacts } from './inventory.js';

test('inventory parser reads only summarized dependency and engine facts', () => {
  const root = mkdtempSync(join(tmpdir(), 'naamive-inventory-'));
  try {
    const manifest = join(root, 'package.json');
    writeFileSync(manifest, JSON.stringify({ dependencies: { 'sample-tech': '1.2.3' }, engines: { node: '>=22 <23' }, secret: 'never read' }));
    assert.deepEqual(parsePackageInventoryFacts(manifest), [
      { source_path: 'package.json', detector_code: 'PACKAGE_DEPENDENCY', confidence: 0.95, value: 'SAMPLE_TECH' },
      { source_path: 'package.json', detector_code: 'PACKAGE_ENGINE', confidence: 0.8, value: 'NODEJS_22' }
    ]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('inventory parser rejects malformed and symlink manifests', () => {
  const root = mkdtempSync(join(tmpdir(), 'naamive-inventory-'));
  try {
    const malformed = join(root, 'package.json'); writeFileSync(malformed, '{');
    assert.throws(() => parsePackageInventoryFacts(malformed), /INVENTORY_REJECTED_MALFORMED_MANIFEST/);
    const target = join(root, 'target.json'); writeFileSync(target, '{}'); const link = join(root, 'linked.json'); symlinkSync(target, link);
    assert.throws(() => parsePackageInventoryFacts(link), /INVENTORY_REJECTED_UNSAFE_MANIFEST/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
