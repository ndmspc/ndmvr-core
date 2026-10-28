# Config Subject

## Overview

The Config Subject is a singleton RxJS-based communication channel for managing application-wide configuration. It uses a `BehaviorSubject` initialized with default configuration values and provides sophisticated config merging capabilities, particularly for histogram configurations.

## Class Structure

```javascript
class ConfigSubject {
  #subject;  // Private BehaviorSubject with default config
  #histogramGridConfig;  // Effective recipe for the currently applied grid, or null
}
```

## Methods

### constructor()

Creates a new `ConfigSubject` instance with parsed default configuration.

**Behavior:**
- Initializes a private `BehaviorSubject` with `parseConfig(defaultConfig, {})`
- Loads and parses configuration from `config-default.json`
- Ensures the subject always has a valid configuration value

### getObservable()

Returns an Observable from the subject for subscribing to config updates.

**Returns:** `Observable` - Observable stream of configuration changes

**Usage:**
```javascript
import { configSubjectGet } from './rxjs/ConfigSubject.js';

configSubjectGet().getObservable().subscribe(config => {
  console.log('Config updated:', config);
});
```

### getValue()

Retrieves the current configuration value synchronously.

**Returns:** Current configuration object

**Usage:**
```javascript
import { configSubjectGet } from './rxjs/ConfigSubject.js';

const currentConfig = configSubjectGet().getValue();
console.log('Current config:', currentConfig);
```

### getHistogramGridConfig()

Returns an independent copy of the effective recipe for the currently applied
grid, or `null` for a manual layout. It includes `type`, `prefix`, total `scale`,
`padding`, and `origin`, including defaults used by the parser. Initially it
describes Core's default grid. An omitted field in a new recipe uses the parser's
fallback, rather than inheriting the old recipe.

Unrelated patches preserve this metadata. Explicit pad arrays (including arrays
from `getValue()`), actual pad edits, nonempty appends, and removal of the layout
clear it. Empty appends still notify subscribers and preserve the active grid.
Core never infers a recipe from pad geometry.

```javascript
const subject = configSubjectGet();
const grid = subject.getHistogramGridConfig();
if (grid) console.log(grid.type, grid.origin);
```

The existing observable emits parsed configurations. Grid metadata is committed
before notifying subscribers; failed parsing leaves both unchanged. Treat
`getValue()` and emitted objects as read-only. Submit partial patches for settings
changes instead of resubmitting the entire parsed configuration.

### updateHistogramPad(id, bounds)

Updates the first matching pad using `position`, `scale`, or both. Each supplied
vector must contain complete finite numeric `x`, `y`, and `z` values; invalid
vectors throw before any change. Core copies supplied vectors, preserves other
pad fields and other pads, and publishes one layout-only update on a change.
An actual edit clears the active grid metadata.

Returns `true` on a change, or `false` without notification for an unknown ID,
empty update, or unchanged bounds.

```javascript
subject.updateHistogramPad('pad1', { position: { x: 1, y: 2, z: -5 } });
```

### next(e)

Updates the configuration by parsing and merging new values with existing config.

**Parameters:**
- `e` - New configuration object or JSON string to merge

**Returns:** Parsed and merged configuration object

**Behavior:**
- Parses the new configuration using `parseConfig()`
- Merges with existing configuration
- Updates active-grid metadata before publishing, without changing parsing behavior
- Broadcasts the updated configuration to all subscribers

**Usage:**
```javascript
import { configSubjectGet } from './rxjs/ConfigSubject.js';

const updatedConfig = configSubjectGet().next({
  histogram: {
    color: new Color(0xff0000),
    sc: 1.5
  }
});
```

### appendPads(ids, disp_kind, settings)

Appends pad configurations to the current configuration.

**Parameters:**
- `ids` - Array of pad IDs
- `disp_kind` - Display kind/type
- `settings` - Pad-specific settings

**Behavior:**
- Uses `appendPads()` utility function to update configuration
- Broadcasts the updated configuration to all subscribers

**Usage:**
```javascript
import { configSubjectGet } from './rxjs/ConfigSubject.js';

configSubjectGet().appendPads(
  ['pad1', 'pad2'],
  'histogram',
  { visible: true }
);
```

### mergeHistogramConfig(partialConfig, defaultConfig)

Deep merges histogram configuration objects with special handling for THREE.js objects.

**Parameters:**
- `partialConfig` - Partial configuration to merge
- `defaultConfig` (optional) - Defaults to `this.#subject.value.config.histogram`

**Returns:** Merged configuration object

**Special Handling:**
- Arrays are replaced entirely (not merged)
- THREE.js objects (`Color`, `Vector3`) are replaced entirely
- Plain objects are deep merged recursively
- `undefined` values preserve default values

**Usage:**
```javascript
import { configSubjectGet } from './rxjs/ConfigSubject.js';
import { Color, Vector3 } from 'three';

const merged = configSubjectGet().mergeHistogramConfig({
  color: new Color(0xff0000),
  pos: new Vector3(0, 1, 0),
  options: {
    wireframe: true,
    opacity: 0.8
  }
});
```

## Singleton Pattern

The module exports a singleton accessor function:

```javascript
export const configSubjectGet = () => {
  if (!configSubject) configSubject = new ConfigSubject();
  return configSubject;
};
```

## Configuration Merging Logic

### Value Objects (Non-Mergeable)
The following types are treated as atomic values and replaced entirely:
- Arrays
- `THREE.Color` instances
- `THREE.Vector3` instances
- Objects with `isColor === true`
- Objects with `isVector3 === true`

### Plain Objects (Mergeable)
Regular JavaScript objects are deep merged:
- Existing properties are preserved unless overridden
- New properties are added
- Nested objects are merged recursively

### Example Merge Behavior

```javascript
// Default config
{
  color: new Color(0x0000ff),
  position: new Vector3(0, 0, 0),
  options: {
    wireframe: false,
    opacity: 1.0,
    sc: 1.0
  }
}

// Partial config
{
  color: new Color(0xff0000),  // Replaces entirely
  options: {
    wireframe: true,  // Merged
    opacity: 0.5      // Merged, scale preserved
  }
}

// Result
{
  color: new Color(0xff0000),
  position: new Vector3(0, 0, 0),  // Preserved
  options: {
    wireframe: true,
    opacity: 0.5,
    sc: 1.0  // Preserved from default
  }
}
```

## Subject Type: BehaviorSubject

**Characteristics:**
- **Initial Value:** Parsed default configuration
- **Current Value Access:** Provides synchronous `getValue()` method
- **Replay Behavior:** New subscribers immediately receive current config
- **Use Case:** Perfect for application-wide configuration management

## Dependencies

- RxJS library (`BehaviorSubject`)
- `parseConfig`, `appendPads` from `../utils/baseUtil.js`
- `Vector3`, `Color` from `three`
- `defaultConfig` from `../config-default.json`

## Related Components

- [Histogram Subject](histogram-subject.md)
- [State Subject](state-subject.md)
- [Canvas Subject](canvas-subject.md)

## Best Practices

1. **Use getValue() for synchronous access:** When you need current config immediately
2. **Use getObservable() for reactive updates:** When you want to react to config changes
3. **Always use the singleton accessor:** Use `configSubjectGet()`
4. **Partial updates:** Only provide properties you want to change
5. **THREE.js objects:** Remember that Color and Vector3 replace entirely, not merge
6. **Type safety:** Consider TypeScript interfaces for configuration structure

## Example: Complete Configuration Workflow

```javascript
import { configSubjectGet } from './rxjs/ConfigSubject.js';
import { Color, Vector3 } from 'three';

// Get current config synchronously
const currentConfig = configSubjectGet().getValue();
console.log('Current:', currentConfig);

// Subscribe to config changes
const subscription = configSubjectGet().getObservable().subscribe(config => {
  console.log('Config updated:', config);
  applyConfigToScene(config);
});

// Update configuration
configSubjectGet().next({
  histogram: {
    color: new Color(0xff0000),
    options: {
      wireframe: true
    }
  }
});

// Append pads
configSubjectGet().appendPads(
  ['pad1', 'pad2'],
  'histogram',
  { visible: true, opacity: 0.8 }
);

// Merge histogram-specific config
const mergedHistoConfig = configSubjectGet().mergeHistogramConfig({
  binColor: new Color(0x00ff00),
  axes: {
    showLabels: true
  }
});

// Cleanup
subscription.unsubscribe();
```
## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/ConfigSubject.js?ref_type=heads)
