# BinInfoVisualizer

## Overview

The `BinInfoVisualizer` class creates a 3D panel in THREE.js that displays histogram bin information. It uses JSROOT's TLatex for text rendering and automatically positions itself in front of the camera. The visualizer subscribes to an RxJS subject queue for efficient, non-blocking updates.

## Constructor

```javascript
constructor(camera, options = {})
```

### Parameters

- **camera** (`THREE.Camera`): Camera reference for billboard positioning
- **options** (`Object`): Configuration options for styling and layout

### Options Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `backgroundColor` | `number` | `0xAAAAAA` | Panel background color (hex) |
| `textColor` | `number` | `1` | ROOT color index for text |
| `titleColor` | `number` | `0` | ROOT color index for title |
| `padding` | `number` | `0.002` | Padding around text (THREE.js units) |
| `lineHeight` | `number` | `0.002` | Height per line of text |
| `textSize` | `number` | `10` | Font size for text |
| `width` | `number` | `0.031` | Panel width |

### Created Objects

- **group** (`THREE.Group`): Container for panel and text elements
- **queue** (`RxJS.Subject`): Event queue for bin data updates
- **queueSub** (`RxJS.Subscription`): Manages sequential processing of updates

## Properties

- **camera** (`THREE.Camera`): Reference to the camera
- **options** (`Object`): Merged configuration options
- **loader** (`FontLoader`): THREE.js font loader instance
- **queue** (`Subject`): RxJS subject for queuing bin data
- **queueSub** (`Subscription`): Subscription managing update queue
- **group** (`THREE.Group`): THREE.js group containing the visualization

## Methods

### parseData(data)

Extracts and formats display information from bin data.

**Parameters:**
- **data** (`Object`): Bin information object

**Returns:** `Array<Object>` - Array of line objects with `text` and `isTitle` properties

**Parsed Information:**
- Title (if present)
- Coordinate ranges for each axis (x, y, z)
- Bin index and position
- Bin content value
- Bin error (if present)

### createBackgroundPanel(height)

Creates the background panel for the info display.

**Parameters:**
- **height** (`number`): Panel height in THREE.js units

**Returns:** `THREE.Mesh` - Panel mesh with configured material

**Material:**
- `PlaneGeometry` sized to fit content
- `MeshBasicMaterial` with configured background color
- `DoubleSide` rendering

### updateVisualization(data)

Updates the 3D visualization with new bin information.

**Important:** This method is called automatically by the queue subject. Do not call directly - use `queue.next(data)` instead.

**Parameters:**
- **data** (`Object`): Bin data to visualize (or `null` to clear)

**Behavior:**
- Clears previous visualization
- Parses data into display lines
- Creates background panel
- Renders each line using JSROOT TLatex
- Positions panel in front of camera
- Attaches to camera for billboard effect

**Async Processing:**
- Uses RxJS `concatMap` for sequential updates
- Prevents concurrent updates that could cause race conditions
- Queues latest event while processing

### getGroup()

Returns the THREE.Group containing the visualization.

**Returns:** `THREE.Group`

### setPosition(x, y, z)

Manually sets the position of the info panel.

**Parameters:**
- **x, y, z** (`number`): Position coordinates

**Note:** Position is typically managed automatically by the camera attachment.

### setRotation(x, y, z)

Manually sets the rotation of the info panel.

**Parameters:**
- **x, y, z** (`number`): Rotation angles in radians

### clear()

Clears all content from the panel.

**Behavior:**
- Removes all children from group
- Disposes geometries and materials

### dispose()

Cleans up all resources and subscriptions.

**Behavior:**
- Unsubscribes from queue subject
- Removes all children from group
- Disposes all geometries and materials

## Usage Example

```javascript
import { BinInfoVisualizer } from './bininfo-jsroot-class.js';
import * as THREE from 'three';

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create visualizer with custom options
const binInfo = new BinInfoVisualizer(camera, {
  backgroundColor: 0x36454F,  // Charcoal gray
  textColor: 0,               // Black text
  titleColor: 0,              // Black title
  padding: 0.003,
  width: 0.04
});

// Add to scene (typically attached to camera automatically)
const scene = new THREE.Scene();
scene.add(camera);

// Queue bin data for display
binInfo.queue.next({
  title: 'Histogram Bin Info',
  coords: [{
    x: { min: 0.5, max: 1.5, name: 'X Axis', title: 'X' },
    y: { min: 2.0, max: 3.0, name: 'Y Axis', title: 'Y' },
    z: { min: 1.0, max: 2.0, name: 'Z Axis', title: 'Z' }
  }],
  index: [{ x: 1, y: 2, z: 1 }],
  content: 42.7,
  error: 2.3,
  object: { bins: [15] },
  instanceId: 15,
  point: { x: 1, y: 1.5, z: 1.5 }
});

// Clear display
binInfo.queue.next(null);

// Clean up when done
binInfo.dispose();
```

## Integration with HistogramJsrootClass

The `BinInfoVisualizer` is automatically created by `HistogramJsrootClass` and receives updates from mouse interactions:

```javascript
import { HistogramJsrootClass } from './histogram-jsroot-class.js';

const histogram = new HistogramJsrootClass('hist1', rootObject, camera);

// The bin info visualizer is available at:
// histogram.binInfoComponent

// It receives updates automatically from mousemove events
// through the histogram's raycast handler
```

## RxJS Subject Integration

The visualizer can be driven by RxJS subjects for decoupled architecture:

```javascript
import { binInfoSubjectGet } from '../rxjs/BinInfoSubject.js';

// Subscribe visualizer to subject
const subscription = binInfoSubjectGet()
  .subscribe(binData => {
    binInfo.queue.next(binData);
  });

// Publish bin data from anywhere
binInfoSubjectGet().next({
  coords: [/* ... */],
  content: 100,
  error: 5
});
```

## Text Rendering with TLatex

The visualizer uses JSROOT's TLatex for text rendering, which supports:
- ROOT-style text formatting
- ROOT color indices
- Scalable vector text
- LaTeX-like syntax

Each line is created using:
```javascript
const latex = create("TLatex");
latex.fTitle = "X = [0.5, 1.5)";
latex.fTextAlign = 12;
latex.fTextFont = 2;
latex.fTextColor = 0;  // ROOT color index
const textGroup = await build3d(latex, "p", y * 100, "", "");
```

## Billboard Behavior

The panel is attached to the camera and positioned at a fixed distance in front of it, ensuring:
- Always faces the user
- Readable from any angle
- Maintains consistent size
- Positioned near the point of interaction

## Queue Processing

The `concatMap` operator ensures:
- Sequential processing of updates
- No race conditions from concurrent builds
- Latest event is queued if update arrives during processing
- Non-blocking asynchronous rendering

## Dependencies

- **THREE.js**: `Group`, `Mesh`, `MeshBasicMaterial`, `PlaneGeometry`, `DoubleSide`, `Box3`, `Vector3`
- **THREE.js Addons**: `TextGeometry`, `FontLoader`
- **JSROOT**: `create`, `build3d` for TLatex rendering
- **RxJS**: `Subject`, `from`, `concatMap`, `finalize`, `EMPTY`
- **RxJS Subjects**:
  - `canvasSubjectGet` from `../rxjs/CanvasSubject.js`

## Related Components

- [HistogramJsrootClass](histogram-jsroot.md) - Creates and manages BinInfoVisualizer
- [THnPainter](thnpainter.md) - Alternative histogram that can use bin info
- [NdmvrRaycaster](ndmvr-raycaster.md) - Provides raycasting for interaction

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/component/bininfo-jsroot-class.js?ref_type=heads)
