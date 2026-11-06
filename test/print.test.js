import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { build3d, parse } from "jsroot";

import { buildHeightField, buildMatrixSolid, collectBoxes } from "../src/export/print.js";
import { buildLabelPlate, histogramLabelLines } from "../src/export/label.js";
import { exportHistogramLabelStl, exportHistogramStl } from "../src/export/stl.js";

const asset = (name) =>
  readFileSync(new URL(`../src/assets/histograms/${name}`, import.meta.url), "utf8");

function analyze(positions) {
  const count = positions.length / 9;
  const ids = new Map();
  const parents = [];
  const vertexId = (index) => {
    const key = `${positions[index]},${positions[index + 1]},${positions[index + 2]}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = parents.length;
      ids.set(key, id);
      parents.push(id);
    }
    return id;
  };
  const find = (value) => {
    while (parents[value] !== value) {
      parents[value] = parents[parents[value]];
      value = parents[value];
    }
    return value;
  };
  const union = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parents[b] = a;
  };
  const edges = new Map();
  const key = (index) => vertexId(index);
  for (let t = 0; t < count; t++) {
    const base = t * 9;
    const a = vertexId(base), b = vertexId(base + 3), c = vertexId(base + 6);
    union(a, b);
    union(b, c);
    for (const [p, q] of [[base, base + 3], [base + 3, base + 6], [base + 6, base]]) {
      const kp = key(p), kq = key(q);
      const edge = Math.min(kp, kq) + "|" + Math.max(kp, kq);
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  const badEdges = [...edges.values()].filter((value) => value !== 2).length;
  const bodies = new Set();
  for (let t = 0; t < count; t++) bodies.add(find(vertexId(t * 9)));
  return { triangles: count, badEdges, bodies: bodies.size };
}

test("a TH1 becomes a watertight height field with a base plate", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  const solid = buildHeightField(hist);

  assert.ok(solid);
  const result = analyze(solid.positions);
  assert.equal(result.badEdges, 0);
  assert.equal(result.bodies, 1);
  assert.equal(Math.round(solid.sizeMm.x), 100);
});

test("a TH2 becomes one watertight height field, not touching boxes", () => {
  const hist = parse(asset("hist2D.axis1-pt_axis2-ce.json"));
  const solid = buildHeightField(hist);

  assert.ok(solid);
  const result = analyze(solid.positions);
  assert.equal(result.badEdges, 0);
  assert.equal(result.bodies, 1);
});

test("a TH3 becomes one matrix-and-cage solid", () => {
  const hist = parse(asset("hist3D.json"));
  return build3d(hist).then((object) => {
    const boxes = collectBoxes(object);
    assert.ok(boxes.length > 1000);

    const solid = buildMatrixSolid(boxes, { voxelMm: 1, connectorWidthMm: 1.2 });
    assert.ok(solid);
    const result = analyze(solid.positions);
    assert.equal(result.badEdges, 0);
    assert.equal(result.bodies, 1);
    assert.equal(Math.round(solid.sizeMm.x), 100);
    assert.equal(Math.round(solid.sizeMm.z), 100);
  });
});

test("the public export picks the print model for TH1 and names the file", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  const result = exportHistogramStl({ rootObj: hist });

  assert.ok(result);
  assert.equal(result.fileStem, "TH1D");
  assert.equal(result.bytes.length, 84 + result.triangleCount * 50);
  assert.equal(Math.round(result.sizeMm.x), 100);
});

test("mode mesh ignores the histogram data and needs geometry", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  assert.equal(exportHistogramStl({ rootObj: hist }, { mode: "mesh" }), null);
  assert.ok(exportHistogramStl({ rootObj: hist }));
});

test("the label plate carries the name and stats and is watertight", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  const lines = histogramLabelLines(hist);
  assert.ok(lines.length >= 2);
  assert.match(lines.join("\n"), /N=/);
  assert.match(lines.join("\n"), /^X /m);

  const plate = buildLabelPlate(hist);
  assert.ok(plate);
  const result = analyze(plate.positions);
  assert.equal(result.badEdges, 0);
  assert.equal(result.bodies, 1);
  assert.ok(plate.sizeMm.x <= 102);
  assert.ok(plate.sizeMm.z > 1.5);
});

test("the public label export returns a named STL", () => {
  const hist = parse(asset("hist2D.axis1-pt_axis2-ce.json"));
  const result = exportHistogramLabelStl({ rootObj: hist });
  assert.ok(result);
  assert.equal(result.fileStem, "TH2D-label");
  assert.ok(result.triangleCount > 0);
  assert.equal(result.bytes.length, 84 + result.triangleCount * 50);
});

function stlPositions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  const positions = new Float32Array(count * 9);
  for (let triangle = 0; triangle < count; triangle++) {
    const base = 84 + triangle * 50 + 12;
    for (let value = 0; value < 9; value++) {
      positions[triangle * 9 + value] = view.getFloat32(base + value * 4, true);
    }
  }
  return positions;
}

test("the plate can be written into the model STL", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  const plain = exportHistogramStl({ rootObj: hist });
  const combined = exportHistogramStl({ rootObj: hist }, { label: true });

  assert.ok(combined);
  assert.ok(combined.triangleCount > plain.triangleCount);
  assert.ok(combined.sizeMm.y > plain.sizeMm.y + 10);

  const result = analyze(stlPositions(combined.bytes));
  assert.equal(result.badEdges, 0);
  assert.equal(result.bodies, 2);
});

test("label parts can be selected", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  const text = (options) => histogramLabelLines(hist, options).join("\n");

  const statsOnly = text({ title: false, name: false, axes: false });
  assert.match(statsOnly, /N=/);
  assert.doesNotMatch(statsOnly, /UNLIKE|PROJECTION|MEAN/);

  const axesOnly = text({ title: false, name: false, type: false, stats: false });
  assert.match(axesOnly, /^X /);
  assert.doesNotMatch(axesOnly, /N=|MEAN/);

  const titleOnly = text({ name: false, type: false, stats: false, axes: false });
  assert.match(titleOnly, /UNLIKE/);

  const nameOnly = text({ title: false, type: false, stats: false, axes: false, name: true });
  assert.match(nameOnly, /UNLIKEPM/);

  assert.equal(
    histogramLabelLines(hist, { title: false, name: false, type: false, stats: false, axes: false }),
    null,
  );
});

test("labelFused writes the plate and the histogram as one body", () => {
  const hist = parse(asset("hist1D.axis1-pt.json"));
  const result = exportHistogramStl({ rootObj: hist }, { label: true, labelFused: true });
  assert.ok(result);
  const topology = analyze(stlPositions(result.bytes));
  assert.equal(topology.badEdges, 0);
  assert.equal(topology.bodies, 1);
});
