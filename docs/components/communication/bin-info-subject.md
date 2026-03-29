# Bin Info Subject

## Overview

The Bin Info Subject is a singleton RxJS-based communication channel for managing and broadcasting histogram bin information throughout the application. It uses a `ReplaySubject` to ensure that the latest bin information is always available to new subscribers.

## Class Structure

```javascript
class BinInfoSubject {
  #subject;  // Private ReplaySubject(1)
}
```

## Methods

### constructor()

Creates a new `BinInfoSubject` instance with a `ReplaySubject(1)`.

**Behavior:**
- Initializes a private `ReplaySubject` with buffer size of 1
- The buffer ensures the last emitted value is replayed to new subscribers

### getObservable()

Returns an Observable from the subject for subscribing to bin info updates.

**Returns:** `Observable` - Observable stream of bin information

**Usage:**
```javascript
import { binInfoSubjectGet } from './rxjs/BinInfoSubject.js';

binInfoSubjectGet().getObservable().subscribe(binInfo => {
  console.log('Bin info updated:', binInfo);
});
```

### getValue()

Retrieves the current value of the subject.

**Returns:** Current bin information value

**Note:** This method is defined but may not work as expected since `ReplaySubject` doesn't have a `getValue()` method by default. This might require using `BehaviorSubject` instead.

### next(e)

Broadcasts new bin information to all subscribers.

**Parameters:**
- `e` - The bin information object to broadcast

**Usage:**
```javascript
import { binInfoSubjectGet } from './rxjs/BinInfoSubject.js';

binInfoSubjectGet().next({
  binIndex: 42,
  content: 123.45,
  pos: { x: 1, y: 2, z: 3 },
  // ... other bin properties
});
```

## Singleton Pattern

The module exports a singleton accessor function:

```javascript
export const binInfoSubjectGet = () => {
  if (!binInfoSubject) binInfoSubject = new BinInfoSubject();
  return binInfoSubject;
};
```

**Benefits:**
- Ensures only one instance exists throughout the application
- Provides global access to the bin info communication channel
- Maintains consistent state across all components

## Use Cases

1. **Bin Hover Information:**
   - Display bin details when user hovers over histogram bins
   - Show bin content, position, and statistics

2. **Bin Selection:**
   - Communicate selected bin information to UI components
   - Update info panels with selected bin data

3. **Interactive Tooltips:**
   - Power tooltip displays in VR environment
   - Synchronize bin information across multiple views

## Data Flow Example

```javascript
// Component A: Raycaster detects bin hover
import { binInfoSubjectGet } from './rxjs/BinInfoSubject.js';

function onBinHover(bin) {
  binInfoSubjectGet().next({
    binId: bin.id,
    content: bin.value,
    pos: bin.pos,
    histogram: bin.histogramId
  });
}

// Component B: Info visualizer subscribes to updates
import { binInfoSubjectGet } from './rxjs/BinInfoSubject.js';

binInfoSubjectGet().getObservable().subscribe(binInfo => {
  updateBinInfoDisplay(binInfo);
});
```

## Subject Type: ReplaySubject(1)

**Characteristics:**
- **Buffer Size:** 1 (stores the last emitted value)
- **Replay Behavior:** New subscribers immediately receive the last value
- **Use Case:** Ensures components always have access to current bin information

## Dependencies

- RxJS library (`ReplaySubject`)

## Related Components

- [Bin Info JSROOT](../visualization/bin-info-jsroot.md)
- [NDMVR Raycaster](../visualization/ndmvr-raycaster.md)
- [Histogram Subject](histogram-subject.md)

## Best Practices

1. **Always use the singleton accessor:** Use `binInfoSubjectGet()` instead of creating new instances
2. **Unsubscribe when done:** Always unsubscribe from observables in component cleanup
3. **Type safety:** Consider defining TypeScript interfaces for bin info objects
4. **Error handling:** Wrap subscriptions with error handlers for robustness

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/BinInfoSubject.js?ref_type=heads)
