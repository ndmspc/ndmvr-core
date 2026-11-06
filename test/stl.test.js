import assert from "node:assert/strict";
import test from "node:test";

import {
  collectHistogramTriangles,
  exportHistogramStl,
  fitForPrinting,
  trianglesToBinaryStl,
} from "../src/export/stl.js";

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function fakePainter(centers, sizes) {
  return {
    instancePositions: new Float32Array(centers),
    instanceScales: new Float32Array(sizes),
    instGeom: { instanceCount: centers.length / 3 },
    rootObj: { _typename: "TH2D" },
  };
}

function triangleMesh(vertices = [0, 0, 0, 1, 0, 0, 1, 1, 0]) {
  const attribute = { array: new Float32Array(vertices), count: vertices.length / 3, itemSize: 3 };
  return {
    isMesh: true,
    isObject3D: true,
    visible: true,
    material: {},
    matrix: { elements: IDENTITY },
    children: [],
    geometry: {
      getAttribute: (name) => (name === "position" ? attribute : null),
      getIndex: () => null,
      index: null,
    },
  };
}

test("painter instances become closed boxes in the STL", () => {
  const painter = fakePainter([0, 0, 0, 3, 0, 0], [2, 1, 0.5, 2, 1, 0.5]);
  const result = exportHistogramStl(painter);

  assert.ok(result);
  assert.equal(result.triangleCount, 24);
  assert.equal(result.fileStem, "TH2D");
  assert.equal(result.bytes.length, 84 + 24 * 50);

  const view = new DataView(result.bytes.buffer);
  const header = String.fromCharCode(...result.bytes.subarray(0, 20));
  assert.equal(header, "ndmspc histogram STL");
  assert.equal(view.getUint32(80, true), 24);
});

test("the model is fitted to 100 mm with its aspect kept and sits on Z = 0", () => {
  const painter = fakePainter([0, 0, 0, 3, 0, 0], [2, 1, 0.5, 2, 1, 0.5]);
  const result = exportHistogramStl(painter);

  assert.equal(Math.round(result.sizeMm.x), 100);
  assert.equal(Math.round(result.sizeMm.y), 10);
  assert.equal(Math.round(result.sizeMm.z), 20);

  const view = new DataView(result.bytes.buffer);
  let minZ = Infinity;
  for (let t = 0; t < result.triangleCount; t++) {
    const base = 84 + 12 + t * 50;
    for (let v = 0; v < 3; v++) {
      minZ = Math.min(minZ, view.getFloat32(base + v * 12 + 8, true));
    }
  }
  assert.ok(Math.abs(minZ) < 1e-5, `min Z was ${minZ}`);
});

test("zero-size and non-finite bins are dropped", () => {
  const painter = fakePainter(
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 1, 0.5, 0, 1, 1, Number.NaN, 1, 1],
  );
  const triangles = collectHistogramTriangles(painter);
  assert.equal(triangles.length / 9, 12);
});

test("lines, sprites and axis drawing are not exported", () => {
  const mesh = triangleMesh();
  const axisMesh = triangleMesh();
  axisMesh.axis_draw = true;
  const root = {
    isObject3D: true,
    visible: true,
    children: [
      mesh,
      { isLine: true, isObject3D: true, visible: true, children: [] },
      { isSprite: true, isObject3D: true, visible: true, children: [] },
      axisMesh,
      { isObject3D: true, visible: false, children: [triangleMesh()] },
    ],
  };

  const triangles = collectHistogramTriangles(root);
  assert.equal(triangles.length / 9, 1);
});

test("instanced meshes are expanded per instance", () => {
  const mesh = triangleMesh();
  mesh.isInstancedMesh = true;
  const second = [...IDENTITY];
  second[12] = 5;
  mesh.instanceMatrix = { array: new Float32Array([...IDENTITY, ...second]), count: 2 };

  const triangles = collectHistogramTriangles(mesh);
  assert.equal(triangles.length / 9, 2);
  assert.equal(triangles[9], 5);
});

test("an empty histogram has no STL", () => {
  assert.equal(exportHistogramStl(null), null);
  assert.equal(exportHistogramStl(fakePainter([], [])), null);
});

test("fitForPrinting returns null for a flat model", () => {
  assert.equal(fitForPrinting(new Float32Array(0)), null);
  assert.equal(fitForPrinting(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0])), null);
});

test("triangle count travels in the binary header regardless of size", () => {
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0,
    0, 0, 0, 1, 0, 0, 0, 0, 1,
  ]);
  const bytes = trianglesToBinaryStl(positions);
  const view = new DataView(bytes.buffer);
  assert.equal(bytes.length, 84 + 2 * 50);
  assert.equal(view.getUint32(80, true), 2);
  assert.equal(view.getUint16(84 + 50 - 2, true), 0);
});
