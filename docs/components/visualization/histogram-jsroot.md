# HistogramJsrootClass

## Overview

The `HistogramJsrootClass` is a THREE.js-based histogram renderer that uses the JSROOT library to build and render 3D histogram visualizations. It provides interactive raycasting, event handling, bin information display, and supports dynamic configuration updates through RxJS subjects.

## Constructor

```javascript
constructor(id, rootObj, camera)
```

### Parameters

- **id** (`string`): Unique identifier for the histogram instance
- **rootObj** (`Object`): ROOT object (Not all objects are supported see related issues for more: [issue1](https://github.com/root-project/jsroot/issues/368), [issue2](https://github.com/root-project/jsroot/issues/373))
- **camera** (`THREE.Camera`): THREE.js camera reference for positioning and interaction

### Created Objects

- **histogramGroup** (`THREE.Group`): Main container for all ROOT object meshes
- **binInfoComponent** (`BinInfoVisualizer`): Visualizer for displaying bin information
- **configSub** (`Subscription`): Subscribes to configuration updates
- **buildPromise** (`Promise`): Tracks the histogram building process

## Properties

### Core Properties

- **id** (`string`): Object identifier
- **rootObj** (`Object`): Current ROOT object
- **camera** (`THREE.Camera`): Camera reference
- **histogramGroup** (`THREE.Group`): THREE.js group containing histogram meshes
- **binInfoComponent** (`BinInfoVisualizer`): Bin information display component

### Event Management

- **mouseEvents** (`Array`): Collection of registered mouse event handlers
- **defaultRaycastHandler** (`Function`): Original THREE.js raycast function
- **color** (`THREE.Color`): Current color for bin highlighting
- **colorTarget** (`THREE.Color`): Target color for hover effects (cyan)
- **dirtyInstance** (`number`): Index of currently highlighted bin

### Subscriptions

- **configSub** (`Subscription`): Configuration updates from `configSubjectGet()`
- **sub** (`Subscription`): Function/event management from `functionSubjectGet()`

## Methods

### updateHistogram(histo)

Updates the histogram with new ROOT data.

**Parameters:**
- **histo** (`Object`): New ROOT object

**Behavior:**
- Clears existing Three.js group
- Rebuilds visualization with new data
- Maintains camera and configuration settings

### renderWithBuild3d()

Renders the histogram using JSROOT's `build3d` function.

**Returns:** `Promise<void>`

**Behavior:**
- Uses JSROOT `build3d()` to create THREE.js meshes
- Applies scaling and rotation based on configuration
- Adjusts position and orientation for proper display
- Sets up custom raycast handler for interaction
- Handles errors during build process

### raycastHandler(raycaster, intersects)

Custom raycaster implementation for histogram interaction.

**Parameters:**
- **raycaster** (`THREE.Raycaster`): THREE.js raycaster instance
- **intersects** (`Array`): Array of intersection objects

**Behavior:**
- Processes raycaster intersections with histogram bins
- Calculates bin indices from instanced mesh intersections
- Computes bin content, error, and coordinate ranges
- Triggers registered mouse event handlers
- Updates bin information display

### addEvent(event, func)

Registers an event handler for mouse or keyboard interactions.

**Parameters:**
- **event** (`string | Object`): Event name or keyboard event object with `state` and `key`
- **func** (`Function`): Handler function to execute

**Supported Events:**
- `"mouseclick"` - Single click
- `"shiftmouseclick"` - Shift + click
- `"mousedbclick"` - Double click
- `"shiftmousedbclick"` - Shift + double click
- `"mousemove"` - Mouse movement
- Keyboard events with `{state: "keydown"|"keyup", key: "KeyCode"}`

### removeEvent(event, func)

Removes a registered event handler.

**Parameters:**
- **event** (`string | Object`): Event identifier
- **func** (`Function`): Handler function reference to remove

### Default Event Handlers

#### mouseClickDefault(event)
Default handler for mouse clicks.

#### mousemoveDefault(event)
Highlights hovered bins and displays bin information.

**Behavior:**
- Applies color tint to hovered bin
- Reverts color of previously hovered bin
- Updates `BinInfoVisualizer` with bin data
- Publishes bin information to `binInfoSubjectGet()`

#### shiftMouseClickDefault(event)
Default handler for shift+click events.

#### mouseDBClickDefault(event)
Default handler for double-click events.

#### shiftMouseDBClickDefault(event)
Default handler for shift+double-click events.

### getInstancedMesh(node)

Recursively searches for the InstancedMesh in the histogram group.

**Parameters:**
- **node** (`THREE.Object3D`): Starting node (defaults to `histogramGroup`)

**Returns:** `THREE.InstancedMesh | null`

### getRangeByPosition(position)

Calculates axis ranges for given bin positions.

**Parameters:**
- **position** (`Array<Object>`): Array of position objects with `x`, `y`, `z` properties

**Returns:** `Object` with axis ranges including `min`, `max`, `name`, `title`, and `color`

### remove()

Cleans up all resources and subscriptions.

**Behavior:**
- Removes histogram group from parent
- Removes dummy DOM element
- Unsubscribes from all RxJS subscriptions
- Disposes of THREE.js resources

### getHistogramMesh()

Returns the main histogram group.

**Returns:** `THREE.Group`

## Usage Example

```javascript
import { HistogramJsrootClass } from './histogram-jsroot-class.js';
import * as THREE from 'three';

// Create a scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create histogram instance
const histogram = new HistogramJsrootClass('histogram1', rootHistogramObject, camera);

// Add to scene
scene.add(histogram.getHistogramMesh());

// Update with new data
histogram.updateHistogram(newRootHistogramObject);

// Add custom event handler
histogram.addEvent('mouseclick', (intersection, histogramInstance) => {
  console.log('Clicked bin:', intersection.coords);
  console.log('Bin content:', intersection.content);
});

// Clean up when done
histogram.remove();
```

## Event System

The class integrates with `functionSubjectGet()` for dynamic event management:

```javascript
import { functionSubjectGet } from '../rxjs/FunctionSubject.js';

// Add event handler remotely
functionSubjectGet().next({
  flag: 'add',
  target: { id: 'histogram1' },
  event: 'mouseclick',
  function: (intersection, histogram) => {
    console.log('Remote click handler', intersection);
  }
});

// Remove event handler
functionSubjectGet().next({
  flag: 'remove',
  target: { id: 'histogram1' },
  event: 'mouseclick'
});
```

## Configuration Integration

The class subscribes to `configSubjectGet()` for dynamic updates:

```javascript
import { configSubjectGet } from '../rxjs/ConfigSubject.js';

// Update histogram position and scale
configSubjectGet().next({
  target: { id: 'histogram1' },
  config: {
    environment: {
      histogramPads: [{
        id: 'histogram1',
        pos: { x: 0, y: 1, z: -2 },
        sc: { x: 1, y: 1, z: 1 }
      }]
    }
  }
});
```

## Dependencies

- **THREE.js**: Core 3D rendering (`Group`, `Color`, `Box3`, `Vector3`)
- **JSROOT**: `build3d` for histogram rendering
- **RxJS**: `filter` operator, Subject subscriptions
- **Internal Classes**:
  - `BinInfoVisualizer` from `./bininfo-jsroot-class.js`
- **RxJS Subjects**:
  - `configSubjectGet` from `../rxjs/ConfigSubject.js`
  - `functionSubjectGet` from `../rxjs/FunctionSubject.js`
  - `canvasSubjectGet` from `../rxjs/CanvasSubject.js`
  - `binInfoSubjectGet` from `../rxjs/BinInfoSubject.js`

## Related Components

- [BinInfoVisualizer](bin-info-jsroot.md) - Bin information display
- [THnPainter](thnpainter.md) - Alternative histogram rendering
- [NdmvrRaycaster](ndmvr-raycaster.md) - Scene-level raycasting

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/component/histogram-jsroot-class.js?ref_type=heads)
