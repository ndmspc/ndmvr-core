import { fillDiagonalContacts, meshVoxelGrid, pushQuad, pushTriangle } from "./voxel.js";
import { labelPlateModel, plateOccupancy } from "./label.js";

function axisEdges(axis, count) {
  const edges = [];
  for (let i = 1; i <= count; i++) edges.push(Number(axis.GetBinLowEdge(i)));
  edges.push(Number(axis.GetBinLowEdge(count + 1)));
  return edges;
}

function contentOf(hist, x, y) {
  const value = y === undefined ? hist.getBinContent(x) : hist.getBinContent(x, y);
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/**
 * Height-field solid of a TH1/TH2: one bar per bin on a shared base plate, so the surface has no
 * internal walls and no coincident faces.
 */
export function heightFieldModel(hist, options = {}) {
  const typename = hist?._typename ?? "";
  const is2D = /^TH2/.test(typename) && hist.fYaxis;
  if (!/^TH1/.test(typename) && !is2D) return null;

  const nx = hist.fXaxis?.fNbins;
  if (!Number.isFinite(nx) || nx <= 0) return null;
  const xEdges = axisEdges(hist.fXaxis, nx);

  let ny = 1;
  let yEdges;
  if (is2D) {
    ny = hist.fYaxis.fNbins;
    if (!Number.isFinite(ny) || ny <= 0) return null;
    yEdges = axisEdges(hist.fYaxis, ny);
  }

  const width = xEdges[nx] - xEdges[0];
  const depth = is2D ? yEdges[ny] - yEdges[0] : (options.depthFraction ?? 0.4) * width;
  if (!(width > 0) || !(depth > 0)) return null;
  if (!is2D) yEdges = [-depth / 2, depth / 2];

  let maxContent = 0;
  const contents = [];
  for (let i = 0; i < nx; i++) {
    contents.push([]);
    for (let j = 0; j < ny; j++) {
      const value = contentOf(hist, i + 1, is2D ? j + 1 : undefined);
      contents[i].push(value);
      if (value > maxContent) maxContent = value;
    }
  }
  maxContent = maxContent || 1;

  const extent = Math.max(width, depth);
  const baseHeight = (options.baseFraction ?? 0.02) * extent;
  const barHeight = (options.barFraction ?? 0.6) * extent;
  const heights = contents.map((column) =>
    column.map((value) => baseHeight + (value / maxContent) * barHeight),
  );

  const maxSizeMm = options.maxSizeMm ?? 100;
  const scale = maxSizeMm / extent;
  return { xEdges, yEdges, heights, width, depth, scale, nx, ny, baseHeight, barHeight, maxSizeMm };
}

export function buildHeightField(hist, options = {}) {
  const model = heightFieldModel(hist, options);
  if (!model) return null;
  const { xEdges, yEdges, heights, width, depth, scale, nx, ny, baseHeight, barHeight } = model;
  const positions = [];

  const X = (value) => (value - xEdges[0]) * scale;
  const Y = (value) => (value - yEdges[0]) * scale;
  const Z = (value) => value * scale;

  const heightAt = (i, j) =>
    i >= 0 && i < nx && j >= 0 && j < ny ? heights[i][j] : undefined;

  const cornerLevels = (iEdge, jEdge, min, max) => {
    const levels = new Set([min, max]);
    for (const value of [
      heightAt(iEdge - 1, jEdge - 1), heightAt(iEdge, jEdge - 1),
      heightAt(iEdge - 1, jEdge), heightAt(iEdge, jEdge),
    ]) {
      if (value !== undefined && value > min && value < max) levels.add(value);
    }
    return [...levels].sort((a, b) => a - b);
  };

  const ladder = (axis, fixed, u0, u1, left, right, normal) => {
    const point = (u, z) =>
      axis === "x" ? [X(fixed), Y(u), Z(z)] : [X(u), Y(fixed), Z(z)];
    let li = 0, ri = 0;
    while (li < left.length - 1 || ri < right.length - 1) {
      const l0 = left[li], l1 = left[li + 1];
      const r0 = right[ri], r1 = right[ri + 1];
      if (r1 === undefined || (l1 !== undefined && l1 <= r1)) {
        pushTriangle(positions, point(u0, l0), point(u0, l1), point(u1, r0), normal);
        li++;
      } else {
        pushTriangle(positions, point(u0, l0), point(u1, r1), point(u1, r0), normal);
        ri++;
      }
    }
  };

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x0 = X(xEdges[i]), x1 = X(xEdges[i + 1]);
      const y0 = Y(yEdges[j]), y1 = Y(yEdges[j + 1]);
      const top = Z(heights[i][j]);
      pushQuad(positions, [x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], [0, 0, -1]);
      pushQuad(positions, [x0, y0, top], [x1, y0, top], [x1, y1, top], [x0, y1, top], [0, 0, 1]);
    }
  }

  for (let i = 1; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const left = heights[i - 1][j], right = heights[i][j];
      if (left === right) continue;
      const min = Math.min(left, right), max = Math.max(left, right);
      ladder(
        "x", xEdges[i], yEdges[j], yEdges[j + 1],
        cornerLevels(i, j, min, max), cornerLevels(i, j + 1, min, max),
        left > right ? [1, 0, 0] : [-1, 0, 0],
      );
    }
  }

  for (let j = 1; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const lower = heights[i][j - 1], upper = heights[i][j];
      if (lower === upper) continue;
      const min = Math.min(lower, upper), max = Math.max(lower, upper);
      ladder(
        "y", yEdges[j], xEdges[i], xEdges[i + 1],
        cornerLevels(i, j, min, max), cornerLevels(i + 1, j, min, max),
        lower > upper ? [0, 1, 0] : [0, -1, 0],
      );
    }
  }

  for (let j = 0; j < ny; j++) {
    ladder(
      "x", xEdges[0], yEdges[j], yEdges[j + 1],
      cornerLevels(0, j, 0, heights[0][j]), cornerLevels(0, j + 1, 0, heights[0][j]), [-1, 0, 0],
    );
    ladder(
      "x", xEdges[nx], yEdges[j], yEdges[j + 1],
      cornerLevels(nx, j, 0, heights[nx - 1][j]),
      cornerLevels(nx, j + 1, 0, heights[nx - 1][j]), [1, 0, 0],
    );
  }

  for (let i = 0; i < nx; i++) {
    ladder(
      "y", yEdges[0], xEdges[i], xEdges[i + 1],
      cornerLevels(i, 0, 0, heights[i][0]), cornerLevels(i + 1, 0, 0, heights[i][0]), [0, -1, 0],
    );
    ladder(
      "y", yEdges[ny], xEdges[i], xEdges[i + 1],
      cornerLevels(i, ny, 0, heights[i][ny - 1]),
      cornerLevels(i + 1, ny, 0, heights[i][ny - 1]), [0, 1, 0],
    );
  }

  if (positions.length === 0) return null;
  return {
    positions: new Float32Array(positions),
    sizeMm: {
      x: width * scale,
      y: depth * scale,
      z: (baseHeight + barHeight) * scale,
    },
  };
}

export function collectBoxes(source) {
  if (source?.instancePositions && source?.instanceScales) {
    const count = source.instGeom?.instanceCount ?? source.instancePositions.length / 3;
    if (!(count > 0)) return null;
    const boxes = [];
    for (let i = 0; i < count; i++) {
      boxes.push({
        center: [
          source.instancePositions[i * 3],
          source.instancePositions[i * 3 + 1],
          source.instancePositions[i * 3 + 2],
        ],
        size: [
          source.instanceScales[i * 3],
          source.instanceScales[i * 3 + 1],
          source.instanceScales[i * 3 + 2],
        ],
      });
    }
    return boxes;
  }

  const object =
    source?.isObject3D === true ? source
      : typeof source?.getHistogramMesh === "function" ? source.getHistogramMesh()
        : source?.histogramGroup ?? null;
  if (!object) return null;

  const boxes = [];
  object.traverse((node) => {
    if (!node.isInstancedMesh || !node.instanceMatrix?.array) return;
    const matrix = node.instanceMatrix.array;
    const count = node.count ?? node.instanceMatrix.count;
    for (let i = 0; i < count; i++) {
      const offset = i * 16;
      boxes.push({
        center: [matrix[offset + 12], matrix[offset + 13], matrix[offset + 14]],
        size: [
          Math.hypot(matrix[offset], matrix[offset + 1], matrix[offset + 2]),
          Math.hypot(matrix[offset + 4], matrix[offset + 5], matrix[offset + 6]),
          Math.hypot(matrix[offset + 8], matrix[offset + 9], matrix[offset + 10]),
        ],
      });
    }
  });
  return boxes.length > 0 ? boxes : null;
}

/**
 * TH3 print model: solid bins, connectors between grid neighbours, and an open cage around the
 * model, fused into one watertight solid on a voxel grid.
 */
export function buildMatrixGrid(boxes, options = {}) {
  if (!boxes || boxes.length === 0) return null;

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes) {
    for (let axis = 0; axis < 3; axis++) {
      if (!Number.isFinite(box.center[axis]) || !Number.isFinite(box.size[axis])) return null;
      min[axis] = Math.min(min[axis], box.center[axis] - box.size[axis] / 2);
      max[axis] = Math.max(max[axis], box.center[axis] + box.size[axis] / 2);
    }
  }
  const extent = [0, 1, 2].map((axis) => max[axis] - min[axis]);
  const longest = Math.max(...extent);
  if (!(longest > 0)) return null;

  const maxSizeMm = options.maxSizeMm ?? 100;
  const marginRaw = 0.05 * longest;
  const cubeSide = longest + 2 * marginRaw;
  const scale = maxSizeMm / cubeSide;
  const side = cubeSide * scale;

  const centers = boxes.map((box) => [
    (box.center[0] - (min[0] + max[0]) / 2) * scale + side / 2,
    (box.center[1] - (min[1] + max[1]) / 2) * scale + side / 2,
    (box.center[2] - min[2] + marginRaw) * scale,
  ]);
  const sizes = boxes.map((box) => box.size.map((value) => value * scale));

  const cubeMin = [0, 0, 0];
  const cubeMax = [side, side, side];

  const round = (value) => Math.round(value * 1000) / 1000;
  const unique = (values) => [...new Set(values.map(round))].sort((a, b) => a - b);
  const xs = unique(centers.map((point) => point[0]));
  const ys = unique(centers.map((point) => point[1]));
  const zs = unique(centers.map((point) => point[2]));
  const xIndex = new Map(xs.map((value, index) => [value, index]));
  const yIndex = new Map(ys.map((value, index) => [value, index]));
  const zIndex = new Map(zs.map((value, index) => [value, index]));

  const binAt = new Map();
  centers.forEach((point, index) => {
    binAt.set(
      `${xIndex.get(round(point[0]))},${yIndex.get(round(point[1]))},${zIndex.get(round(point[2]))}`,
      index,
    );
  });

  const corners = [];
  for (const x of [cubeMin[0], cubeMax[0]])
    for (const y of [cubeMin[1], cubeMax[1]])
      for (const z of [cubeMin[2], cubeMax[2]]) corners.push([x, y, z]);

  const nodes = [...centers, ...corners];
  const cubeCount = centers.length;
  const connector = options.connectorWidthMm ?? 0.8;
  const edge = options.edgeWidthMm ?? 0.8;
  const cage = options.cage !== false;

  const links = new Map();
  const addLink = (from, to, thickness) => {
    if (from === to) return;
    const key = from < to ? `${from}-${to}` : `${to}-${from}`;
    if (!links.has(key)) links.set(key, { from, to, thickness });
  };

  centers.forEach((point, index) => {
    const gx = xIndex.get(round(point[0]));
    const gy = yIndex.get(round(point[1]));
    const gz = zIndex.get(round(point[2]));
    for (const [x, y, z] of [[gx + 1, gy, gz], [gx, gy + 1, gz], [gx, gy, gz + 1]]) {
      const other = binAt.get(`${x},${y},${z}`);
      if (other !== undefined) addLink(index, other, connector);
    }
  });

  if (cage) {
    for (let i = 0; i < corners.length; i++) {
      for (let bit = 0; bit < 3; bit++) {
        const j = i ^ (1 << bit);
        if (j > i) addLink(cubeCount + i, cubeCount + j, edge);
      }
    }
  }

  const connected = new Uint8Array(nodes.length);
  const best = new Float64Array(nodes.length).fill(Infinity);
  const parent = new Int32Array(nodes.length).fill(-1);
  best[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let next = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!connected[i] && (next === -1 || best[i] < best[next])) next = i;
    }
    if (next === -1) break;
    connected[next] = 1;
    if (parent[next] >= 0) {
      const from = parent[next];
      const bothCorners = from >= cubeCount && next >= cubeCount;
      addLink(from, next, bothCorners ? edge : connector);
    }
    const a = nodes[next];
    for (let i = 0; i < nodes.length; i++) {
      if (connected[i]) continue;
      const b = nodes[i];
      const distance = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      if (distance < best[i]) { best[i] = distance; parent[i] = next; }
    }
  }

  const lines = [...links.values()].map(({ from, to, thickness }) => ({
    a: nodes[from], b: nodes[to], t: thickness,
  }));

  const voxelMm = Math.max(options.voxelMm ?? 0.5, Math.max(...cubeMax) / 400);
  const padding = Math.max(connector, edge);
  const dims = [0, 1, 2].map((axis) =>
    Math.max(1, Math.ceil((cubeMax[axis] - cubeMin[axis] + 2 * padding) / voxelMm)),
  );
  const [nx, ny, nz] = dims;
  const offset = [padding, padding, padding];
  const origins = [0, 1, 2].map((axis) => cubeMin[axis] - offset[axis]);
  const grid = new Uint8Array(nx * ny * nz);
  const cell = (x, y, z) => (x * ny + y) * nz + z;
  const centerOf = (x, y, z) => [
    origins[0] + (x + 0.5) * voxelMm,
    origins[1] + (y + 0.5) * voxelMm,
    origins[2] + (z + 0.5) * voxelMm,
  ];
  const clampIndex = (value, total, origin) =>
    Math.max(0, Math.min(total - 1, Math.floor((value - origin) / voxelMm)));

  for (let i = 0; i < centers.length; i++) {
    const center = centers[i], size = sizes[i];
    const low = [0, 1, 2].map((axis) => clampIndex(center[axis] - size[axis] / 2, dims[axis], origins[axis]));
    const high = [0, 1, 2].map((axis) => clampIndex(center[axis] + size[axis] / 2, dims[axis], origins[axis]));
    for (let x = low[0]; x <= high[0]; x++) {
      for (let y = low[1]; y <= high[1]; y++) {
        for (let z = low[2]; z <= high[2]; z++) {
          const point = centerOf(x, y, z);
          if (Math.abs(point[0] - center[0]) <= size[0] / 2 + 1e-9 &&
              Math.abs(point[1] - center[1]) <= size[1] / 2 + 1e-9 &&
              Math.abs(point[2] - center[2]) <= size[2] / 2 + 1e-9) {
            grid[cell(x, y, z)] = 1;
          }
        }
      }
    }
  }

  for (const { a, b, t } of lines) {
    const half = t / 2;
    const halfDiag = half * Math.SQRT2;
    const direction = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const length = Math.hypot(...direction);
    if (length < 1e-6) continue;
    const dir = direction.map((value) => value / length);
    const helper = Math.abs(dir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const rawU = [
      dir[1] * helper[2] - dir[2] * helper[1],
      dir[2] * helper[0] - dir[0] * helper[2],
      dir[0] * helper[1] - dir[1] * helper[0],
    ];
    const lengthU = Math.hypot(...rawU) || 1;
    const u = rawU.map((value) => value / lengthU);
    const v = [
      dir[1] * u[2] - dir[2] * u[1],
      dir[2] * u[0] - dir[0] * u[2],
      dir[0] * u[1] - dir[1] * u[0],
    ];
    const low = [0, 1, 2].map((axis) =>
      clampIndex(Math.min(a[axis], b[axis]) - halfDiag, dims[axis], origins[axis]),
    );
    const high = [0, 1, 2].map((axis) =>
      clampIndex(Math.max(a[axis], b[axis]) + halfDiag, dims[axis], origins[axis]),
    );
    for (let x = low[0]; x <= high[0]; x++) {
      for (let y = low[1]; y <= high[1]; y++) {
        for (let z = low[2]; z <= high[2]; z++) {
          const point = centerOf(x, y, z);
          const rel = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
          const along = rel[0] * dir[0] + rel[1] * dir[1] + rel[2] * dir[2];
          if (along < 0 || along > length) continue;
          const rest = [rel[0] - dir[0] * along, rel[1] - dir[1] * along, rel[2] - dir[2] * along];
          if (Math.abs(rest[0] * u[0] + rest[1] * u[1] + rest[2] * u[2]) <= half &&
              Math.abs(rest[0] * v[0] + rest[1] * v[1] + rest[2] * v[2]) <= half) {
            grid[cell(x, y, z)] = 1;
          }
        }
      }
    }
  }

  return {
    grid,
    dims,
    origins,
    voxelMm,
    solidMin: cubeMin,
    solidMax: cubeMax,
    sizeMm: {
      x: cubeMax[0] - cubeMin[0],
      y: cubeMax[1] - cubeMin[1],
      z: cubeMax[2] - cubeMin[2],
    },
  };
}

export function meshBuilt(built) {
  if (!built) return null;
  fillDiagonalContacts(built.grid, built.dims);
  const positions = meshVoxelGrid(built.grid, built.dims, built.origins, built.voxelMm);
  if (positions.length === 0) return null;
  return { positions, sizeMm: built.sizeMm };
}

export function buildMatrixSolid(boxes, options = {}) {
  return meshBuilt(buildMatrixGrid(boxes, options));
}

export function buildHeightFieldGrid(hist, options = {}) {
  const model = heightFieldModel(hist, options);
  if (!model) return null;
  const { xEdges, yEdges, heights, width, depth, scale, nx, ny } = model;

  const voxelMm = Math.max(options.voxelMm ?? 0.5, (options.maxSizeMm ?? 100) / 400);
  const widthMm = width * scale;
  const depthMm = depth * scale;
  let maxHeightMm = 0;
  for (const column of heights) {
    for (const value of column) maxHeightMm = Math.max(maxHeightMm, value * scale);
  }
  const dims = [
    Math.max(1, Math.ceil(widthMm / voxelMm)),
    Math.max(1, Math.ceil(depthMm / voxelMm)),
    Math.max(1, Math.ceil(maxHeightMm / voxelMm)),
  ];
  const [gx, gy, gz] = dims;
  const grid = new Uint8Array(gx * gy * gz);
  const cell = (x, y, z) => (x * gy + y) * gz + z;

  for (let i = 0; i < nx; i++) {
    const x0 = (xEdges[i] - xEdges[0]) * scale;
    const x1 = (xEdges[i + 1] - xEdges[0]) * scale;
    for (let j = 0; j < ny; j++) {
      const y0 = (yEdges[j] - yEdges[0]) * scale;
      const y1 = (yEdges[j + 1] - yEdges[0]) * scale;
      const top = heights[i][j] * scale;
      const lowX = Math.max(0, Math.floor(x0 / voxelMm));
      const highX = Math.min(gx - 1, Math.ceil(x1 / voxelMm) - 1);
      const lowY = Math.max(0, Math.floor(y0 / voxelMm));
      const highY = Math.min(gy - 1, Math.ceil(y1 / voxelMm) - 1);
      const highZ = Math.min(gz - 1, Math.ceil(top / voxelMm) - 1);
      for (let x = lowX; x <= highX; x++) {
        for (let y = lowY; y <= highY; y++) {
          for (let z = 0; z <= highZ; z++) grid[cell(x, y, z)] = 1;
        }
      }
    }
  }

  return {
    grid,
    dims,
    origins: [0, 0, 0],
    voxelMm,
    solidMin: [0, 0, 0],
    solidMax: [widthMm, depthMm, maxHeightMm],
    sizeMm: { x: widthMm, y: depthMm, z: maxHeightMm },
  };
}

function modelOccupancy(built, point) {
  const [nx, ny, nz] = built.dims;
  const x = Math.floor((point[0] - built.origins[0]) / built.voxelMm);
  const y = Math.floor((point[1] - built.origins[1]) / built.voxelMm);
  const z = Math.floor((point[2] - built.origins[2]) / built.voxelMm);
  if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return 0;
  return built.grid[(x * ny + y) * nz + z] ? 1 : 0;
}

/** Model and label plate fused into one watertight body on a single voxel grid. */
export function buildFusedSolid(source, options = {}) {
  const hist = source?.rootObj;
  const boxes = collectBoxes(source);
  let built = null;
  if (boxes && (!hist || /^TH3/.test(hist._typename ?? ""))) built = buildMatrixGrid(boxes, options);
  if (!built && hist && /^TH[12]/.test(hist._typename ?? "")) built = buildHeightFieldGrid(hist, options);
  if (!built) return null;

  const labelOptions = typeof options.label === "object"
    ? { ...options, ...options.label }
    : { ...options };
  const plate = labelPlateModel(hist, labelOptions);
  if (!plate) return meshBuilt(built);

  const plateX = Math.max(0, (built.solidMax[0] - plate.widthMm) / 2);
  const plateY = -plate.heightMm;
  const plateDepth = plate.plateMm + plate.reliefMm;

  const min = [
    Math.min(built.solidMin[0], plateX),
    Math.min(built.solidMin[1], plateY),
    Math.min(built.solidMin[2], 0),
  ];
  const max = [
    Math.max(built.solidMax[0], plateX + plate.widthMm),
    Math.max(built.solidMax[1], plateY + plate.heightMm),
    Math.max(built.solidMax[2], plateDepth),
  ];

  const voxelMm = built.voxelMm;
  const dims = [0, 1, 2].map((axis) =>
    Math.max(1, Math.ceil((max[axis] - min[axis]) / voxelMm)),
  );
  const [nx, ny, nz] = dims;
  const grid = new Uint8Array(nx * ny * nz);
  const cell = (x, y, z) => (x * ny + y) * nz + z;

  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        const point = [
          min[0] + (x + 0.5) * voxelMm,
          min[1] + (y + 0.5) * voxelMm,
          min[2] + (z + 0.5) * voxelMm,
        ];
        if (modelOccupancy(built, point)) {
          grid[cell(x, y, z)] = 1;
          continue;
        }
        if (plateOccupancy(plate, point[0] - plateX, point[1] - plateY, point[2])) {
          grid[cell(x, y, z)] = 1;
        }
      }
    }
  }

  return meshBuilt({
    grid,
    dims,
    origins: min,
    voxelMm,
    sizeMm: { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] },
  });
}
