# NdmvrRaycaster

## Overview

The `NdmvrRaycaster` class provides scene-level raycasting functionality for THREE.js applications. It handles mouse movement and click events, casting rays through the scene to detect intersections with 3D objects. The class distinguishes between single clicks, double clicks, and shift-modified clicks, and assigns a `_triggerSource` property to the raycaster for event identification.

## Constructor

```javascript
constructor(scene, rendererElement)
```

### Parameters

- **scene** (`THREE.Object3D`): THREE.js scene or object to traverse for intersections. Must contain a camera as a child.
- **rendererElement** (`HTMLElement`): DOM element attached to the renderer, used for mouse coordinate calculations

### Initialization

- Sets up mouse tracking with `THREE.Vector2`
- Creates `THREE.Raycaster` instance
- Finds camera in scene hierarchy
- Configures double-click timeout (default 190ms)
- Subscribes to configuration updates via `configSubjectGet()`

## Properties

### Core Properties

- **raycaster** (`THREE.Raycaster`): THREE.js raycaster instance
- **mouse** (`THREE.Vector2`): Normalized device coordinates (-1 to +1)
- **cameraElement** (`THREE.Camera`): Camera found in scene hierarchy
- **sceneElement** (`THREE.Object3D`): Scene object to raycast against
- **rendererElement** (`HTMLElement`): Renderer DOM element reference

### Event Management

- **singleClickTimer** (`number | null`): Timeout ID for single click detection
- **dbClickTimeout** (`number`): Double-click threshold in milliseconds (default 190)
- **lastClick** (`number`): Timestamp of last click for double-click detection
- **raycastOn** (`boolean`): Toggle for enabling/disabling raycasting

### Performance

- **checkInterval** (`number`): Minimum interval between mousemove checks (1ms)
- **lastCheck** (`number`): Timestamp of last mousemove check

### Subscriptions

- **configSub** (`RxJS.Subscription`): Configuration updates subscription

## Methods

### setupRaycasting()

Initializes event listeners for mouse interactions.

**Behavior:**
- Adds `mousemove` event listener to window
- Adds `click` event listener to window
- Binds event handlers to instance context

### destroyRaycasting()

Removes event listeners for mouse interactions.

**Behavior:**
- Removes `mousemove` event listener
- Removes `click` event listener

### toggleRaycasting()

Toggles raycasting on/off.

**Behavior:**
- If enabled, calls `setupRaycasting()`
- If disabled, calls `destroyRaycasting()`
- Updates `raycastOn` state

### mousemoveEventHandle(event)

Handles mouse movement with throttling.

**Parameters:**
- **event** (`MouseEvent`): Browser mouse event

**Behavior:**
- Throttles updates based on `checkInterval`
- Prevents excessive raycasting during fast mouse movement
- Calls `updateRaycaster()` at controlled intervals

### clickEventHandle(event)

Handles click and double-click detection.

**Parameters:**
- **event** (`MouseEvent`): Browser click event

**Behavior:**
- Calculates normalized mouse coordinates
- Detects double-clicks based on `dbClickTimeout`
- Distinguishes shift-modified clicks
- Sets `raycaster._triggerSource` to:
  - `"mouseclick"` - Single click
  - `"shiftmouseclick"` - Shift + click
  - `"mousedbclick"` - Double click
  - `"shiftmousedbclick"` - Shift + double click
- Calls `handleRaycast()` with appropriate delay

### updateRaycaster(event)

Updates raycaster with current mouse position.

**Parameters:**
- **event** (`MouseEvent`): Browser mouse event

**Behavior:**
- Converts mouse coordinates to normalized device coordinates
- Updates `raycaster.setFromCamera()`
- Sets `_triggerSource` to `"mousemove"`
- Performs intersection test with scene children

### handleRaycast()

Processes raycaster intersections.

**Behavior:**
- Calls `raycaster.intersectObjects()` on scene children
- Recursively checks all descendants
- Returns array of intersections

**Note:** Individual objects handle their own raycast logic through custom `raycast` methods.

## Trigger Source Identification

The raycaster's `_triggerSource` property identifies the event type:

| Trigger Source | Description |
|----------------|-------------|
| `"mousemove"` | Mouse cursor movement |
| `"mouseclick"` | Single left click |
| `"shiftmouseclick"` | Shift + left click |
| `"mousedbclick"` | Double left click |
| `"shiftmousedbclick"` | Shift + double click |

Custom `raycast` methods on objects can check this property:
```javascript
mesh.raycast = function(raycaster, intersects) {
  // Call default raycast
  this.defaultRaycast(raycaster, intersects);

  // Handle based on trigger
  if (raycaster._triggerSource === 'mouseclick') {
    console.log('Object was clicked');
  }
};
```

## Usage Example

```javascript
import { NdmvrRaycaster } from './ndmvr-raycaster-class.js';
import * as THREE from 'three';

// Create scene with camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.pos.z = 5;
scene.add(camera);

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create raycaster
const raycaster = new NdmvrRaycaster(scene, renderer.domElement);

// Add interactive object with custom raycast handler
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

// Store original raycast
cube.defaultRaycast = cube.raycast.bind(cube);

// Custom raycast handler
cube.raycast = function(raycaster, intersects) {
  this.defaultRaycast(raycaster, intersects);

  if (intersects.length > 0) {
    const trigger = raycaster._triggerSource;
    console.log(`Cube intersected by: ${trigger}`);

    if (trigger === 'mouseclick') {
      this.material.color.set(0xff0000);
    } else if (trigger === 'mousedbclick') {
      this.material.color.set(0x0000ff);
    }
  }
};

scene.add(cube);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

## Configuration Integration

The raycaster subscribes to configuration updates for double-click timing:

```javascript
import { configSubjectGet } from '../rxjs/ConfigSubject.js';

// Update double-click timeout
configSubjectGet().next({
  config: {
    environment: {
      dbClickTimeout: 250  // milliseconds
    }
  }
});
```

## Performance Optimization

### Mousemove Throttling

The `checkInterval` property (default 1ms) throttles mousemove events:
```javascript
const now = performance.now();
if (now - this.lastCheck < this.checkInterval) return;
this.lastCheck = now;
```

This prevents excessive raycasting during fast mouse movement.

### Double-Click Detection

Single clicks are delayed by `dbClickTimeout` to allow double-click detection:
- First click: Wait for timeout before triggering single click
- Second click within timeout: Clear single click timer, trigger double click
- Second click after timeout: Treated as new single click

## Integration with Histogram Classes

Both `HistogramJsrootClass` and `THnPainter` override the default mesh `raycast` method to implement custom intersection handling:

```javascript
// In HistogramJsrootClass
const mesh = this.getInstancedMesh();
if (mesh) {
  this.defaultRaycastHandler = mesh.raycast.bind(mesh);
  mesh.raycast = this.raycastHandler.bind(this);
}
```

The histogram's custom raycast handler:
1. Calls default THREE.js raycast
2. Filters intersections for instanced meshes
3. Calculates bin indices from instance IDs
4. Triggers registered event handlers based on `_triggerSource`

## Dependencies

- **THREE.js**: `Raycaster`, `Vector2`
- **RxJS**: Configuration subscription
- **RxJS Subjects**:
  - `configSubjectGet` from `../rxjs/ConfigSubject.js`

## Related Components

- [HistogramJsrootClass](histogram-jsroot.md) - Uses custom raycast handlers
- [THnPainter](thnpainter.md) - Uses custom raycast handlers with BVH optimization
- [BinInfoVisualizer](bin-info-jsroot.md) - Receives data from raycast events

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/core/ndmvr-raycaster-class.js?ref_type=heads)
