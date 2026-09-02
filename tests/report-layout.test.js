const test = require('node:test');
const assert = require('node:assert/strict');
const layout = require('../js/report-layout.js');

test('dynamic flow gap is capped at 0.05 inch', () => {
  assert.equal(layout.MAX_DYNAMIC_GAP_IN, 0.05);
  assert.equal(layout.gapPxForPage(1547, 8.5), 1547 / 8.5 * 0.05);
  assert.ok(layout.gapPxForPage(1547, 8.5) < 10);
});

test('atomic rows move whole to the next page without overlap', () => {
  const result = layout.packAtomicRows([80, 90, 100], 210, 8);
  assert.deepEqual(result.map(p => p.indices), [[0, 1], [2]]);
  for (const page of result) {
    for (let i = 1; i < page.tops.length; i++) {
      const prev = page.tops[i - 1] + page.heights[i - 1];
      assert.ok(page.tops[i] >= prev);
      assert.ok(page.tops[i] - prev <= 8);
    }
    assert.ok(page.usedHeight <= 210);
  }
});

test('oversized row is rejected instead of being split', () => {
  assert.throws(() => layout.packAtomicRows([220], 210, 8), /exceeds page capacity/i);
});
