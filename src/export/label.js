import { layoutText } from "./font.js";
import { fillDiagonalContacts, meshVoxelGrid } from "./voxel.js";

const AXIS_KEYS = ["fXaxis", "fYaxis", "fZaxis"];
const AXIS_NAMES = ["X", "Y", "Z"];

function formatNumber(value) {
  if (!Number.isFinite(value)) return "?";
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 1e4 || magnitude < 1e-3)) return value.toExponential(2).toUpperCase();
  return String(Number(value.toFixed(3)));
}

function sanitize(text) {
  return String(text ?? "")
    .replace(/[_^]\{([^}]*)\}/g, "$1")
    .replace(/[{}#\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(text, limit) {
  if (text.length <= limit) return [text];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) current = word;
    else if (`${current} ${word}`.length <= limit) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Entries and per-axis mean/RMS, computed from the bin contents (jsroot objects do not carry them). */
export function histogramStats(hist) {
  const typename = hist?._typename ?? "";
  const dims = /^TH3/.test(typename) ? 3 : /^TH2/.test(typename) ? 2 : 1;
  const axes = AXIS_KEYS.slice(0, dims).map((key) => hist?.[key]).filter(Boolean);
  if (axes.length !== dims) return null;

  const sums = axes.map(() => 0);
  const squares = axes.map(() => 0);
  let total = 0;

  const walk = (indices, depth) => {
    if (depth === dims) {
      const weight = Number(
        dims === 1 ? hist.getBinContent(indices[0])
          : dims === 2 ? hist.getBinContent(indices[0], indices[1])
            : hist.getBinContent(indices[0], indices[1], indices[2]),
      );
      if (!Number.isFinite(weight) || weight === 0) return;
      total += weight;
      for (let axis = 0; axis < dims; axis++) {
        const center = Number(axes[axis].GetBinCenter(indices[axis]));
        sums[axis] += weight * center;
        squares[axis] += weight * center * center;
      }
      return;
    }
    const count = axes[depth].fNbins;
    for (let bin = 1; bin <= count; bin++) walk([...indices, bin], depth + 1);
  };
  walk([], 0);

  const means = sums.map((sum) => (total > 0 ? sum / total : Number.NaN));
  const rms = squares.map((square, axis) =>
    total > 0 ? Math.sqrt(Math.max(0, square / total - means[axis] ** 2)) : Number.NaN,
  );
  return { total, means, rms, dims };
}

function axisCount(hist) {
  const typename = hist?._typename ?? "";
  return /^TH3/.test(typename) ? 3 : /^TH2/.test(typename) ? 2 : 1;
}

export function histogramLabelLines(hist, options = {}) {
  if (!hist) return null;
  const includeTitle = options.title !== false;
  const includeName = options.name !== false;
  const includeType = options.type !== false;
  const includeAxes = options.axes !== false;
  const includeStats = options.stats !== false;
  const wrapChars = options.wrapChars ?? 34;

  const lines = [];
  if (includeTitle) {
    const title = sanitize(hist.fTitle);
    if (title) lines.push(...wrap(title.toUpperCase(), wrapChars));
  }
  if (includeName) {
    const name = sanitize(hist.fName);
    if (name) lines.push(...wrap(name.toUpperCase(), wrapChars));
  }

  const stats = includeStats ? histogramStats(hist) : null;
  const type = hist._typename ?? "HISTOGRAM";
  if (includeType) lines.push(stats ? `${type}  N=${formatNumber(stats.total)}` : type);
  else if (stats) lines.push(`N=${formatNumber(stats.total)}`);

  if (includeAxes) {
    const dims = stats?.dims ?? axisCount(hist);
    for (let axis = 0; axis < dims; axis++) {
      const axisTitle = sanitize(hist[AXIS_KEYS[axis]]?.fTitle).toUpperCase();
      lines.push(`${AXIS_NAMES[axis]}${axisTitle ? ` ${axisTitle}` : ""}`);
    }
  }
  return lines.length > 0 ? lines : null;
}

/** Geometry of the plate: 2D masks for the plate area and the raised text, at voxel resolution. */
export function labelPlateModel(hist, options = {}) {
  const lines = options.lines ?? histogramLabelLines(hist, options);
  if (!lines || lines.length === 0) return null;

  const maxChars = Math.max(...lines.map((line) => line.length));
  const paddingMm = options.paddingMm ?? 2;
  const maxWidthMm = options.maxWidthMm ?? 100;
  const available = Math.max(10, maxWidthMm - 2 * paddingMm);
  const charHeightMm = Math.min(
    options.charHeightMm ?? 4,
    Math.max(1.6, available / Math.max(1, maxChars - 1 / 3)),
  );
  const layout = layoutText(lines.join("\n"), {
    charHeightMm,
    paddingMm,
    mirror: options.mirror === true,
  });
  if (layout.polylines.length === 0) return null;

  const plateMm = options.plateThicknessMm ?? 1.5;
  const reliefMm = options.reliefMm ?? 0.6;
  const strokeMm = options.strokeWidthMm ?? 0.8;
  const voxelMm = options.voxelMm ?? 0.3;

  const nx = Math.max(1, Math.ceil(layout.widthMm / voxelMm));
  const ny = Math.max(1, Math.ceil(layout.heightMm / voxelMm));
  const plate = new Uint8Array(nx * ny).fill(1);
  const text = new Uint8Array(nx * ny);

  const half = strokeMm / 2;
  for (const polyline of layout.polylines) {
    for (let index = 1; index < polyline.length; index++) {
      const [ax, ay] = polyline[index - 1];
      const [bx, by] = polyline[index];
      const dx = bx - ax, dy = by - ay;
      const lengthSquared = dx * dx + dy * dy;
      const lowX = Math.max(0, Math.floor((Math.min(ax, bx) - half) / voxelMm));
      const highX = Math.min(nx - 1, Math.ceil((Math.max(ax, bx) + half) / voxelMm));
      const lowY = Math.max(0, Math.floor((Math.min(ay, by) - half) / voxelMm));
      const highY = Math.min(ny - 1, Math.ceil((Math.max(ay, by) + half) / voxelMm));
      for (let x = lowX; x <= highX; x++) {
        for (let y = lowY; y <= highY; y++) {
          const px = (x + 0.5) * voxelMm;
          const py = (y + 0.5) * voxelMm;
          const projection = lengthSquared > 0
            ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
            : 0;
          const nearestX = ax + dx * projection;
          const nearestY = ay + dy * projection;
          if (Math.hypot(px - nearestX, py - nearestY) > half) continue;
          text[x * ny + y] = 1;
        }
      }
    }
  }

  return {
    lines,
    widthMm: layout.widthMm,
    heightMm: layout.heightMm,
    plateMm,
    reliefMm,
    strokeMm,
    voxelMm,
    dims: [nx, ny],
    plate,
    text,
  };
}

/** Plate occupancy in plate-local millimetres. */
export function plateOccupancy(model, x, y, z) {
  if (!(z >= 0) || !(x >= 0) || !(y >= 0)) return 0;
  const ix = Math.floor(x / model.voxelMm);
  const iy = Math.floor(y / model.voxelMm);
  if (ix >= model.dims[0] || iy >= model.dims[1]) return 0;
  const index = ix * model.dims[1] + iy;
  if (z <= model.plateMm) return model.plate[index] ? 1 : 0;
  if (z > model.plateMm + model.reliefMm) return 0;
  return model.text[index] ? 1 : 0;
}

/** Standalone plate solid (plate + raised text as one watertight body). */
export function buildLabelPlate(hist, options = {}) {
  const model = labelPlateModel(hist, options);
  if (!model) return null;

  const depthMm = model.plateMm + model.reliefMm;
  const [nx, ny] = model.dims;
  const nz = Math.max(1, Math.ceil(depthMm / model.voxelMm));
  const grid = new Uint8Array(nx * ny * nz);
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        const point = [
          (x + 0.5) * model.voxelMm,
          (y + 0.5) * model.voxelMm,
          (z + 0.5) * model.voxelMm,
        ];
        if (plateOccupancy(model, point[0], point[1], point[2])) {
          grid[(x * ny + y) * nz + z] = 1;
        }
      }
    }
  }

  const dims = [nx, ny, nz];
  fillDiagonalContacts(grid, dims);
  const positions = meshVoxelGrid(grid, dims, [0, 0, 0], model.voxelMm);
  if (positions.length === 0) return null;
  return {
    positions,
    sizeMm: { x: model.widthMm, y: model.heightMm, z: depthMm },
    lines: model.lines,
  };
}
