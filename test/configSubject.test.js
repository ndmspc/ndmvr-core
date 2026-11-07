import assert from "node:assert/strict";
import test from "node:test";

import { histogramPadIdsOf } from "../src/utils/padIds.js";

test("a pad array answers with its ids, in order", () => {
  assert.deepEqual(
    histogramPadIdsOf([{ id: "left", position: {} }, { id: "right", position: {} }]),
    ["left", "right"],
  );
});

test("a grid recipe expanded by parseConfig answers with every pad it made", () => {
  const pads = Array.from({ length: 4 }, (_, index) => ({ id: `pad${index + 1}` }));
  assert.deepEqual(histogramPadIdsOf(pads), ["pad1", "pad2", "pad3", "pad4"]);
});

test("an entry without an id is skipped rather than answered as undefined", () => {
  assert.deepEqual(histogramPadIdsOf([{ id: "pad1" }, {}, { id: "" }, { id: 7 }]), ["pad1"]);
});

test("nothing configured is an empty list, never undefined", () => {
  assert.deepEqual(histogramPadIdsOf(undefined), []);
  assert.deepEqual(histogramPadIdsOf(null), []);
  assert.deepEqual(histogramPadIdsOf({ type: "grid1x1x1" }), []);
  assert.deepEqual(histogramPadIdsOf([]), []);
});
