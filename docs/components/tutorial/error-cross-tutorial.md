# Error Cross — Beginner's Step-by-Step Guide

This tutorial walks you through the error cross feature from first principles. By the end you will understand what error crosses are, why each line of code exists, and how to extend the feature yourself.

No prior Three.js experience is required, but you should be comfortable with JavaScript classes and arrays.

---

## Table of Contents
1. [What Is an Error Cross?](#1-what-is-an-error-cross)
2. [What Tools Does the Code Use?](#2-what-tools-does-the-code-use)
3. [Step 1 — Define All Three Arms in One Shape](#step-1--define-all-three-arms-in-one-shape)
4. [Step 2 — Scale the Arms to Show Error Values](#step-2--scale-the-arms-to-show-error-values)
5. [Step 3 — Draw Thousands of Crosses in One Go](#step-3--draw-thousands-of-crosses-in-one-go)
6. [Step 4 — Add the GPU Shader](#step-4--add-the-gpu-shader)
7. [Step 5 — Put It All Together as ErrorCrossClass](#step-5--put-it-all-together-as-errorcrossclass)
8. [Step 6 — Wire It Up to a Histogram](#step-6--wire-it-up-to-a-histogram)
9. [Configuration Reference](#configuration-reference)
10. [Common Problems and Fixes](#common-problems-and-fixes)

---

## 1. What Is an Error Cross?

A **histogram bin** stores a count — how many particle collisions landed in that bin. But every count has an **uncertainty**: if you re-ran the same experiment you would get a slightly different count. That uncertainty is called the **statistical error**.

An error cross is a small cross-shaped marker drawn on top of each bin to show its error visually. It has three arms:

```
        |          ← Y arm (vertical): length = statistical error of this bin
        |
--------+--------  ← X arm (horizontal): width = physical bin width in X
        |
        |
       (into screen) ← Z arm (depth): depth = physical bin depth in Z
```

The Y arm is the important one — the longer it is relative to other bins, the larger the statistical error. A bin with a very tight Y arm is trustworthy; a long one should be treated with caution.

The X and Z arms track the bin's physical size, so together the cross shows both where the bin sits in space and how uncertain its count is.

**Key design choice:** arm lengths are *proportional*. The bin with the biggest error gets the longest Y arm (`MAX_ARM_LENGTH = 2.0`). Every other bin's Y arm is scaled relative to that maximum. This makes it easy to spot outliers at a glance.

---

## 2. What Tools Does the Code Use?

The error cross is built on [Three.js](https://threejs.org), a JavaScript library that talks to your GPU via WebGL. You only need to know four Three.js concepts for this feature:

| Concept | Plain English |
|---------|--------------|
| `BufferGeometry` | A shape defined by a list of 3D points |
| `LineSegments` | Draws lines between pairs of points — point 0→1, point 2→3, etc. |
| `InstancedBufferGeometry` | Lets you draw the *same* shape in thousands of positions with one GPU draw call |
| `ShaderMaterial` | Custom code that runs directly on the GPU to position and colour each vertex |

---

## Step 1 — Define All Three Arms in One Shape

Rather than creating three separate geometries (one per arm), the implementation packs all three arms into a single `BufferGeometry`. This means the entire cross can be drawn with one GPU draw call per bin, instead of three.

```javascript
import { BufferGeometry, BufferAttribute } from "three";

// Six points — three pairs of endpoints.
// Each arm is naturally aligned to its own axis, so only one component is non-zero per pair.
const ARM_POSITIONS = new Float32Array([
  0, -0.5,  0,    0,  0.5,  0,   // Y arm: bottom to top
 -0.5,  0,  0,   0.5,  0,  0,   // X arm: left to right
  0,  0, -0.5,   0,  0,  0.5,   // Z arm: front to back
]);

const ARM_GEOMETRY = new BufferGeometry();
ARM_GEOMETRY.setAttribute("position", new BufferAttribute(ARM_POSITIONS, 3));
```

**Why does this work?**

`LineSegments` reads points in pairs: pair 0–1 is one segment, pair 2–3 is the next, pair 4–5 is the third. So those six points define exactly three line segments — one per axis.

More importantly, each pair only extends along its own axis. The Y arm is `(0, ±0.5, 0)` — X and Z are zero. The X arm is `(±0.5, 0, 0)` — Y and Z are zero. This property is what lets the shader scale each arm independently using a single `vec3` — more on that in Step 4.

`ARM_GEOMETRY` is a module-level constant defined once. All histogram instances share the same base shape; only the per-instance data differs.

---

## Step 2 — Scale the Arms to Show Error Values

A cross that is always 1 unit wide is useless for comparing errors. We need to scale each arm per bin, but rewriting GPU geometry every frame is slow. The fast way is to keep the geometry constant and pass a **per-instance scale vector** to the shader.

**How the Y arm length is calculated:**

```javascript
const MAX_ARM_LENGTH = 2.0; // the longest any Y arm can be

// Pass 0: find the biggest error in the visible range first
let maxError = 0;
for (let layer = startLayer; layer <= lastLayer; layer++) {
  maxError = Math.max(maxError, this._computeMaxError(matrixCache[layer]));
}

// Pass 1: for each visible bin
let armLength;
if (maxError > 0 && error > 0) {
  armLength = (error / maxError) * MAX_ARM_LENGTH; // proportional to the max
} else {
  armLength = this.config.minArmLength; // 0.05 — still visible for zero-error bins
}
```

The bin with the highest error maps to `armLength = 2.0`. A bin with half that error maps to `armLength = 1.0`. A bin with zero error gets the minimum `0.05` so it is still visible.

**What goes in the scale vector?**

```javascript
scale[out]     = cScale[base]     * 0.5;   // X: half the bin's physical width
scale[out + 1] = armLength;                 // Y: the statistical error arm
scale[out + 2] = cScale[base + 2] * 0.5;   // Z: half the bin's physical depth
```

The Y component carries the error. The X and Z components carry half the bin's physical dimensions, so the horizontal arms show where the bin sits in space.

---

## Step 3 — Draw Thousands of Crosses in One Go

A 3D histogram can have tens of thousands of bins. Drawing one `LineSegments` per bin means tens of thousands of GPU draw calls — this will freeze the browser.

The solution is **instanced rendering**: one `InstancedBufferGeometry` that holds the base cross shape, plus two per-instance arrays that say "draw this cross at position P with scale S".

```javascript
import { InstancedBufferGeometry, InstancedBufferAttribute } from "three";

const count = 5000; // one per visible bin

// Flat arrays — 3 numbers per instance
const pos   = new Float32Array(count * 3); // (x, y, z) centre of each cross
const scale = new Float32Array(count * 3); // (scaleX, scaleY, scaleZ) per cross

// ... fill those arrays from the histogram data ...

const instGeom = new InstancedBufferGeometry();
instGeom.instanceCount = count;

// The base shape — same for every instance
instGeom.setAttribute("position",         ARM_GEOMETRY.attributes.position);

// Per-instance data — advances once per cross, not per vertex
instGeom.setAttribute("instancePosition", new InstancedBufferAttribute(pos,   3));
instGeom.setAttribute("instanceScale",    new InstancedBufferAttribute(scale, 3));

const lines = new LineSegments(instGeom, material);
scene.add(lines);
// → ONE draw call renders all 5000 crosses (15000 line endpoints)
```

The key difference from a plain `BufferGeometry`:
- `BufferAttribute` — same value for every vertex.
- `InstancedBufferAttribute` — advances once per *instance* (i.e. once per bin), not once per vertex.

Because all three arms live in one geometry, there is only one `InstancedBufferGeometry` and one `LineSegments` for the entire feature.

---

## Step 4 — Add the GPU Shader

A `ShaderMaterial` lets you write custom GLSL code that runs on the GPU. There are two stages:

1. **Vertex shader** — runs once per vertex and decides where on screen that vertex lands.
2. **Fragment shader** — runs once per pixel and decides what colour that pixel is.

Here is the vertex shader used for error crosses:

```glsl
// Per-instance data uploaded from JavaScript
attribute vec3 instancePosition; // centre of this cross (top of the rendered bin)
attribute vec3 instanceScale;    // (halfBinWidth, armLength, halfBinDepth)

void main() {
  // Scale the base arm shape: each axis is multiplied by its own scale component.
  // The factor 2.0 undoes the ÷2 baked into the base geometry (which goes -0.5 to +0.5).
  vec3 pos = position * instanceScale * 2.0;

  // Shift the cross to its bin's position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + instancePosition, 1.0);
}
```

**Why does one `instanceScale` vec3 control all three arms?**

Because of the way the base geometry was laid out in Step 1, each arm only has one non-zero component in the base `position` attribute:

| Arm | base `position.x` | base `position.y` | base `position.z` |
|-----|------------------|------------------|------------------|
| Y arm | 0 | ±0.5 | 0 |
| X arm | ±0.5 | 0 | 0 |
| Z arm | 0 | 0 | ±0.5 |

When the shader multiplies `position * instanceScale`, each arm only "feels" its own axis of the scale vector:

- Y arm vertices: `(0 * scaleX, ±0.5 * scaleY, 0 * scaleZ)` → extends along Y by `scaleY`
- X arm vertices: `(±0.5 * scaleX, 0 * scaleY, 0 * scaleZ)` → extends along X by `scaleX`
- Z arm vertices: `(0 * scaleX, 0 * scaleY, ±0.5 * scaleZ)` → extends along Z by `scaleZ`

The cross-axis components zero out automatically. No special handling needed.

The fragment shader is straightforward — it just returns the configured colour:

```glsl
uniform vec3 crossColor; // set from JavaScript

void main() {
  gl_FragColor = vec4(crossColor, 1.0); // RGBA, alpha = 1 = fully opaque
}
```

---

## Step 5 — Put It All Together as ErrorCrossClass

Now that you understand each piece, here is how they combine in [ErrorCrossClass.js](src/component/ErrorCrossClass.js).

### The constructor

```javascript
constructor(histogramConfig, id) {
  this.id       = id;
  this.lines    = undefined; // the single LineSegments for all three arms
  this.instGeom = undefined; // the InstancedBufferGeometry backing it
  this.material = undefined; // the ShaderMaterial from Step 4

  this.config   = this._mergeConfig(histogramConfig && histogramConfig.errorCross);
  this.material = this._createMaterial();  // builds the ShaderMaterial
  this._buildGeometry(0, null);            // creates empty geometry (0 instances)
  this.lines.visible = this.config.enabled;
}
```

`_buildGeometry(0, null)` is called with no data yet — it creates the Three.js objects so the scene graph can reference them straight away. Real data arrives later via `pushVisibleInstances`.

### Rebuilding when the histogram changes

Every time you navigate to a new layer, `pushVisibleInstances` is called. It does four things in order:

**1. Remove the old geometry from the scene**

```javascript
const parent = this.lines && this.lines.parent ? this.lines.parent : null;
if (parent) parent.remove(this.lines);
if (this.instGeom) this.instGeom.dispose(); // free GPU memory
```

Because there is only one `LineSegments` object, only one remove and one dispose are needed.

**2. Find the maximum error (for normalisation)**

```javascript
let maxError = 0;
for (let layer = startLayer; layer <= lastLayer; layer++) {
  const ld = matrixCache[layer];
  // handles both flat layer data and sets within a layer
  maxError = Math.max(maxError, this._computeMaxError(ld));
}
```

This is the reference value. All Y arm lengths will be proportional to it.

**3. Fill the instance buffers**

```javascript
const pos   = new Float32Array(count * 3); // one (x, y, z) per visible bin
const scale = new Float32Array(count * 3); // one (scaleX, scaleY, scaleZ) per visible bin

this._fillArrays(layerData, pos, scale, idx, maxError);
```

Inside `_fillArrays`, for each visible bin:

```javascript
// Centre point: top of the rendered bin
pos[out]     = cPos[base];                      // X
pos[out + 1] = cPos[base + 1] + cScale[base + 1] * 0.5; // Y = bin top
pos[out + 2] = cPos[base + 2];                  // Z

// Scale: Y carries the error arm; X and Z carry the bin's physical half-dimensions
scale[out]     = cScale[base]     * 0.5;  // half bin width  (X arm)
scale[out + 1] = armLength;               // error arm       (Y arm)
scale[out + 2] = cScale[base + 2] * 0.5; // half bin depth  (Z arm)
```

**4. Build new geometry and add it back**

```javascript
this._buildGeometry(count, { pos, scale });
if (parent) parent.add(this.lines);
```

`_buildGeometry` wraps the filled arrays in `InstancedBufferAttribute` objects and attaches them to a fresh `InstancedBufferGeometry` — exactly as shown in Step 3.

---

## Step 6 — Wire It Up to a Histogram

You do not call `ErrorCrossClass` directly. `THnPainter` owns it and calls `pushVisibleInstances` automatically during its render cycle. The error cross object is only created when `errorCross.enabled` is explicitly set to `true` in the histogram config.

To use error crosses, pass an `errorCross` block in your histogram config:

```javascript
import { THnPainter } from './component/THnPainter.js';

const config = {
  errorCross: {
    enabled: true,
    color:   "0x00ffff", // cyan
  }
};

const painter = new THnPainter(rootHistogram, 'my-histogram', config);
```

That is all you need. The crosses will appear on every rendered layer automatically.

### Toggle visibility at runtime

```javascript
const errorCross = painter.errorCross;

errorCross.setVisible(false); // hide
errorCross.setVisible(true);  // show
```

`setVisible` sets the `visible` flag on the single `lines` object, which Three.js skips during rendering.

You can also enable the feature after construction by sending a config update through `THnPainter`. If `errorCross.enabled` is `true` in the updated config and no `errorCross` object exists yet, `THnPainter` will create one and add it to the scene automatically.

### Hover to inspect error values

When error crosses are enabled, `THnPainter` hides the histogram bin cubes visually by setting `colorWrite = false` and `depthWrite = false` on the bin mesh material. The mesh stays in the scene so raycasting still works — it is invisible but pickable.

Hovering over or clicking a bin therefore triggers the standard bin info panel, which displays the bin's statistical error value alongside its coordinates and content:

```
x = [0.50, 1.00)
error x = 0.25000
y = 142
error y = 11.92
```

The `error y` line comes from the `error` field emitted through `binInfoSubjectGet()` on each hover event. No extra setup is needed — the panel appears automatically as long as the `bininfo-jsroot` component is present in the scene.

### Change the colour at runtime

```javascript
painter.errorCross.setColor("0xFF0000"); // red
```

`setColor` updates both `this.config.color` and the shader uniform so the change applies immediately without a geometry rebuild.

### Read a specific bin's error

The matrix cache only holds `pos`, `scale`, `rendered`, and `error` per layer — there is no `content` field. To get the bin count you need to look at the original ROOT object:

```javascript
const layer    = 0;   // which layer of the histogram
const binIndex = 42;  // which bin within that layer

const error = painter.matrixCache[layer].error[binIndex];
console.log(`Bin ${binIndex}: error = ${error}`);
```

---

## Configuration Reference

```javascript
errorCross: {
  enabled:      true,       // must be true — feature is skipped entirely when false
  color:        "0x00ffff", // arm colour as a hex string
  display: {
    start: 0,               // first histogram layer to show crosses on
    end:   99,              // last histogram layer (inclusive)
  },
  minArmLength: 0.05,       // Y arm length for bins whose error is exactly zero
}
```

**Important:** if `enabled` is `false` (the default), `THnPainter` never creates the `errorCross` object at construction time. `setVisible(true)` will silently do nothing if the object was never created. To enable the feature after construction, send a config update with `errorCross.enabled: true` — `THnPainter` will create and attach the object on the fly.

**Limit the display range** if performance matters. Rebuilding 100 layers of geometry is slower than rebuilding 20:

```javascript
display: { start: 0, end: 19 } // only the first 20 layers
```

---

## Common Problems and Fixes

### "I can't see any error crosses"

Work through this checklist in order:

```javascript
// 1. Was the feature enabled at construction time?
if (!painter.errorCross) {
  console.log("errorCross was never created — did you pass enabled: true in config?");
}

// 2. Was the geometry built?
if (!painter.errorCross.lines) console.log("lines object missing");

// 3. Is it in the scene?
if (!painter.errorCross.lines?.parent) console.log("lines not added to scene");

// 4. Is it marked visible?
console.log("visible:", painter.errorCross.lines?.visible);

// 5. Is there anything to show?
const layerData = painter.matrixCache[0];
const visibleCount = layerData?.rendered?.filter(x => x !== -1).length ?? 0;
console.log("Visible bins in layer 0:", visibleCount);

// 6. Is the display range covering the current layer?
console.log("display range:", painter.errorCross.config.display);
```

### "The crosses look stale after data changed"

The geometry needs to be rebuilt. Force a full refresh:

```javascript
painter.clearHistogram();
painter.render();
```

### "The colour from my config isn't showing up"

Set it directly on the material:

```javascript
const mat = painter.errorCross.material;
mat.uniforms.crossColor.value = [1.0, 0.0, 0.0]; // red in 0–1 range
mat.uniformsNeedUpdate = true;
```

Or use the helper method (preferred — it also updates `this.config`):

```javascript
painter.errorCross.setColor("0xFF0000");
```

### "Things feel slow with many layers"

Narrow the display range first — that is almost always the bottleneck:

```javascript
errorCross: { display: { start: 0, end: 19 } }
```

If it is still slow, open the browser DevTools → Performance tab, record one layer-change, and look for a long spike in `pushVisibleInstances`. That will tell you exactly how long the geometry rebuild is taking.

---

## What to Build Next

The single-geometry approach makes adding new visual features straightforward. The cross currently draws six vertices per bin (two per arm) with a single `instanceScale` vec3 controlling the spread of each arm.

**Good first extensions to try:**

- **Colour by error magnitude** — instead of a single `crossColor` uniform, pass the arm length as a second per-instance attribute and use it in the fragment shader to lerp between two colours (e.g. blue for small errors → red for large ones). Add an `InstancedBufferAttribute` for it alongside `instanceScale`.
- **Tick marks** — draw short horizontal dashes at the tips of the Y arm to show ±1σ clearly. You could add four more vertices to `ARM_POSITIONS` (two pairs) and adjust `instanceScale` to position them at ±armLength.
- **Per-bin colour** — instead of a uniform `crossColor`, pass an `instanceColor` attribute (3 floats per bin) so each bin can have a different hue based on its z-position or content.

To add any of these, the general pattern is:
1. Decide whether you need new base geometry vertices or just new per-instance attributes.
2. Allocate the extra buffer inside `pushVisibleInstances`.
3. Fill it inside `_fillArrays`.
4. Attach it as an `InstancedBufferAttribute` inside `_buildGeometry`.
5. Read the new attribute in the vertex or fragment shader.

---

*Last updated: May 2026 — reflects ErrorCrossClass with single combined ARM_GEOMETRY, proportional Y arm lengths, and `instanceScale` vec3 shader attribute.*
