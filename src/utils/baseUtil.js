import {Vector3, Color, TextureLoader, SRGBColorSpace, SpriteMaterial, Sprite} from "three";
import hnotFilledUrl from "../assets/HnotFilled.png";

export function appendPads(subjectValue, ids, disp_kind, { scale, padding, origin }) {
  // The raw config is inside subjectValue.config
  const rootCfg = subjectValue.config ?? {};

  if (!rootCfg.environment) rootCfg.environment = {};
  if (!rootCfg.environment.histogramPads)
    rootCfg.environment.histogramPads = [];

  const pads = rootCfg.environment.histogramPads;

  // ------------------------
  // 1. Extract grid settings
  // ------------------------
  let rows = 1;
  let cols = ids.length;

  if (typeof disp_kind === "string") {
    // Match gridNxM or grid2x2 or grid3x4 etc.
    const m = disp_kind.match(/^grid(\d+)x(\d+)$/i);
    if (m) {
      rows = parseInt(m[1], 10);
      cols = parseInt(m[2], 10);
    } else if (disp_kind === "simple") {
      rows = 1;
      cols = ids.length;
    }
    // flex layout -> treat horizontally
    else if (disp_kind === "flex") {
      rows = 1;
      cols = ids.length;
    }
  }

  // Guard: if grid smaller than IDs, expand
  const totalCells = rows * cols;
  if (totalCells < ids.length) {
    cols = Math.ceil(Math.sqrt(ids.length));
    rows = Math.ceil(ids.length / cols);
  }

  // -------------------------------------
  // 2. Place each pad in a grid layout
  // -------------------------------------
  let currentRow = 0;
  let currentCol = 0;

  ids.forEach(id => {
    const posX =
      origin.x +
      currentCol * (scale.x + padding.x) +
      scale.x / 2;

    const posY =
      origin.y +
      (rows - 1 - currentRow) * (scale.y + padding.y) +
      scale.y / 2;

    const posZ =
      origin.z -
      scale.z / 2;

    pads.push({
      id,
      position: { x: posX, y: posY, z: posZ },
      scale: { ...scale },
      padding: { ...padding },
      origin: { ...origin },
      grid: {
        row: currentRow,
        col: currentCol,
        rows,
        cols,
        disp_kind
      }
    });

    // Move to next grid cell
    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }
  });

  return subjectValue; // preserve shape
}

export function ensureDefaultBindings(config) {
  const defaults = {
    resetHistogram: "r",
    goToPreviousLayer: "z",
    hideOutlines: "o"
  };

  config.bindings = config.bindings || {};

  for (const key in defaults) {
    if (!config.bindings.hasOwnProperty(key)) {
      config.bindings[key] = defaults[key];
    }
  }

  return config;
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

      const padScale = new Vector3(
        (totalScale.x - padding.x * (nx - 1)) / nx,
        (totalScale.y - padding.y * (ny - 1)) / ny,
        (totalScale.z - padding.z * (nz - 1)) / nz,
      );

      const list = [];
      let counter = 1;

      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          for (let iz = 0; iz < nz; iz++) {
            list.push({
              id: `${prefix}${counter++}`,
              position: new Vector3(
                origin.x + ix * (padScale.x + padding.x) + padScale.x / 2,
                origin.y + iy * (padScale.y + padding.y) + padScale.y / 2,
                origin.z - iz * (padScale.z + padding.z) - padScale.z / 2,
              ),
              scale: padScale.clone(),
            });
          }
        }
      }
      return list;
    }
    return [pads];
  }

  function transformSinglePad(pad) {
    const result = {};
    for (const k in pad) {
      const val = pad[k];
      // Check if it's a Vector3-like object
      if (val && typeof val === "object" && "x" in val && "y" in val && "z" in val && Object.keys(val).length === 3) {
        result[k] = new Vector3(val.x, val.y, val.z);
      } else if (typeof val === "string" && val.startsWith("0x")) {
        result[k] = new Color(parseInt(val));
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

        // Transform each pad individually and RETURN directly (no merging)
        return incoming.map(pad => transformSinglePad(pad));
      }

      // Vector3 auto-convert
      if ("x" in obj && "y" in obj && "z" in obj && Object.keys(obj).length === 3) {
        return new Vector3(obj.x, obj.y, obj.z);
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
      return new Color(parseInt(obj));
    }

    return obj;
  }

  function deepMerge(existing, incoming) {
    // If no existing config, return incoming as-is
    if (!existing) return incoming;

    // Handle arrays - replace entirely with incoming
    if (Array.isArray(incoming)) {
      return incoming;
    }

    // Handle non-objects - incoming overwrites existing
    if (!incoming || typeof incoming !== "object") {
      return incoming;
    }

    // Handle special cases (Vector3, Color) - replace entirely
    if (incoming instanceof Vector3 || incoming instanceof Color) {
      return incoming;
    }

    // Merge objects
    const result = { ...existing };

    for (const key in incoming) {
      const existingVal = existing[key];
      const incomingVal = incoming[key];

      // If value exists in both and both are plain objects, merge recursively
      if (
        existingVal &&
        typeof existingVal === "object" &&
        !Array.isArray(existingVal) &&
        !(existingVal instanceof Vector3) &&
        !(existingVal instanceof Color) &&
        incomingVal &&
        typeof incomingVal === "object" &&
        !Array.isArray(incomingVal) &&
        !(incomingVal instanceof Vector3) &&
        !(incomingVal instanceof Color)
      ) {
        result[key] = deepMerge(existingVal, incomingVal);
      } else {
        // Otherwise, incoming value overwrites existing
        result[key] = incomingVal;
      }
    }

    return result;
  }

  const transformedData = transform(data);
  return deepMerge(existingConfig, transformedData);
}

export function isObjectEmpty(obj) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}

export function createHnotFilledSprite(limits, setPointerToParent) {
  const texture = new TextureLoader().load(hnotFilledUrl);
  texture.colorSpace = SRGBColorSpace;

  const material = new SpriteMaterial({map: texture, transparent: true});


  const sprite = new Sprite(material);

  sprite.scale.set(...limits.scale);
  sprite.position.set(...limits.position);

  sprite.raycast = (e) => {
    if (e._triggerSource === "shiftmousedbclick") setPointerToParent();
  };

  return sprite;
}
