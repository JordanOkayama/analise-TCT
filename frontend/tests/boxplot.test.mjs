import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Execute the actual TypeScript calculation without adding a test framework.
const source = readFileSync(new URL("../src/lib/boxplot.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { scoreBox } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("even sample: average the two central scores, including within halves", () => {
  const values = [8, 1, 7, 2, 6, 3, 5, 4];
  assert.deepEqual(scoreBox(values), {
    q1: 2.5, median: 4.5, q3: 6.5, iqr: 4,
    lowerFence: -3.5, upperFence: 12.5,
    lowerWhisker: 1, upperWhisker: 8, outliers: []
  });
  assert.deepEqual(values, [8, 1, 7, 2, 6, 3, 5, 4]);
  assert.equal(scoreBox(Array.from({ length: 34 }, (_, i) => i + 1)).median, 17.5);
});

test("odd sample: exclude central observation from both halves", () => {
  assert.deepEqual(scoreBox([1, 2, 3, 4, 5, 6, 7, 8, 9]), {
    q1: 2.5, median: 5, q3: 7.5, iqr: 5,
    lowerFence: -5, upperFence: 15,
    lowerWhisker: 1, upperWhisker: 9, outliers: []
  });
});

test("outliers do not extend the whiskers", () => {
  assert.deepEqual(scoreBox([1, 2, 3, 4, 5, 6, 7, 30]), {
    q1: 2.5, median: 4.5, q3: 6.5, iqr: 4,
    lowerFence: -3.5, upperFence: 12.5,
    lowerWhisker: 1, upperWhisker: 7, outliers: [30]
  });
  const both = scoreBox([0, 8, 9, 10, 10, 11, 12, 30]);
  assert.deepEqual(both.outliers, [0, 30]);
  assert.equal(both.lowerWhisker, 8);
  assert.equal(both.upperWhisker, 12);
});

test("fence equality is not an outlier", () => {
  const result = scoreBox([0, 3, 3, 4, 4, 5, 5, 8]);
  assert.equal(result.lowerFence, 0);
  assert.equal(result.upperFence, 8);
  assert.deepEqual(result.outliers, []);
});

test("zero IQR keeps repeated outliers as separate observations", () => {
  const result = scoreBox([0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 10]);
  assert.equal(result.iqr, 0);
  assert.equal(result.lowerWhisker, 5);
  assert.equal(result.upperWhisker, 5);
  assert.deepEqual(result.outliers, [0, 0, 10, 10]);
});

test("empty, singleton, two observations and constant samples", () => {
  assert.equal(scoreBox([]), null);
  for (const values of [[5], [5, 5, 5, 5], [5, 5, 5]]) {
    assert.deepEqual(scoreBox(values), {
      q1: 5, median: 5, q3: 5, iqr: 0,
      lowerFence: 5, upperFence: 5,
      lowerWhisker: 5, upperWhisker: 5, outliers: []
    });
  }
  assert.deepEqual(scoreBox([2, 8]), {
    q1: 2, median: 5, q3: 8, iqr: 6,
    lowerFence: -7, upperFence: 17,
    lowerWhisker: 2, upperWhisker: 8, outliers: []
  });
  assert.equal(scoreBox([1, 2, 3]).median, 2);
});
