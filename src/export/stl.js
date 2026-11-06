const BOX_TRIANGLES = [
  0, 3, 2, 0, 2, 1,
  4, 5, 6, 4, 6, 7,
  0, 1, 5, 0, 5, 4,
  3, 7, 6, 3, 6, 2,
  0, 4, 7, 0, 7, 3,
  1, 2, 6, 1, 6, 5,
];

const DEGENERATE = 1e-12;

function multiply4(out, a, b) {
  for (let column = 0; column < 4; column++) {
    const offset = column * 4;
    const b0 = b[offset], b1 = b[offset + 1], b2 = b[offset + 2], b3 = b[offset + 3];
    out[offset] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[offset + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[offset + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[offset + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

function appendVertex(out, matrix, x, y, z) {
  const e = matrix;
  out.push(
    e[0] * x + e[4] * y + e[8] * z + e[12],
    e[1] * x + e[5] * y + e[9] * z + e[13],
    e[2] * x + e[6] * y + e[10] * z + e[14],
  );
}

function isDegenerate(a, b, c) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  return nx * nx + ny * ny + nz * nz <= DEGENERATE;
}

function pushTriangle(out, p0, p1, p2) {
  if (isDegenerate(p0, p1, p2)) return;
  out.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
}

function instanceCountOf(painter) {
  const declared = painter?.instGeom?.instanceCount;
  if (Number.isFinite(declared) && declared > 0) return declared;
  const positions = painter?.instancePositions?.length ?? 0;
  const scales = painter?.instanceScales?.length ?? 0;
  return Math.floor(Math.min(positions, scales) / 3);
}

function boxesToTriangles(centers, sizes, count) {
  const out = [];
  const box = [];
  for (let i = 0; i < count; i++) {
    const cx = centers[i * 3], cy = centers[i * 3 + 1], cz = centers[i * 3 + 2];
    const sx = sizes[i * 3], sy = sizes[i * 3 + 1], sz = sizes[i * 3 + 2];
    if (![cx, cy, cz, sx, sy, sz].every(Number.isFinite)) continue;
    if (sx <= 0 || sy <= 0 || sz <= 0) continue;
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    box.length = 0;
    box.push(
      [cx - hx, cy - hy, cz - hz],
      [cx + hx, cy - hy, cz - hz],
      [cx + hx, cy + hy, cz - hz],
      [cx - hx, cy + hy, cz - hz],
      [cx - hx, cy - hy, cz + hz],
      [cx + hx, cy - hy, cz + hz],
      [cx + hx, cy + hy, cz + hz],
      [cx - hx, cy + hy, cz + hz],
    );
    for (let t = 0; t < BOX_TRIANGLES.length; t += 3) {
      pushTriangle(out, box[BOX_TRIANGLES[t]], box[BOX_TRIANGLES[t + 1]], box[BOX_TRIANGLES[t + 2]]);
    }
  }
  return out;
}

function shouldSkipNode(node) {
  if (!node || node.visible === false) return true;
  if (node.axis_draw || node.zoom) return true;
  if (node.isLine || node.isLineSegments || node.isPoints || node.isSprite) return true;
  return false;
}

function appendMesh(out, node, composed) {
  const geometry = node.geometry;
  const position = geometry?.getAttribute?.("position") ?? geometry?.attributes?.position;
  if (!position?.array) return;
  const index = geometry.getIndex?.() ?? geometry.index;
  const indexArray = index?.array ?? null;
  const vertexCount = position.count ?? position.array.length / 3;
  const triangleCount = indexArray ? index.count / 3 : Math.floor(vertexCount / 3);
  if (!Number.isFinite(triangleCount) || triangleCount <= 0) return;
  const p = position.array;
  const stride = position.itemSize ?? 3;
  const p0 = [0, 0, 0], p1 = [0, 0, 0], p2 = [0, 0, 0];
  for (let t = 0; t < triangleCount; t++) {
    const indices = indexArray
      ? [indexArray[t * 3], indexArray[t * 3 + 1], indexArray[t * 3 + 2]]
      : [t * 3, t * 3 + 1, t * 3 + 2];
    const points = [p0, p1, p2];
    for (let v = 0; v < 3; v++) {
      const offset = indices[v] * stride;
      const point = points[v];
      point.length = 0;
      appendVertex(point, composed, p[offset], p[offset + 1], p[offset + 2]);
    }
    pushTriangle(out, p0, p1, p2);
  }
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function trianglesFromObject3D(root) {
  const out = [];
  const composed = new Array(16).fill(0);

  const visit = (node) => {
    if (shouldSkipNode(node)) return;
    const material = node.material;
    const isMesh = node.isMesh === true;
    if (isMesh) {
      if (material && material.opacity === 0) return;
      node.updateMatrix?.();
      const base = node.matrix?.elements ?? IDENTITY;
      if (node.isInstancedMesh === true && node.instanceMatrix?.array) {
        const instances = node.instanceMatrix;
        const count = node.count ?? instances.count ?? instances.array.length / 16;
        for (let i = 0; i < count; i++) {
          multiply4(composed, base, instances.array.subarray(i * 16, i * 16 + 16));
          appendMesh(out, node, composed);
        }
        return;
      }
      appendMesh(out, node, base);
    }
    const children = node.children;
    if (children) {
      for (let i = 0; i < children.length; i++) visit(children[i]);
    }
  };

  visit(root);
  return out;
}

function histogramObjectOf(source) {
  if (!source) return null;
  if (source.isObject3D === true) return source;
  if (typeof source.getHistogramMesh === "function") return source.getHistogramMesh();
  if (source.histogramGroup) return source.histogramGroup;
  return null;
}

export function collectHistogramTriangles(source) {
  if (!source) return null;
  if (source.instancePositions && source.instanceScales) {
    const count = instanceCountOf(source);
    if (count <= 0) return null;
    const triangles = boxesToTriangles(source.instancePositions, source.instanceScales, count);
    return triangles.length > 0 ? triangles : null;
  }
  const object = histogramObjectOf(source);
  if (!object) return null;
  const triangles = trianglesFromObject3D(object);
  return triangles.length > 0 ? triangles : null;
}

export function fitForPrinting(positions, maxSizeMm = 100) {
  if (!positions?.length) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const longest = Math.max(size[0], size[1], size[2]);
  if (!Number.isFinite(longest) || longest <= 0) return null;
  const scale = maxSizeMm / longest;
  const centerX = (min[0] + max[0]) / 2;
  const centerZ = (min[2] + max[2]) / 2;
  const minY = min[1];
  const fitted = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    fitted[i] = (positions[i] - centerX) * scale;
    fitted[i + 1] = -(positions[i + 2] - centerZ) * scale;
    fitted[i + 2] = (positions[i + 1] - minY) * scale;
  }
  return {
    positions: fitted,
    sizeMm: { x: size[0] * scale, y: size[2] * scale, z: size[1] * scale },
  };
}

export function trianglesToBinaryStl(positions) {
  const triangleCount = positions.length / 9;
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const view = new DataView(buffer);
  const header = "ndmspc histogram STL";
  for (let i = 0; i < header.length; i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, triangleCount, true);
  let offset = 84;
  const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
  for (let t = 0; t < triangleCount; t++) {
    const base = t * 9;
    a[0] = positions[base]; a[1] = positions[base + 1]; a[2] = positions[base + 2];
    b[0] = positions[base + 3]; b[1] = positions[base + 4]; b[2] = positions[base + 5];
    c[0] = positions[base + 6]; c[1] = positions[base + 7]; c[2] = positions[base + 8];
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length; ny /= length; nz /= length;
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;
    for (const point of [a, b, c]) {
      view.setFloat32(offset, point[0], true); offset += 4;
      view.setFloat32(offset, point[1], true); offset += 4;
      view.setFloat32(offset, point[2], true); offset += 4;
    }
    view.setUint16(offset, 0, true); offset += 2;
  }
  return new Uint8Array(buffer);
}

export function exportHistogramStl(source, { maxSizeMm = 100 } = {}) {
  const triangles = collectHistogramTriangles(source);
  if (!triangles || triangles.length === 0) return null;
  const fitted = fitForPrinting(triangles, maxSizeMm);
  if (!fitted) return null;
  const bytes = trianglesToBinaryStl(fitted.positions);
  const typename = source?.rootObj?._typename;
  return {
    bytes,
    triangleCount: fitted.positions.length / 9,
    sizeMm: fitted.sizeMm,
    fileStem: typeof typename === "string" && typename.length > 0 ? typename : "histogram",
  };
}
