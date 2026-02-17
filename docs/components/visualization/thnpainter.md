# THnPainter

## Overview

The `THnPainter` class is a high-performance THREE.js histogram renderer for nested ROOT histograms (THn). It uses instanced rendering with custom shaders, implements BVH (Bounding Volume Hierarchy) for optimized raycasting, and supports hierarchical navigation through nested histogram layers. The class extends `TPainter` and integrates with RxJS subjects for state management and bin information display.

## Constructor

```javascript
constructor(histo, id, opts)
```

### Parameters

- **histo** (`Object`): ROOT histogram object (TH1, TH2, TH3, or THn)
- **id** (`string`): Unique identifier for the histogram instance
- **opts** (`Object`): Configuration options (extends from `TPainter`)

### Initialization

- Creates `HistogramPointerClass` for navigation
- Subscribes to `stateSubjectGet()` for state changes
- Initializes instanced buffer geometry
- Creates wireframe representation
- Renders initial layer (layer 0)

## Properties

### Core Components

- **pointer** (`HistogramPointerClass`): Manages navigation through nested histogram hierarchy
- **wireframe** (`HistogramWireframeClass`): Bin outlines visualization component
- **mesh** (`THREE.Mesh`): Main instanced mesh with custom shader material
- **instGeom** (`THREE.InstancedBufferGeometry`): Geometry with per-instance attributes
- **material** (`THREE.ShaderMaterial`): Custom shader for gradient coloring

### Rendering Data

- **matrixCache** (`Array`): Cached position/scale data for all instances per layer
- **BVHTree** (`Array`): Bounding volume hierarchy for optimized raycasting
- **maxInstancesPerLayer** (`Array<number>`): Maximum instances per hierarchy layer
- **maxContentPerLayer** (`Object`): Maximum bin content per layer and set
- **minContentPerLayer** (`Object`): Minimum bin content per layer and set
- **totalInstances** (`number`): Total number of instances across all layers

### Instance Attributes

- **instancePositions** (`Float32Array`): Per-instance position data (x, y, z)
- **instanceScales** (`Float32Array`): Per-instance scale data (x, y, z)
- **instanceColors** (`Float32Array`): Per-instance color indices for gradient
- **colorArray** (`Float32Array`): Color palette for gradient shader (32 colors × 6 channels)

### State Management

- **selectedSet** (`Array<string>`): Currently selected data sets
- **selectedArray** (`string`): Currently selected array ('content' or custom arrays)
- **availableSets** (`Array<string>`): Available data sets in histogram
- **renderHistory** (`Array<Object>`): History of render operations for state reconstruction
- **stateSub** (`RxJS.Subscription`): State change subscription

### Interaction

- **dirtyInstance** (`Array`): Indices of currently highlighted instances

## Methods

### updateHistogram(histo)

Updates the histogram with new data.

**Parameters:**
- **histo** (`Object`): Object containing new ROOT histogram in `obj` property

**Behavior:**
- Preserves raycast handler
- Clears caches and trees
- Disposes old geometry and wireframe
- Reinitializes with new data
- Re-renders histogram

### remove()

Cleans up all resources.

**Behavior:**
- Calls `super.remove()`
- Clears matrix cache
- Disposes geometry
- Removes mesh from parent
- Disposes wireframe
- Unsubscribes from state subject

### init()

Initializes histogram rendering data structures.

**Behavior:**
- Sets available sets and arrays from histogram
- Computes max/min content per layer
- Calculates total instance count
- Sets up instanced buffer geometry
- Creates wireframe with configuration

### setupMatrixCache()

Creates cache structure for instance transformations.

**Structure:**
- Array of objects per layer
- Each layer contains `pos`, `scale`, and `rendered` arrays
- For histograms with sets, last layer is array of objects per set
- Pre-allocated Float32Arrays for performance

### setupInsBufGeom()

Creates instanced buffer geometry with custom attributes.

**Behavior:**
- Calls `setupMatrixCache()`
- Creates `InstancedBufferGeometry` with base box
- Sets up instance attributes: position, scale, colorIndex
- Creates custom shader material
- Fills color array from configuration
- Creates mesh with custom raycast handler

### renderHistogram(startIndex, endIndex, layer)

Renders histogram bins for specified range and layer.

**Parameters:**
- **startIndex** (`number`): Linear index to start rendering from
- **endIndex** (`number`): Linear index to end rendering at
- **layer** (`number`): Hierarchy layer to render (0 = top layer)

**Behavior:**
- Recursively processes histogram hierarchy
- Calculates bin positions and scales based on content
- Applies padding and scale factors from configuration
- Handles TH1, TH2, and TH3 differently
- Updates matrix cache with rendered instances
- Creates BVH tree for raycasting
- Updates wireframe visualization

**Rendering Logic:**
- Content scaling: Maps bin content to scale factor (min/max)
- Gradient coloring: Maps content to color gradient
- Layer-specific padding and scale configuration
- Set-based rendering for multi-dataset histograms

### pushVisibleInstances()

Transfers visible instances from cache to GPU.

**Behavior:**
- Counts visible instances (rendered !== -1)
- Pre-allocates exact-size arrays
- Copies position, scale, and color data
- Creates new `InstancedBufferGeometry`
- Updates mesh with new geometry
- Disposes old geometry

### setMatrixCacheAt(layer, setIndex, index, binSizePos, rendered)

Updates matrix cache at specific position.

**Parameters:**
- **layer** (`number`): Layer index
- **setIndex** (`number | null`): Set index or null for content
- **index** (`number`): Instance index within layer
- **binSizePos** (`Object`): Position and size for x, y, z axes
- **rendered** (`number`): Color index (-1 for hidden)

### createMaterial()

Creates custom shader material with gradient support.

**Returns:** `THREE.ShaderMaterial`

**Features:**
- Vertex shader applies per-instance transformations
- Fragment shader renders per-instance colors
- Supports 32-color gradient array
- Smooth interpolation between gradient stops

**Shader Code:**
```glsl
// Vertex Shader
attribute vec3 instancePosition;
attribute vec3 instanceScale;
attribute float instanceColorIndex;
uniform vec3 colorArray[32];
varying vec3 vColor;

void main() {
  vec3 transformed = position * instanceScale + instancePosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);

  float colorIndex = clamp(instanceColorIndex, 0.0, 31.9999);
  int idx0 = int(floor(colorIndex));
  int idx1 = int(ceil(colorIndex));
  float t = fract(colorIndex);
  vColor = mix(colorArray[idx0], colorArray[idx1], t);
}

// Fragment Shader
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
```

### Event Handlers

#### mouseClickDefault(event)
Shows child histogram and publishes to canvas subject.

#### mousemoveDefault(event)
Updates bin information display via `binInfoSubjectGet()`.

**Behavior:**
- Checks if index changed from previous event
- Merges parent path with current event
- Publishes minimized event with coords, content, error, set

#### shiftMouseClickDefault(event)
Hides child histogram.

#### mouseDBClickDefault(event)
Navigates to child histogram (drill-down).

#### shiftMouseDBClickDefault(event)
Navigates to parent histogram (drill-up).

### Navigation Methods

#### setPointerToChild(position, set)

Drills down into nested histogram.

**Parameters:**
- **position** (`Array<Object>`): Array of positions with x, y, z
- **set** (`string`): Set name if applicable

**Behavior:**
- Clears matrix cache and BVH tree
- Disposes old geometry and wireframe
- Updates pointer to child
- Reinitializes and renders new view

#### setPointerToParent()

Navigates back to parent histogram.

**Behavior:**
- Clears matrix cache and BVH tree
- Disposes old geometry and wireframe
- Updates pointer to parent
- Reinitializes and renders new view

#### showChildHistogram(position)

Renders child histogram without navigation.

**Parameters:**
- **position** (`Array<Object>`): Bin positions

**Behavior:**
- Calculates index and range
- Calls `renderHistogram()` for next layer
- Adds detailed histogram view while keeping parent

#### hideChildHistogram(position)

Hides child histogram and shows parent bin.

**Parameters:**
- **position** (`Array<Object>`): Bin positions

**Behavior:**
- Clears matrix cache range for child
- Re-renders parent layer
- Restores bin representation

### Raycasting

#### raycastHandler(raycaster)

Custom raycast implementation using BVH tree.

**Parameters:**
- **raycaster** (`THREE.Raycaster`): Raycaster with `_triggerSource` property

**Behavior:**
- Uses `checkIntersectionBVH()` for optimized intersection
- Calls `intersectionHandler()` with results
- Handles trigger source identification

#### checkIntersectionBVH(ray)

Performs BVH-accelerated ray intersection.

**Parameters:**
- **ray** (`THREE.Ray`): Ray to test intersections

**Returns:** `Array<Object>` - Sorted intersections with metadata

**Algorithm:**
1. Recursively traverses BVH tree
2. Tests ray against bounding boxes
3. Uses DFS for leaf node discovery
4. Sorts results by distance
5. Returns intersection with full context:
   - `index`: Multi-dimensional bin position
   - `instanceId`: Linear instance index
   - `jsrootInstance`: JSROOT bin indices
   - `range`: Axis ranges
   - `content`: Bin content value
   - `error`: Bin error
   - `set`: Dataset name (if applicable)

### State Management

#### handleStateChange(state)

Responds to state changes from `stateSubjectGet()`.

**Parameters:**
- **state** (`Object`): New state with sets, selectedSet, arrays, selectedArray

**Behavior:**
- Checks if sets/arrays changed
- Updates selected set and array
- Re-renders histogram if needed
- Replays render history for consistency

#### setAvailableSets(origin)

Recursively finds available sets in histogram.

**Parameters:**
- **origin** (`Object`): ROOT histogram object

**Behavior:**
- Traverses histogram hierarchy
- Identifies data sets in `children` property
- Updates `stateSubjectGet()` with available sets

#### setAvailableArrays(origin)

Identifies custom arrays in histogram.

**Parameters:**
- **origin** (`Object`): ROOT histogram object

**Behavior:**
- Extracts keys from `fArrays` property
- Always includes 'content' as first option
- Updates `stateSubjectGet()` with available arrays

### Utility Methods

#### clearMatrixCacheRange(startIndex, multiplier, dimensions, baseLayerIndex)

Clears matrix cache for a range of bins.

**Parameters:**
- **startIndex** (`number`): Starting linear index
- **multiplier** (`number`): Range size
- **dimensions** (`Array<number>`): Instances per layer
- **baseLayerIndex** (`number`): Starting layer

#### getBinContent(obj, posX, posY, posZ, selectedArray)

Gets bin content from histogram or custom array.

**Parameters:**
- **obj** (`Object`): ROOT histogram object
- **posX, posY, posZ** (`number`): Bin positions (0-indexed)
- **selectedArray** (`string`): Array name

**Returns:** `number` - Bin content value

#### logRender(obj)

Logs render operations to history.

**Parameters:**
- **obj** (`Object`): Render operation details

**Purpose:** Enables state reconstruction when selected set changes

#### keyDownHandler(event)

Handles keyboard shortcuts.

**Supported Keys:**
- `Digit1-9` or `Numpad1-9`: Render specific layer
- Configured `hideOutlines`: Toggle wireframe visibility
- Configured `resetHistogram`: Reset to original view
- Configured `goToPreviousLayer`: Navigate to parent

### resetHistogram()

Resets histogram to initial state.

**Behavior:**
- Calls `updateHistogram()` with original root object
- Clears navigation history
- Returns to top-level view

## Usage Example

```javascript
import { THnPainter } from './THnPainter.js';
import * as THREE from 'three';

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create histogram painter
const painter = new THnPainter(rootHistogramObject, 'histogram1', {
  padding: {
    default: { x: 0.1, y: 0.1, z: 0.1 },
    layer: [{ x: 0.05, y: 0.05, z: 0.05 }]
  },
  sc: {
    default: { min: 0.1, max: 1.0 }
  },
  color: {
    gradient: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000']
  },
  wireframe: {
    visible: true,
    color: 0x888888
  }
});

// Add to scene
scene.add(painter.mesh);
scene.add(painter.wireframe.wireframe);

// Custom event handler
painter.addEvent('mouseclick', (intersection, painterInstance) => {
  console.log('Clicked bin:', intersection.index);
  console.log('Content:', intersection.content);
  console.log('Range:', intersection.range);
});

// Drill down to child
painter.mouseDBClickDefault({
  index: [{ x: 5, y: 3, z: 2 }],
  set: 'dataSet1'
});

// Navigate back
painter.shiftMouseDBClickDefault({});

// Update with new data
painter.updateHistogram({ obj: newRootHistogramObject });

// Clean up
painter.remove();
```

## State Integration

```javascript
import { stateSubjectGet } from '../rxjs/StateSubject.js';

// Get current state
const currentState = stateSubjectGet().getValue();
console.log('Available sets:', currentState.sets);
console.log('Selected set:', currentState.selectedSet);
console.log('Available arrays:', currentState.arrays);

// Change selected set
stateSubjectGet().next({
  ...currentState,
  selectedSet: ['dataSet2', 'dataSet3']
});

// Change selected array
stateSubjectGet().next({
  ...currentState,
  selectedArray: 'customArray1'
});
```

## Performance Optimizations

### Instanced Rendering
- Uses `InstancedBufferGeometry` for rendering thousands of bins
- Single draw call per histogram
- GPU-efficient attribute updates

### BVH Tree
- Hierarchical bounding volumes for raycasting
- O(log n) intersection tests instead of O(n)
- Recursive tree traversal with early exit

### Matrix Cache
- Pre-computed transformations stored in typed arrays
- Avoids recalculation during navigation
- Efficient memory layout for GPU transfer

### Render History
- Records render operations for state replay
- Avoids full re-render on state changes
- Maintains visual consistency during navigation

## Configuration

The painter accepts extensive configuration through `opts`:

```javascript
{
  padding: {
    default: { x: 0.1, y: 0.1, z: 0.1 },
    layer: [/* per-layer padding */],
    sets: { x: 0.05, y: 0, z: 0 }  // padding between sets
  },
  scale: {
    default: { min: 0.1, max: 1.0 },
    layer: [/* per-layer scale */]
  },
  color: {
    gradient: ['#color1', '#color2', ...],  // up to 32 colors
    mode: 'gradient' | 'solid'
  },
  sets: {
    scale: {
      maximum: 'absolute' | 'relative'  // scale relative to layer or global
    }
  },
  wireframe: {
    visible: true,
    color: 0x888888,
    linewidth: 1
  },
  TH1ZScale: {
    default: 0.1,
    layer: [/* per-layer z-scale for TH1 */],
    set: 0.01  // z-scale for set rendering
  }
}
```

## Dependencies

- **THREE.js**: Core rendering, instanced geometry, custom shaders
- **JSROOT**: Histogram data structures
- **RxJS**: State management, bin info publishing
- **Internal Classes**:
  - `TPainter` (parent class) from `./TPainter.js`
  - `HistogramPointerClass` from `../core/histogram-pointer-class.js`
  - `HistogramWireframeClass` from `./histogram-wireframe-class.js`
- **RxJS Subjects**:
  - `stateSubjectGet` from `../rxjs/StateSubject.js`
  - `canvasSubjectGet` from `../rxjs/CanvasSubject.js`
  - `binInfoSubjectGet` from `../rxjs/BinInfoSubject.js`
- **Utilities**: Extensive histogram utilities from `../utils/histogramUtils.js`

## Related Components

- [HistogramJsrootClass](histogram-jsroot.md) - JSROOT-based alternative renderer
- [BinInfoVisualizer](bin-info-jsroot.md) - Receives bin information
- [NdmvrRaycaster](ndmvr-raycaster.md) - Scene-level raycasting infrastructure

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/component/THnPainter.js?ref_type=heads)
