# Canvas

## Overview

The `CanvasClass` creates a 3D canvas plane using THREE.js that can display ROOT canvas objects as textures in a 3D environment. It manages texture updates, transformation (position, rotation, scale), and subscribes to canvas and configuration subjects for reactive updates.

## Constructor

```javascript
constructor(image, position, rotation, sc, id)
```

**Parameters:**
- `image` - Initial image (optional): data URL, HTTP URL, or HTMLImageElement
- `position` - THREE.Vector3 or object with `{x, y, z}` coordinates
- `rotation` - THREE.Vector3 or object with `{x, y, z}` rotation in degrees
- `scale` - THREE.Vector3 or object with `{x, y, z}` scale factors
- `id` (string) - Unique identifier for this canvas instance

**Behavior:**
- Creates a `PlaneGeometry` with specified scale
- Creates a white `MeshBasicMaterial` with `DoubleSide` rendering
- Initializes texture if image is provided
- Subscribes to `canvasSubject` for canvas object updates
- Subscribes to `configSubject` for configuration changes

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `plane` | `THREE.Mesh` | The THREE.js mesh object representing the canvas |
| `cinemaSub` | `Subscription` | RxJS subscription to canvas subject |
| `configSub` | `Subscription` | RxJS subscription to config subject |
| `position` | `Vector3` | Current position of the canvas |
| `rotation` | `Vector3` | Current rotation of the canvas (degrees) |
| `scale` | `Vector3` | Current scale of the canvas |
| `id` | `string` | Unique identifier for this canvas |

## Methods

### updateMesh()

Updates the mesh transformation based on current position, rotation, and scale properties.

**Behavior:**
- Applies scale to the plane
- Sets position of the plane
- Converts rotation from degrees to radians and applies it

```javascript
updateMesh()
```

### updateTexture(image)

Updates the canvas texture with a new image.

**Parameters:**
- `image` - String (data URL or HTTP URL) or HTMLImageElement

**Supported Image Types:**
1. **Data URL**: `data:image/png;base64,...`
2. **HTTP URL**: `http://` or `https://` URLs
3. **HTMLImageElement**: Direct image element reference

**Behavior:**
- Loads texture using THREE.TextureLoader
- Updates material's texture map
- Handles async loading for URLs
- Direct assignment for HTMLImageElement
- Logs warning for null/undefined input
- Logs error for unsupported types

```javascript
canvas.updateTexture('data:image/png;base64,iVBORw0KGg...');
canvas.updateTexture('https://example.com/image.png');
canvas.updateTexture(imageElement);
```

### remove()

Removes the canvas from the scene and cleans up resources.

**Behavior:**
- Removes plane from its parent in the scene graph
- Unsubscribes from canvas subject
- Unsubscribes from config subject
- Only executes if plane has a parent

```javascript
canvas.remove();
```

### getPlane()

Returns the THREE.js mesh object representing the canvas.

**Returns:** `THREE.Mesh` - The canvas plane mesh

```javascript
const plane = canvas.getPlane();
scene.add(plane);
```

## Reactive Updates

### Canvas Subject Integration

The canvas subscribes to `canvasSubjectGet()` and filters events by ID:

**Matching Criteria:**
- Event ID matches canvas ID exactly
- Event ID is `"*"` (wildcard, targets all canvases)

**On Canvas Update:**
1. Receives ROOT canvas object via `obj.obj`
2. Converts object to PNG image using JSROOT's `makeImage()`
3. Image dimensions: 1200×600 pixels
4. Updates texture with generated PNG

```javascript
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';

canvasSubjectGet().next({
  id: 'canvas1',    // or "*" for all canvases
  obj: myRootObj   // ROOT object
});
```

### Config Subject Integration

The canvas subscribes to `configSubjectGet()` and filters events:

**Matching Criteria:**
- Config target ID includes `"*"` OR
- Config target ID includes canvas ID

**On Config Update:**
Extracts canvas configuration from:
```javascript
config.environment.canvas.pos  // {x, y, z}
config.environment.canvas.rot  // {x, y, z} in degrees
config.environment.canvas.sc     // {x, y, z}
```

Then calls `updateMesh()` to apply transformations.

## Complete Usage Example

```javascript
import { CanvasClass } from './component/canvas-class.js';
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';
import { configSubjectGet } from './rxjs/ConfigSubject.js';
import { Vector3 } from 'three';

// Create canvas
const canvas = new CanvasClass(
  null,                              // No initial image
  new Vector3(0, 1.6, -2),          // Position
  new Vector3(0, 0, 0),             // Rotation (degrees)
  new Vector3(1, 0.5, 1),           // Scale
  'canvas1'                          // ID
);

// Add to scene
scene.add(canvas.getPlane());

// Update canvas with ROOT object
canvasSubjectGet().next({
  id: 'canvas1',
  obj: myRootCanvas
});

// Update configuration
configSubjectGet().next({
  target: { id: ['canvas1'] },
  config: {
    environment: {
      canvas: {
        pos: { x: 0, y: 2, z: -3 },
        rot: { x: 0, y: 45, z: 0 },
        sc: { x: 1.5, y: 0.75, z: 1 }
      }
    }
  }
});

// Manual texture update
canvas.updateTexture('data:image/png;base64,...');

// Cleanup
canvas.remove();
```

## JSROOT Integration

The canvas uses JSROOT's `makeImage()` function to convert ROOT canvas objects to PNG:

```javascript
import { makeImage } from 'jsroot';

makeImage({
  format: "png",
  object: rootCanvasObject,
  width: 1200,
  height: 600
})
.then(png => {
  canvas.updateTexture(png);
});
```

## Error Handling

```javascript
// Warns about null/undefined
canvas.updateTexture(null);
// Console: "updateTexture called with null/undefined"

// Errors on unsupported types
canvas.updateTexture(123);
// Console: "Unsupported image type passed to updateTexture: 123"

// Handles texture load failures
canvas.updateTexture('https://invalid-url.com/image.png');
// Console: "Texture load failed" + error details
```

## Material Configuration

The canvas uses:
- **Geometry:** `THREE.PlaneGeometry` (1×1 base, scaled by constructor)
- **Material:** `THREE.MeshBasicMaterial`
  - `color`: `0xffffff` (white, allows texture colors to show)
  - `side`: `THREE.DoubleSide` (visible from both sides)
  - `map`: Updated with canvas texture

## Coordinate System

**Position:**
- Standard THREE.js right-handed coordinate system
- Y-up orientation

**Rotation:**
- Input: Degrees
- Conversion: Multiplied by `Math.PI / 180`
- Applied in XYZ order

**Scale:**
- Applied directly to geometry
- Uniform scale if all components equal
- Non-uniform scale supported

## Dependencies

- THREE.js: `Vector3`, `PlaneGeometry`, `MeshBasicMaterial`, `Color`, `DoubleSide`, `Mesh`, `TextureLoader`
- JSROOT: `makeImage`
- RxJS: `filter` operator
- Communication: `canvasSubjectGet`, `configSubjectGet`

## Related Components

- [Histogram JSROOT](histogram-jsroot.md) - 3D histogram visualization
- [Canvas Subject](../communication/canvas-subject.md) - Canvas communication channel
- [Config Subject](../communication/config-subject.md) - Configuration management

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/component/canvas-class.js?ref_type=heads)
