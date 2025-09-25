
export function parseConfig (json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;

  function expandHistogramPads (pads) {
    // If already array → return transformed version
    if (Array.isArray(pads)) return pads;

    // If object with "type" → expand into array
    if (pads && typeof pads === "object" && "type" in pads) {
      const prefix = pads.prefix ? pads.prefix : "histogram";
      const match = pads.type.match(/grid(\d+)x(\d+)x(\d+)/);
      if (!match) return [pads]; // fallback

      const nx = parseInt(match[1], 10);
      const ny = parseInt(match[2], 10);
      const nz = parseInt(match[3], 10);

      const scale = pads.scale || { x: 1, y: 1, z: 1 };
      const padding = pads.padding || { x: 0, y: 0, z: 0 };
      const origin = pads.origin || { x: 0, y: 0, z: 0 };

      const result = [];
      let counter = 1;

      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          for (let iz = 0; iz < nz; iz++) {
            result.push({
              id: `${prefix}${counter++}`,
              position: {
                x: origin.x + (ix - (nx - 1) / 2) * (scale.x + padding.x),
                y: origin.y + (iy - (ny - 1) / 2) * (scale.y + padding.y),
                z: origin.z + (iz - (nz - 1) / 2) * (scale.z + padding.z),
              },
              scale: { ...scale },
            });
          }
        }
      }
      return result;
    }

    // Otherwise → single object, wrap in array
    return [pads];
  }

  function transform (obj, key = null) {
    if (Array.isArray(obj)) {
      return obj.map((o) => transform(o, key));
    } else if (obj && typeof obj === "object") {
      // Special case for histogramPads
      if (key === "histogramPads") {
        return expandHistogramPads(obj).map((pad) => transform(pad));
      }

      // Check for {x,y,z}
      if (
        "x" in obj &&
        "y" in obj &&
        "z" in obj &&
        Object.keys(obj).length === 3
      ) {
        return new THREE.Vector3(obj.x, obj.y, obj.z);
      }

      const result = {};
      for (const k in obj) {
        result[k] = transform(obj[k], k);
      }

      // inject default target if missing
      if (!("target" in result)) {
        result.target = { entity: "*", id: "*" };
      }

      return result;
    } else if (typeof obj === "string" && obj.startsWith("0x")) {
      return new THREE.Color(parseInt(obj));
    } else {
      return obj;
    }
  }

  return transform(data);
}