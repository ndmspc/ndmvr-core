const EPS = 1e-9;

export function pushTriangle(out, a, b, c, normal) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  const area = nx * normal[0] + ny * normal[1] + nz * normal[2];
  if (Math.abs(area) < EPS) return;
  if (area < 0) out.push(a[0], a[1], a[2], c[0], c[1], c[2], b[0], b[1], b[2]);
  else out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

export function pushQuad(out, a, b, c, d, normal) {
  pushTriangle(out, a, b, c, normal);
  pushTriangle(out, a, c, d, normal);
}

/**
 * Fills cells that touch another filled cell only along an edge, so the extracted surface cannot be
 * non-manifold where two solids meet diagonally.
 */
export function fillDiagonalContacts(grid, dims) {
  const [nx, ny, nz] = dims;
  const cell = (x, y, z) => (x * ny + y) * nz + z;
  for (let pass = 0; pass < 4; pass++) {
    let changed = 0;
    const filled = (x, y, z) =>
      x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz && grid[cell(x, y, z)] === 1;
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        for (let z = 0; z < nz; z++) {
          if (filled(x, y, z) && filled(x + 1, y + 1, z) && !filled(x + 1, y, z) && !filled(x, y + 1, z)) { grid[cell(x + 1, y, z)] = 1; changed++; }
          if (filled(x + 1, y, z) && filled(x, y + 1, z) && !filled(x, y, z) && !filled(x + 1, y + 1, z)) { grid[cell(x, y, z)] = 1; changed++; }
          if (filled(x, y, z) && filled(x + 1, y, z + 1) && !filled(x + 1, y, z) && !filled(x, y, z + 1)) { grid[cell(x + 1, y, z)] = 1; changed++; }
          if (filled(x + 1, y, z) && filled(x, y, z + 1) && !filled(x, y, z) && !filled(x + 1, y, z + 1)) { grid[cell(x, y, z)] = 1; changed++; }
          if (filled(x, y, z) && filled(x, y + 1, z + 1) && !filled(x, y + 1, z) && !filled(x, y, z + 1)) { grid[cell(x, y + 1, z)] = 1; changed++; }
          if (filled(x, y + 1, z) && filled(x, y, z + 1) && !filled(x, y, z) && !filled(x, y + 1, z + 1)) { grid[cell(x, y, z)] = 1; changed++; }
        }
      }
    }
    if (changed === 0) break;
  }
}

/** Extracts the boundary of a voxel occupancy grid as outward-facing quads. */
export function meshVoxelGrid(grid, dims, origins, voxelMm) {
  const [nx, ny, nz] = dims;
  const cell = (x, y, z) => (x * ny + y) * nz + z;
  const positions = [];
  const occupancy = (x, y, z) =>
    x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz ? 0 : grid[cell(x, y, z)];

  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const total = [nx, ny, nz];
    const nu = total[u], nv = total[v];
    const mask = new Int8Array(nu * nv);
    for (let slice = -1; slice < total[axis]; slice++) {
      let any = false;
      for (let iu = 0; iu < nu; iu++) {
        for (let iv = 0; iv < nv; iv++) {
          const point = [0, 0, 0];
          point[axis] = slice;
          point[u] = iu;
          point[v] = iv;
          const inside = occupancy(point[0], point[1], point[2]);
          const next = [...point];
          next[axis] = slice + 1;
          const value = inside === occupancy(next[0], next[1], next[2]) ? 0 : inside ? 1 : -1;
          mask[iu * nv + iv] = value;
          if (value !== 0) any = true;
        }
      }
      if (!any) continue;
      for (let iu = 0; iu < nu; iu++) {
        for (let iv = 0; iv < nv; iv++) {
          const value = mask[iu * nv + iv];
          if (value === 0) continue;
          const corner = (du, dv) => {
            const p = [0, 0, 0];
            p[axis] = slice + 1;
            p[u] = iu + du;
            p[v] = iv + dv;
            return [
              origins[0] + p[0] * voxelMm,
              origins[1] + p[1] * voxelMm,
              origins[2] + p[2] * voxelMm,
            ];
          };
          const a = corner(0, 0), b = corner(1, 0), c = corner(1, 1), d = corner(0, 1);
          const normal = [0, 0, 0];
          normal[axis] = value > 0 ? 1 : -1;
          if (value > 0) pushQuad(positions, a, b, c, d, normal);
          else pushQuad(positions, a, d, c, b, normal);
        }
      }
    }
  }
  return new Float32Array(positions);
}
