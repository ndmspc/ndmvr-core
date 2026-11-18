import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HistogramPointerClass } from "../src/core/histogram-pointer-class.js";

const asset = (name) =>
  JSON.parse(readFileSync(new URL(`../src/assets/histograms/nested/${name}`, import.meta.url), "utf8"));

/** The index of the first non-empty bin of a level, so a test does not depend on where the data sits. */
function firstBin(node) {
  const content = node?.children?.content ?? [];
  return content.findIndex((one) => one !== null && one !== undefined);
}

test("exportPath reads the level a pointer stands on, entry by entry", () => {
  const tree = asset("nested_2lvl.json");
  const pointer = new HistogramPointerClass(tree);

  assert.deepEqual(pointer.exportPath(), [], "a fresh pointer is at the root");

  const bin = firstBin(tree);
  pointer.setOriginToChild([bin], null, []);
  assert.deepEqual(pointer.exportPath(), [{ bin, set: null }]);
  assert.notEqual(pointer.origin, tree, "it has walked down a level");
});

test("pathTo walks a fresh pointer back to the level an old one stood on", () => {
  const bin = firstBin(asset("nested_3lvl.json"));
  const before = new HistogramPointerClass(asset("nested_3lvl.json"));
  before.setOriginToChild([bin], null, []);
  const path = before.exportPath();
  const level = before.origin;

  // The same drawing again, as `updateHistogram` builds it: a new pointer, at the root.
  const after = new HistogramPointerClass(asset("nested_3lvl.json"));
  assert.equal(after.origin, after.rootObj);

  assert.equal(after.pathTo(path), true);
  assert.notEqual(after.origin, after.rootObj, "back on the level the reader was looking at");
  assert.equal(after.origin.fName, level.fName);
  assert.deepEqual(after.exportPath(), path);
});

test("pathTo carries the set the walk went through", () => {
  // A level whose children are sets rather than `content`: [[entries],[mean],[sigma]]-style.
  const tree = asset("test_125.json");
  const set = Object.keys(tree.children).find((key) => key !== "content");
  const bin = tree.children[set].findIndex((one) => one !== null && one !== undefined);

  const before = new HistogramPointerClass(tree);
  before.setOriginToChild([bin], set, []);
  const path = before.exportPath();

  assert.deepEqual(path, [{ bin, set }], "the set is part of the path");

  const after = new HistogramPointerClass(asset("test_125.json"));
  assert.equal(after.pathTo(path), true);
  assert.equal(after.isOnSet, set);
});

test("a pointer at the root restores from an empty path without moving", () => {
  const pointer = new HistogramPointerClass(asset("nested_2lvl.json"));

  assert.equal(pointer.pathTo([]), true);
  assert.equal(pointer.pathTo(undefined), true);
  assert.equal(pointer.origin, pointer.rootObj);
});

test("pathTo stops where the new drawing is shallower", () => {
  // One level down in the three-level drawing, restored onto a drawing that has only two levels.
  const deep = new HistogramPointerClass(asset("nested_3lvl.json"));
  const bin = firstBin(asset("nested_3lvl.json"));
  deep.setOriginToChild([bin], null, []);
  deep.setOriginToChild([firstBin(deep.origin)], null, []);
  const path = deep.exportPath();
  assert.equal(path.length, 2);

  const shallow = new HistogramPointerClass(asset("nested_2lvl.json"));
  shallow.pathTo(path);

  // It went as far as the drawing allows rather than refusing the whole walk, so the reader sees the deepest
  // level that exists instead of the root.
  assert.notEqual(shallow.origin, shallow.rootObj);
  assert.equal(shallow.exportPath().length, 1);
});
