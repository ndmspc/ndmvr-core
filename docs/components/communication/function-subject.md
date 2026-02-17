# Function Subject

## Overview

The Function Subject is a singleton RxJS-based communication channel for dynamically adding and removing event handlers to histogram entities. It uses a `ReplaySubject` to manage function registration, ensuring that all function registrations are replayed to new subscribers.

## Class Structure

```javascript
class FunctionSubject {
  #subject;  // Private ReplaySubject
}
```

## Methods

### constructor()

Creates a new `FunctionSubject` instance with an unbounded `ReplaySubject`.

**Behavior:**
- Initializes a private `ReplaySubject` with no size limit
- All function add/remove operations are replayed to new subscribers
- Comment indicates: "only new functions are promoted to updated subscribers and all functions are promoted to new subscriber"

### addFunctions(input)

Registers one or more event handler functions to be attached to target entities.

**Parameters:**
- `input` - Single function object or array of function objects

**Function Object Structure:**
```javascript
{
  target: {
    entity: 'entity-type',  // e.g., 'histogram', 'canvas'
    id: 'entity-id' | ['id1', 'id2']  // Single ID or array of IDs
  },
  event: 'event-name',  // e.g., 'click', 'hover', 'instance-hover'
  function: handlerFunction  // The actual function to execute
}
```

**Behavior:**
- Accepts single object or array of objects
- Normalizes `target.id` to always be an array
- Emits event with `flag: "add"` for each function
- Broadcasts to all subscribers

**Usage:**
```javascript
import { functionSubjectGet } from './rxjs/FunctionSubject.js';

// Add single function
functionSubjectGet().addFunctions({
  target: {
    entity: 'histogram',
    id: 'histogram1'
  },
  event: 'click',
  function: (event) => {
    console.log('Histogram clicked:', event);
  }
});

// Add multiple functions
functionSubjectGet().addFunctions([
  {
    target: { entity: 'histogram', id: ['histo1', 'histo2'] },
    event: 'hover',
    function: onHover
  },
  {
    target: { entity: 'canvas', id: 'canvas1' },
    event: 'click',
    function: onCanvasClick
  }
]);
```

### removeFunctions(input)

Unregisters one or more event handler functions from target entities.

**Parameters:**
- `input` - Single function object or array of function objects

**Behavior:**
- Accepts single object or array of objects
- Normalizes `target.id` to always be an array
- Emits with `flag: "remove"` if event is specified
- Emits with `flag: "removeAll"` if no event specified (removes all handlers)
- Broadcasts to all subscribers

**Remove Modes:**
1. **Specific Event:** `flag: "remove"` - Removes specific event handler
2. **All Events:** `flag: "removeAll"` - Removes all handlers from target

**Usage:**
```javascript
import { functionSubjectGet } from './rxjs/FunctionSubject.js';

// Remove specific event handler
functionSubjectGet().removeFunctions({
  target: {
    entity: 'histogram',
    id: 'histogram1'
  },
  event: 'click',
  function: clickHandler
});

// Remove all handlers from entity (no event specified)
functionSubjectGet().removeFunctions({
  target: {
    entity: 'histogram',
    id: 'histogram1'
  }
});

// Remove from multiple entities
functionSubjectGet().removeFunctions({
  target: {
    entity: 'histogram',
    id: ['histo1', 'histo2']
  },
  event: 'hover'
});
```

### getObservable()

Returns an Observable for subscribing to function registration events.

**Returns:** `Observable` - Stream of function add/remove operations

**Event Structure:**
```javascript
{
  flag: 'add' | 'remove' | 'removeAll',
  target: {
    entity: string,
    id: string[]  // Always an array
  },
  event: string,  // Event name (may be undefined for removeAll)
  function: Function  // Handler function
}
```

**Usage:**
```javascript
import { functionSubjectGet } from './rxjs/FunctionSubject.js';

functionSubjectGet().getObservable().subscribe(operation => {
  const { flag, target, event, function: handler } = operation;

  target.id.forEach(id => {
    if (flag === 'add') {
      attachHandler(id, event, handler);
    } else if (flag === 'remove') {
      detachHandler(id, event, handler);
    } else if (flag === 'removeAll') {
      removeAllHandlers(id);
    }
  });
});
```

## Singleton Pattern

```javascript
export const functionSubjectGet = () => {
  if (!functionSubject) functionSubject = new FunctionSubject();
  return functionSubject;
};
```

## Subject Type: ReplaySubject (Unbounded)

**Characteristics:**
- **Buffer Size:** Unlimited (all operations are stored)
- **Replay Behavior:** All function registrations are replayed to new subscribers
- **Use Case:** Ensures late-subscribing components receive all function registrations
- **Memory Consideration:** May grow unbounded - consider cleanup strategies

## Use Cases

1. **Dynamic Event Handlers:**
   - Add click handlers to histograms at runtime
   - Attach hover effects dynamically
   - Register custom interaction handlers

2. **Plugin System:**
   - Allow plugins to register event handlers
   - Extend histogram functionality without modifying core code
   - Enable/disable features by adding/removing handlers

3. **Interactive Tooltips:**
   - Register hover handlers for info display
   - Remove handlers when tooltip is disabled

4. **Multi-Target Registration:**
   - Register same handler to multiple histograms
   - Bulk add/remove operations

## Complete Example

```javascript
import { functionSubjectGet } from './rxjs/FunctionSubject.js';

// Component subscribes to function operations
class HistogramManager {
  constructor() {
    this.handlers = new Map();

    this.subscription = functionSubjectGet()
      .getObservable()
      .subscribe(this.handleFunctionOperation.bind(this));
  }

  handleFunctionOperation(operation) {
    const { flag, target, event, function: handler } = operation;

    target.id.forEach(id => {
      const histogram = this.getHistogram(id);
      if (!histogram) return;

      switch(flag) {
        case 'add':
          histogram.addEventListener(event, handler);
          this.trackHandler(id, event, handler);
          break;

        case 'remove':
          histogram.removeEventListener(event, handler);
          this.untrackHandler(id, event, handler);
          break;

        case 'removeAll':
          this.removeAllHandlers(id);
          break;
      }
    });
  }

  trackHandler(id, event, handler) {
    const key = `${id}:${event}`;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key).push(handler);
  }

  cleanup() {
    this.subscription.unsubscribe();
  }
}

// Usage: Add handlers
functionSubjectGet().addFunctions({
  target: {
    entity: 'histogram',
    id: ['histo1', 'histo2']
  },
  event: 'instance-hover',
  function: (event) => {
    console.log('Bin hovered:', event.detail);
  }
});

// Usage: Remove specific handler
const hoverHandler = (e) => console.log(e);

functionSubjectGet().addFunctions({
  target: { entity: 'histogram', id: 'histo1' },
  event: 'hover',
  function: hoverHandler
});

// Later: remove it
functionSubjectGet().removeFunctions({
  target: { entity: 'histogram', id: 'histo1' },
  event: 'hover',
  function: hoverHandler
});

// Or remove all handlers
functionSubjectGet().removeFunctions({
  target: { entity: 'histogram', id: 'histo1' }
});
```

## Dependencies

- RxJS library (`ReplaySubject`)

## Related Components

- [Dispatch Subject](dispatch-subject.md)
- [Histogram JSROOT](../visualization/histogram-jsroot.md)
- [NDMVR Raycaster](../visualization/ndmvr-raycaster.md)

## Best Practices

1. **Always use singleton accessor:** Use `functionSubjectGet()`
2. **Track handler references:** Store handler references if you need to remove them later
3. **Bulk operations:** Use array input for multiple registrations
4. **Multi-target support:** Use array of IDs to target multiple entities
5. **Cleanup:** Always unsubscribe from the observable
6. **Memory management:** Consider implementing cleanup for old registrations
7. **Type safety:** Define TypeScript interfaces for function objects

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/FunctionSubject.js?ref_type=heads)
