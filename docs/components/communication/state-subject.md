# State Subject

## Overview

The State Subject is a singleton RxJS-based communication channel for managing application-wide state. It uses a `BehaviorSubject` to maintain state related to sets, arrays, and their selections, providing a centralized state management solution for the VR histogram application.

## Class Structure

```javascript
class StateSubject {
  #subject;  // Private BehaviorSubject
}
```

## Initial State

```javascript
{
  sets: [],              // Array of available sets
  selectedSet: [],       // Currently selected set(s)
  arrays: ["content"],   // Array of available array types
  selectedArray: "content"  // Currently selected array type
}
```

## Methods

### constructor()

Creates a new `StateSubject` instance with default application state.

**Behavior:**
- Initializes a private `BehaviorSubject` with default state structure
- Provides initial values for sets, arrays, and selections

### getObservable()

Returns an Observable for subscribing to state changes.

**Returns:** `Observable` - Stream of state updates

**Usage:**
```javascript
import { stateSubjectGet } from './rxjs/StateSubject.js';

stateSubjectGet().getObservable().subscribe(state => {
  console.log('State updated:', state);
  console.log('Selected set:', state.selectedSet);
  console.log('Selected array:', state.selectedArray);
});
```

### getValue()

Retrieves the current state value synchronously.

**Returns:** Current state object

**Usage:**
```javascript
import { stateSubjectGet } from './rxjs/StateSubject.js';

const currentState = stateSubjectGet().getValue();
console.log('Current sets:', currentState.sets);
console.log('Selected array:', currentState.selectedArray);
```

### next(e)

Updates the application state and broadcasts to all subscribers.

**Parameters:**
- `e` (object) - New state object (partial or complete)

**Behavior:**
- Replaces entire state with new state object
- All subscribers receive the updated state
- Partial updates require spreading existing state

**Usage:**
```javascript
import { stateSubjectGet } from './rxjs/StateSubject.js';

// Complete state update
stateSubjectGet().next({
  sets: ['set1', 'set2', 'set3'],
  selectedSet: ['set1'],
  arrays: ['content', 'errors', 'bins'],
  selectedArray: 'content'
});

// Partial state update (preserve other fields)
const current = stateSubjectGet().getValue();
stateSubjectGet().next({
  ...current,
  selectedSet: ['set2']
});
```

## Singleton Pattern

```javascript
export const stateSubjectGet = () => {
  if (!inputDeviceSubject) inputDeviceSubject = new StateSubject();
  return inputDeviceSubject;
};
```

**Note:** There's a naming inconsistency in the implementation - the variable is named `inputDeviceSubject` but should be `stateSubject`. This is likely a copy-paste error but doesn't affect functionality.

## State Properties

### sets
**Type:** `Array`
**Default:** `[]`
**Description:** List of available histogram sets or data sets

**Example:**
```javascript
sets: ['dataset1', 'dataset2', 'experiment_a', 'experiment_b']
```

### selectedSet
**Type:** `Array`
**Default:** `[]`
**Description:** Currently selected set(s) - supports multi-selection

**Example:**
```javascript
selectedSet: ['dataset1', 'dataset2']
```

### arrays
**Type:** `Array<string>`
**Default:** `["content"]`
**Description:** Available array types for histogram data visualization

**Common Values:**
- `"content"` - Bin content values
- `"errors"` - Error values
- `"bins"` - Bin indices
- `"entries"` - Entry counts

**Example:**
```javascript
arrays: ['content', 'errors', 'bins']
```

### selectedArray
**Type:** `string`
**Default:** `"content"`
**Description:** Currently selected array type for display

**Example:**
```javascript
selectedArray: 'errors'
```

## Use Cases

1. **Dataset Management:**
   - Track available datasets
   - Manage dataset selection
   - Switch between different experiments

2. **Visualization Mode:**
   - Select which histogram data to display
   - Switch between content, errors, or bins view
   - Update visualization based on selected array type

3. **Multi-Selection:**
   - Compare multiple datasets
   - Display multiple sets simultaneously

4. **UI State Synchronization:**
   - Keep UI controls in sync with application state
   - Update dropdown menus and selection lists

## Complete Example

```javascript
import { stateSubjectGet } from './rxjs/StateSubject.js';

class StateManager {
  constructor() {
    this.subscription = stateSubjectGet()
      .getObservable()
      .subscribe(this.onStateChange.bind(this));
  }

  onStateChange(state) {
    console.log('State changed:', state);

    // Update UI to reflect current state
    this.updateSetsList(state.sets);
    this.updateSelectedSets(state.selectedSet);
    this.updateArrayOptions(state.arrays);
    this.updateSelectedArray(state.selectedArray);

    // Update visualizations
    this.refreshHistograms(state.selectedSet, state.selectedArray);
  }

  // Load available datasets
  loadDatasets(datasets) {
    const current = stateSubjectGet().getValue();
    stateSubjectGet().next({
      ...current,
      sets: datasets
    });
  }

  // Select a dataset
  selectSet(setId) {
    const current = stateSubjectGet().getValue();
    stateSubjectGet().next({
      ...current,
      selectedSet: [setId]
    });
  }

  // Select multiple datasets
  selectMultipleSets(setIds) {
    const current = stateSubjectGet().getValue();
    stateSubjectGet().next({
      ...current,
      selectedSet: setIds
    });
  }

  // Change visualization array type
  selectArrayType(arrayType) {
    const current = stateSubjectGet().getValue();
    stateSubjectGet().next({
      ...current,
      selectedArray: arrayType
    });
  }

  // Add array type option
  addArrayType(arrayType) {
    const current = stateSubjectGet().getValue();
    if (!current.arrays.includes(arrayType)) {
      stateSubjectGet().next({
        ...current,
        arrays: [...current.arrays, arrayType]
      });
    }
  }

  cleanup() {
    this.subscription.unsubscribe();
  }
}

// Usage
const stateManager = new StateManager();

// Load datasets
stateManager.loadDatasets([
  'experiment_2024_01',
  'experiment_2024_02',
  'calibration_data'
]);

// Select a dataset
stateManager.selectSet('experiment_2024_01');

// Switch to errors view
stateManager.selectArrayType('errors');

// Select multiple datasets for comparison
stateManager.selectMultipleSets([
  'experiment_2024_01',
  'experiment_2024_02'
]);

// Add custom array type
stateManager.addArrayType('normalized');
```

## Reactive UI Binding

```javascript
import { stateSubjectGet } from './rxjs/StateSubject.js';
import { map, distinctUntilChanged } from 'rxjs/operators';

// Subscribe to specific state properties
const selectedSet$ = stateSubjectGet()
  .getObservable()
  .pipe(
    map(state => state.selectedSet),
    distinctUntilChanged()
  );

selectedSet$.subscribe(selectedSet => {
  console.log('Selected set changed:', selectedSet);
  updateHistogramDisplay(selectedSet);
});

const selectedArray$ = stateSubjectGet()
  .getObservable()
  .pipe(
    map(state => state.selectedArray),
    distinctUntilChanged()
  );

selectedArray$.subscribe(arrayType => {
  console.log('Array type changed:', arrayType);
  updateVisualizationMode(arrayType);
});
```

## State Helpers

```javascript
import { stateSubjectGet } from './rxjs/StateSubject.js';

// Helper functions for common operations
const StateHelpers = {
  // Get current state
  getCurrentState() {
    return stateSubjectGet().getValue();
  },

  // Update partial state
  updateState(updates) {
    const current = this.getCurrentState();
    stateSubjectGet().next({ ...current, ...updates });
  },

  // Check if set is selected
  isSetSelected(setId) {
    const state = this.getCurrentState();
    return state.selectedSet.includes(setId);
  },

  // Toggle set selection
  toggleSet(setId) {
    const state = this.getCurrentState();
    const selectedSet = state.selectedSet.includes(setId)
      ? state.selectedSet.filter(id => id !== setId)
      : [...state.selectedSet, setId];

    this.updateState({ selectedSet });
  },

  // Clear selection
  clearSelection() {
    this.updateState({ selectedSet: [] });
  }
};

// Usage
StateHelpers.updateState({ selectedArray: 'bins' });
StateHelpers.toggleSet('experiment_1');
console.log('Is selected?', StateHelpers.isSetSelected('experiment_1'));
```

## Subject Type: BehaviorSubject

**Characteristics:**
- **Initial Value:** State with empty sets and default array selection
- **Current Value:** Always accessible via `getValue()`
- **Replay Behavior:** New subscribers immediately receive current state
- **Use Case:** Perfect for application-wide state management

## Dependencies

- RxJS library (`BehaviorSubject`)

## Related Components

- [Config Subject](config-subject.md)
- [Input Device Subject](input-device-subject.md)
- [Histogram Subject](histogram-subject.md)

## Best Practices

1. **Always use singleton accessor:** Use `stateSubjectGet()`
2. **Partial updates:** Spread existing state when updating (`{ ...current, ...updates }`)
3. **Synchronous access:** Use `getValue()` when you need immediate state
4. **Reactive updates:** Use `getObservable()` for reactive state changes
5. **Unsubscribe:** Always clean up subscriptions
6. **Immutability:** Don't mutate state directly, always create new objects
7. **Type safety:** Consider TypeScript interfaces for state structure
8. **State normalization:** Keep state structure flat and normalized

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/StateSubject.js?ref_type=heads)
