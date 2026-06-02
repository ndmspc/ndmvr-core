import {
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  ShaderMaterial,
} from "three";

// Combined base geometry: all three arms in one draw call.
// Y arm: (0,-0.5,0) → (0,+0.5,0)
// X arm: (-0.5,0,0) → (+0.5,0,0)
// Z arm: (0,0,-0.5) → (0,0,+0.5)
const ARM_POSITIONS = new Float32Array([
  0, -0.5,  0,    0,  0.5,  0,
  -0.5,  0,  0,   0.5,  0,  0,
  0,  0, -0.5,   0,  0,  0.5,
]);
const ARM_GEOMETRY = new BufferGeometry();
ARM_GEOMETRY.setAttribute("position", new BufferAttribute(ARM_POSITIONS, 3));

// Maximum arm half-length in scene units — arms extend from -MAX_ARM to +MAX_ARM.
const MAX_ARM_LENGTH = 2.0;

// Default config
const DEFAULT_ERROR_CROSS_CONFIG = {
  enabled:      false,
  display:      { start: 0, end: 99 },
  color:        "0x00ffff",
  showXArm:     true,
  showZArm:     true,
  minArmLength: 0.05,  // Shown for bins whose error is zero
};

//  ErrorCrossClass
//
// A single LineSegments object draws all three arms (Y, X, Z) per bin in one
// GPU draw call. Each instance has a position (bin top) and a uniform scale
// (arm half-length proportional to the bin's statistical error).
//
export class ErrorCrossClass {

  constructor(histogramConfig, id) {
    this.id       = id;
    this.lines    = undefined;
    this.instGeom = undefined;
    this.material = undefined;
    this.config    = this._mergeConfig(histogramConfig && histogramConfig.errorCross);
    this.material  = this._createMaterial();
    this._buildGeometry(0, null);
    this.lines.visible = this.config.enabled;
  }

  // Public API

  pushVisibleInstances(rootObj, matrixCache, maxInstancesPerLayer, setIndex, scaleFactors, count) {
    if (!this.config.enabled) return;

    const parent = this.lines && this.lines.parent ? this.lines.parent : null;
    if (parent) parent.remove(this.lines);
    if (this.instGeom) this.instGeom.dispose();

    const startLayer = this.config.display.start;
    const lastLayer  = Math.min(this.config.display.end, matrixCache.length - 1);

    // Pass 0: find the maximum error across all visible bins for normalisation.
    let maxError = 0;
    for (let layer = startLayer; layer <= lastLayer; layer++) {
      const ld = matrixCache[layer];
      if (!Array.isArray(ld)) {
        maxError = Math.max(maxError, this._computeMaxError(ld));
      } else {
        const sets = (setIndex >= 0 && setIndex < ld.length) ? [ld[setIndex]] : ld;
        for (let s = 0; s < sets.length; s++) {
          if (sets[s]) maxError = Math.max(maxError, this._computeMaxError(sets[s]));
        }
      }
    }

    const size  = Math.max(count, 1);
    const pos   = new Float32Array(size * 3);
    const scale = new Float32Array(size * 3);

    // Pass 2: fill instance buffers.
    let idx = 0;
    for (let layer = startLayer; layer <= lastLayer; layer++) {
      const ld = matrixCache[layer];
      if (!Array.isArray(ld)) {
        idx = this._fillArrays(ld, pos, scale, idx, maxError);
      } else {
        const sets = (setIndex >= 0 && setIndex < ld.length) ? [ld[setIndex]] : ld;
        for (let s = 0; s < sets.length; s++) {
          if (sets[s]) idx = this._fillArrays(sets[s], pos, scale, idx, maxError);
        }
      }
    }

    this._buildGeometry(count, { pos, scale });

    if (parent) parent.add(this.lines);
  }

  setColor(colorHex) {
    this.config.color = colorHex;
    const c = this._resolveColor(colorHex);
    this.material.uniforms.crossColor.value = [c.r, c.g, c.b];
    this.material.uniformsNeedUpdate = true;
  }

  setVisible(visible) {
    if (this.lines) this.lines.visible = visible;
  }

  dispose() {
    if (this.lines && this.lines.parent) this.lines.parent.remove(this.lines);
    if (this.instGeom) this.instGeom.dispose();
    if (this.material) this.material.dispose();
  }

  // Private

  _computeMaxError(ld) {
    const errors   = ld.error;
    const rendered = ld.rendered;
    let max = 0;
    for (let i = 0; i < rendered.length; i++) {
      if (rendered[i] !== -1 && errors[i] > max) max = errors[i];
    }
    return max;
  }

  _countVisible(ld) {
    const r = ld.rendered;
    let n = 0;
    for (let i = 0; i < r.length; i++) if (r[i] !== -1) n++;
    return n;
  }

  _fillArrays(ld, pos, scale, idx, maxError) {
    const cPos     = ld.pos;
    const cScale   = ld.scale;
    const rendered = ld.rendered;
    const errors   = ld.error;

    for (let i = 0; i < rendered.length; i++) {
      if (rendered[i] === -1) continue;

      const base  = i * 3;
      const out   = idx * 3;
      const error = errors[i] || 0;

      let armLength;
      if (maxError > 0 && error > 0) {
        armLength = (error / maxError) * MAX_ARM_LENGTH;
      } else {
        armLength = this.config.minArmLength;
      }

      // Centre: top of the rendered bin.
      pos[out]     = cPos[base];
      pos[out + 1] = cPos[base + 1] + cScale[base + 1] * 0.5;
      pos[out + 2] = cPos[base + 2];
      scale[out]     = this.config.showXArm ? cScale[base]     * 0.5 : 0;  // X bin half-width
      scale[out + 1] = armLength;                                            // Y error arm
      scale[out + 2] = this.config.showZArm ? cScale[base + 2] * 0.5 : 0;  // Z bin half-depth

      idx++;
    }
    return idx;
  }

  _buildGeometry(count, data) {
    const size = Math.max(count, 1);

    this.instGeom = new InstancedBufferGeometry();
    this.instGeom.instanceCount = count;
    this.instGeom.frustumCulled = false;
    this.instGeom.setAttribute("position", ARM_GEOMETRY.attributes.position);

    const pos   = data ? data.pos   : new Float32Array(size * 3);
    const scale = data ? data.scale : new Float32Array(size * 3);

    this.instGeom.setAttribute("instancePosition", new InstancedBufferAttribute(pos,   3));
    this.instGeom.setAttribute("instanceScale",    new InstancedBufferAttribute(scale, 3));

    this.lines = new LineSegments(this.instGeom, this.material);
    this.lines.frustumCulled = false;
    this.lines.name = "errorCross_" + this.id;
  }

  _resolveColor(color) {
    if (color && typeof color === "object" && color.isColor) return color;
    if (typeof color === "string") return new Color(parseInt(color, 16));
    return new Color(color);
  }

  _mergeConfig(partial) {
    if (!partial) return Object.assign({}, DEFAULT_ERROR_CROSS_CONFIG);
    const merged = Object.assign({}, DEFAULT_ERROR_CROSS_CONFIG, partial);
    merged.display = Object.assign({}, DEFAULT_ERROR_CROSS_CONFIG.display, partial.display || {});
    return merged;
  }

  _createMaterial() {
    const c = this._resolveColor(this.config.color);

    const vertexShader = [
      "attribute vec3 instancePosition;",
      "attribute vec3 instanceScale;",
      "void main() {",
      "  vec3 pos = position * instanceScale * 2.0;",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + instancePosition, 1.0);",
      "}"
    ].join("\n");

    const fragmentShader = [
      "uniform vec3 crossColor;",
      "void main() {",
      "  gl_FragColor = vec4(crossColor, 1.0);",
      "}"
    ].join("\n");

    return new ShaderMaterial({
      uniforms: { crossColor: { value: [c.r, c.g, c.b] } },
      vertexShader,
      fragmentShader,
      transparent: false,
    });
  }
}

export default ErrorCrossClass;
