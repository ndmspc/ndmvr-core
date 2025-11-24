
export function appendPads(subjectValue, ids, { scale, padding, origin }) {
  // The raw config is inside subjectValue.config
  const rootCfg = subjectValue.config ?? {};

  if (!rootCfg.environment) rootCfg.environment = {};
  if (!rootCfg.environment.histogramPads)
    rootCfg.environment.histogramPads = [];

  const pads = rootCfg.environment.histogramPads;

  let offsetX = origin.x;
  let offsetY = origin.y;
  let offsetZ = origin.z;

  ids.forEach(id => {
    pads.push({
      id,
      position: {
        x: offsetX + scale.x / 2,
        y: offsetY + scale.y / 2,
        z: offsetZ - scale.z / 2,
      },
      scale: { ...scale },
      padding: { ...padding },
      origin: { ...origin }
    });

    offsetX += scale.x + padding.x;
  });

  return subjectValue; // keep structure intact
}



export function parseConfig(json, existingConfig = null) {
  const data = typeof json === "string" ? JSON.parse(json) : json;

  function expandHistogramPads(pads) {
    if (Array.isArray(pads)) return pads;

    if (pads && typeof pads === "object" && "type" in pads) {
      const prefix = pads.prefix ?? "histogram";
      const match = pads.type.match(/grid(\d+)x(\d+)x(\d+)/);
      if (!match) return [pads];

      const nx = +match[1];
      const ny = +match[2];
      const nz = +match[3];

      const totalScale = pads.scale || { x: 1, y: 1, z: 1 };
      const padding = pads.padding || { x: 0, y: 0, z: 0 };
      const origin = pads.origin || { x: 0, y: 0, z: 0 };

      const padScale = {
        x: (totalScale.x - padding.x * (nx - 1)) / nx,
        y: (totalScale.y - padding.y * (ny - 1)) / ny,
        z: (totalScale.z - padding.z * (nz - 1)) / nz,
      };

      const list = [];
      let counter = 1;

      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          for (let iz = 0; iz < nz; iz++) {
            list.push({
              id: `${prefix}${counter++}`,
              position: {
                x: origin.x + ix * (padScale.x + padding.x) + padScale.x / 2,
                y: origin.y + iy * (padScale.y + padding.y) + padScale.y / 2,
                z: origin.z - iz * (padScale.z + padding.z) - padScale.z / 2,
              },
              scale: { ...padScale },
            });
          }
        }
      }
      return list;
    }

    return [pads];
  }

  function transformPads(existingPads, incomingPads) {
    const map = {};

    // 1. Copy existing pads
    for (const pad of existingPads) {
      map[pad.id] = pad;
    }

    // 2. Copy incoming (expanded or custom) → overwrite duplicates
    for (const pad of incomingPads) {
      map[pad.id] = pad;
    }

    return Object.values(map);
  }

  function transformSinglePad(pad) {
    const result = {};
    for (const k in pad) {
      const val = pad[k];
      // Check if it's a Vector3-like object
      if (val && typeof val === "object" && "x" in val && "y" in val && "z" in val && Object.keys(val).length === 3) {
        result[k] = new THREE.Vector3(val.x, val.y, val.z);
      } else if (typeof val === "string" && val.startsWith("0x")) {
        result[k] = new THREE.Color(parseInt(val));
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        // Recursively transform nested objects
        result[k] = transformSinglePad(val);
      } else {
        result[k] = val;
      }
    }
    return result;
  }

  function transform(obj, key = null, parent = null, isAlreadyTransformed = false) {
    if (Array.isArray(obj)) {
      // If this is an already-transformed histogramPads array, don't transform again
      if (isAlreadyTransformed) {
        return obj;
      }
      return obj.map((o) => transform(o, key, obj, false));
    }

    if (obj && typeof obj === "object") {
      // histogramPads special case
      if (key === "histogramPads") {
        const incoming = expandHistogramPads(obj);

        // Transform each pad individually
        const transformedIncoming = incoming.map(pad => transformSinglePad(pad));

        // Check if we have existing pads to merge with
        const existingPads = existingConfig?.config?.environment?.histogramPads;
        if (existingPads && Array.isArray(existingPads)) {
          return transformPads(existingPads, transformedIncoming);
        }

        return transformedIncoming;
      }

      // Vector3 auto-convert
      if ("x" in obj && "y" in obj && "z" in obj && Object.keys(obj).length === 3) {
        return new THREE.Vector3(obj.x, obj.y, obj.z);
      }

      // Regular object
      const result = {};
      for (const k in obj) {
        // Mark histogramPads results as already transformed
        const childIsTransformed = k === "histogramPads";
        result[k] = transform(obj[k], k, obj, childIsTransformed);
      }

      if (!("target" in result)) {
        result.target = { entity: "*", id: "*" };
      }

      return result;
    }

    if (typeof obj === "string" && obj.startsWith("0x")) {
      return new THREE.Color(parseInt(obj));
    }

    return obj;
  }

  return transform(data);
}
