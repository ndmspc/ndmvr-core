# Canvas Subject

## Overview

The Canvas Subject is a singleton RxJS-based communication channel for managing and broadcasting canvas-related events and data throughout the application. It uses a `ReplaySubject` to ensure that the latest canvas state is always available to new subscribers.

## Class Structure

```javascript
class CanvasSubject {
  #subject;  // Private ReplaySubject(1)
}
```

## Methods

### constructor()

Creates a new `CanvasSubject` instance with a `ReplaySubject(1)`.

**Behavior:**
- Initializes a private `ReplaySubject` with buffer size of 1
- The buffer ensures the last emitted value is replayed to new subscribers

### getObservable()

Returns an Observable from the subject for subscribing to canvas updates.

**Returns:** `Observable` - Observable stream of canvas events and data

**Usage:**
```javascript
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';

canvasSubjectGet().getObservable().subscribe(canvasData => {
  console.log('Canvas updated:', canvasData);
});
```

### next(e)

Broadcasts new canvas data to all subscribers.

**Parameters:**
- `e` - The canvas event or data object to broadcast

**Usage:**
```javascript
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';

canvasSubjectGet().next({
  canvasId: 'canvas1',
  action: 'update',
  data: { /* canvas state */ }
});
```

## Singleton Pattern

The module exports a singleton accessor function:

```javascript
export const canvasSubjectGet = () => {
  if (!canvasSubject) canvasSubject = new CanvasSubject();
  return canvasSubject;
};
```

**Benefits:**
- Ensures only one instance exists throughout the application
- Provides global access to the canvas communication channel
- Maintains consistent state across all components

## Use Cases

1. **Canvas State Management:**
   - Broadcast canvas creation, updates, and deletion
   - Synchronize canvas state across multiple components

2. **Canvas Interaction Events:**
   - Communicate user interactions with canvas elements
   - Handle canvas selection and focus changes

3. **Canvas Configuration:**
   - Update canvas properties (position, scale, rotation)
   - Apply global canvas settings

4. **Multi-Canvas Coordination:**
   - Coordinate multiple canvases in the scene
   - Manage canvas visibility and layering

## Data Flow Example

```javascript
// Component A: Canvas component emits state
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';

function onCanvasCreated(canvas) {
  canvasSubjectGet().next({
    type: 'created',
    canvasId: canvas.id,
    pos: canvas.pos,
    dimensions: canvas.dimensions
  });
}

// Component B: UI subscribes to canvas updates
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';

canvasSubjectGet().getObservable().subscribe(event => {
  if (event.type === 'created') {
    addCanvasToList(event.canvasId);
  }
});
```

## Subject Type: ReplaySubject(1)

**Characteristics:**
- **Buffer Size:** 1 (stores the last emitted value)
- **Replay Behavior:** New subscribers immediately receive the last value
- **Use Case:** Ensures components always have access to current canvas state

## Event Types (Suggested)

While not enforced by the implementation, common event types might include:

- `created` - Canvas was created
- `updated` - Canvas properties changed
- `removed` - Canvas was removed
- `selected` - Canvas was selected by user
- `deselected` - Canvas was deselected

## Dependencies

- RxJS library (`ReplaySubject`)

## Related Components

- [Canvas Component](../visualization/canvas.md)
- [Histogram JSROOT](../visualization/histogram-jsroot.md)
- [Config Subject](config-subject.md)

## Best Practices

1. **Always use the singleton accessor:** Use `canvasSubjectGet()` instead of creating new instances
2. **Unsubscribe when done:** Always unsubscribe from observables in component cleanup
3. **Event structure:** Maintain consistent event object structure across the application
4. **Type definitions:** Consider defining TypeScript interfaces for canvas events
5. **Error handling:** Wrap subscriptions with error handlers for robustness

## Example: Complete Canvas Lifecycle

```javascript
import { canvasSubjectGet } from './rxjs/CanvasSubject.js';

// Subscribe to all canvas events
const subscription = canvasSubjectGet().getObservable().subscribe({
  next: (event) => {
    switch(event.type) {
      case 'created':
        console.log('Canvas created:', event.canvasId);
        break;
      case 'updated':
        console.log('Canvas updated:', event.canvasId);
        break;
      case 'removed':
        console.log('Canvas removed:', event.canvasId);
        break;
    }
  },
  error: (err) => console.error('Canvas subject error:', err)
});

// Emit canvas events
canvasSubjectGet().next({ type: 'created', canvasId: 'canvas1' });
canvasSubjectGet().next({ type: 'updated', canvasId: 'canvas1', sc: 1.5 });
canvasSubjectGet().next({ type: 'removed', canvasId: 'canvas1' });

// Cleanup
subscription.unsubscribe();
```
## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/CanvasSubject.js?ref_type=heads)
