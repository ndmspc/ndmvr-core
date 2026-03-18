# NDMVR Configuration Reference

## Overview

The NDMVR configuration file controls the behavior, appearance, and interaction of histogram visualizations in a 3D environment. Configuration is provided as a JSON object with several main sections.

- If one wants to change only the specific part of the configuration, it is possible to send partial config and the rest will be merged from current config.
- **Note** If partial config is sent, it needs to be wrapped in its hierarchy ensuring the correct attribute is set.

<div class="grid cards" markdown>

- ❌ **Wrong approach**

    ```js
    configSubjectGet().next({
      dbClickTimeout: 250
    });
    ```

- ✅ **Correct approach**

    ```js
    configSubjectGet().next({
      config: {
        environment: {
          dbClickTimeout: 250
        }
      }
    });
    ```

</div>

---

## Environment Configuration

### `environment.dbClickTimeout`

**Type:** `number` (milliseconds)  
**Default:** `190`

Timeout to register a double-click event, measured from the first click to the second click.

**Important:** Longer values increase the time it takes to register single clicks, as the system must wait to determine if a second click is incoming.
```json
"dbClickTimeout": 190
```

---

### `environment.camera`

Camera position in 3D space.

#### `camera.position`

**Type:** `object`
```json
"camera": {
  "position": {
    "x": 0,
    "y": 0,
    "z": 0
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `x` | number | X-axis position |
| `y` | number | Y-axis position |
| `z` | number | Z-axis position |

---

### `environment.canvasPads`

Settings for the canvas pads in the scene.  
Each canvas pad defines a display surface placed in 3D space.

**Type:** `array`

```json
"canvasPads": [
  {
    "id": "pad1-cinema",
    "limits": {
      "position": {
        "x": -15,
        "y": 20,
        "z": -30
      },
      "rotation": {
        "x": 10,
        "y": 0,
        "z": 0
      },
      "scale": {
        "x": 40,
        "y": 25,
        "z": 0
      }
    }
  }
]
```

---


### `environment.histogramPads`

Defines the layout and positioning of histogram pads. Can be configured in two modes: **Grid Mode** or **Manual Mode**.

#### Grid Mode

Automatically arranges histograms in a 3D grid pattern.

**Type:** `object`

```json
"histogramPads": {
  "type": "grid1x1x1",
  "prefix": "histogram",
  "scale": {
    "x": 5,
    "y": 3,
    "z": 5
  },
  "padding": {
    "x": 0,
    "y": 0,
    "z": 0
  },
  "origin": {
    "x": -2.5,
    "y": 0,
    "z": 2.5
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Grid format as `gridAxBxC` where A = number of histograms on X-axis, B = Y-axis, C = Z-axis |
| `prefix` | string | Prefix for histogram IDs (e.g., `"histogram"` → `histogram1`, `histogram2`, ...) |
| `scale` | object | Combined scale of all histograms in the grid |
| `padding` | object | Space between each histogram pad |
| `origin` | object | Center position of the first (left-bottom-front) histogram |

#### Manual Mode

Manually define each histogram pad.

**Type:** `array` of objects
```json
"histogramPads": [
  {
    "id": "histogram1",
    "position": {
      "x": 0,
      "y": 1.5,
      "z": 0
    },
    "scale": {
      "x": 5,
      "y": 3,
      "z": 5
    }
  }
]
```

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the histogram pad |
| `position` | object | Position in 3D space |
| `scale` | object | Scale of the histogram pad |

---

## Histogram Configuration

### `histogram.padding`

Defines padding between bins in histograms. Padding is a normalized value (0-1) where:
- `0` = no padding
- `0.5` = half the space is padding

**Note:** Padding reduces bin size; it does not push bins further apart.

**Type:** `object`
```json
"padding": {
  "default": {
    "x": 0.1,
    "y": 0.1,
    "z": 0.1
  },
  "layer": [],
  "sets": {
    "x": 0,
    "y": 0,
    "z": 0
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `default` | object | Default padding for all histograms |
| `layer` | array | Per-layer padding overrides |
| `sets` | object | Padding for histogram sets |

---

### `histogram.scale`

Defines minimum and maximum scale of bins. Scale is normalized (0-1):
- `0` = bin takes no space
- `0.5` = bin takes half the available space
- `1` = bin takes full space

A bin with the minimum number of entries will be scaled to `min`, while the maximum bin scales to `max`.

**Type:** `object`
```json
"scale": {
  "default": {
    "min": 0.3,
    "max": 1
  },
  "layer": []
}
```

| Property | Type | Description |
|----------|------|-------------|
| `default` | object | Default min/max scale |
| `layer` | array | Per-layer scale overrides |

---

### `histogram.scale.scaleBy`

**Type:** `string`  
**Options:** `"value"` or `"error"`

Determines what bins are scaled by:

- **`value`**: Uses `fArray` values
- **`error`**: Uses `fSumw2` errors (or square root of `fArray` if `fSumw2` is empty)

---

### `histogram.scale.object`

**Type:** `string`  
**Options:** `"relative"`, `"global"`, or `"fixed"`

Defines how maximum scale for either content parameter, or set is determined across histograms:

| Mode | Description                                                                                              |
|------|----------------------------------------------------------------------------------------------------------|
| `relative` | Each histogram's maximum is based on its own data                                                        |
| `global` | All histograms share the same maximum (the global maximum across all histograms in that layer)           |
| `fixed` | Starts as `global`, but allows user-defined min/max via [stateSubject](../communication/state-suject.md) |
```json
"content": "global",
"parameter": "fixed",
"sets": "relative",
```

---

### `histogram.TH1ZScale`

Z-axis scale for TH1 histograms. Normalized value (0-1).

**Type:** `object`
```json
"TH1ZScale": {
  "default": 0.8,
  "layer": [0.2, 1, 1, 1],
  "set": 0.01
}
```

| Property | Type | Description |
|----------|------|-------------|
| `default` | number | Default Z-scale |
| `layer` | array | Per-layer Z-scale overrides |
| `set` | number | Z-scale for sets |

---

### `histogram.wireframe`

Controls display and appearance of bin outlines (wireframes).

**Type:** `object`
```json
"wireframe": {
  "display": {
    "start": 0,
    "end": 1
  },
  "displaySets": false,
  "layer": [],
  "color": {
    "default": "0x00FF00",
    "layer": ["0x000000", "0x0000FF", "0x00FF00", "0x00FFFF"],
    "set": []
  }
}
```

#### `wireframe.display`

| Property | Type | Description |
|----------|------|-------------|
| `start` | number | First layer where wireframes are displayed (0-indexed) |
| `end` | number | Last layer where wireframes are displayed |

**Example:** `"start": 1` displays wireframes from layer 1 and greater.

#### `wireframe.displaySets`

**Type:** `boolean`

Whether to display wireframes on histogram sets.

#### `wireframe.color`

Defines wireframe colors.

| Property | Type | Description |
|----------|------|-------------|
| `default` | string | Default wireframe color (hex format) |
| `layer` | array | Per-layer color overrides |
| `set` | array | Per-set color overrides |

---

### `histogram.color`

Controls bin fill colors using gradients.

A gradient is created from `min` to `max` color based on the selected property.


**Type:** `object`
```json
"color": {
  "default": {
    "min": "0x0000ff",
    "max": "0xff0000"
  },
  "layer": [],
  "set": [
    {
      "min": "0x999999",
      "max": "0xffaa00"
    }
  ]
}
```

#### `color.colorBy`

**Type:** `string`  
**Options:** `"value"` or `"error"`

Analogous to `scaleBy`, determines what drives the color gradient:

- **`value`**: Colors based on `fArray` values
- **`error`**: Colors based on `fSumw2` errors (or square root of `fArray` if `fSumw2` is empty)

| Property | Type | Description |
|----------|------|-------------|
| `default` | object | Default min/max gradient colors |
| `layer` | array | Per-layer color gradient overrides |
| `set` | array | Per-set color gradient overrides |

---

## Bindings Configuration

### `bindings`

Defines keyboard shortcuts for default histogram interactions.

**Type:** `object`
```json
"bindings": {
  "resetHistogram": "r",
  "goToPreviousLayer": "z",
  "hideOutlines": "o"
}
```

| Binding | Default Key | Description |
|---------|-------------|-------------|
| `resetHistogram` | `r` | Reset histogram to initial state |
| `goToPreviousLayer` | `z` | Navigate to previous layer |
| `hideOutlines` | `o` | Toggle wireframe visibility |

---

## Example Configuration
```json
{
  "config": {
    "environment": {
      "dbClickTimeout": 190,
      "camera": {
        "position": { "x": 0, "y": 0, "z": 0 }
      },
      "canvas": {
        "position": { "x": 0, "y": 5, "z": -15 },
        "rotation": { "x": 10, "y": 0, "z": 0 },
        "scale": { "x": 20, "y": 10, "z": 0 }
      },
      "histogramPads": {
        "type": "grid2x2x1",
        "prefix": "histogram",
        "scale": { "x": 5, "y": 3, "z": 5 },
        "padding": { "x": 1, "y": 0, "z": 1 },
        "origin": { "x": -5, "y": 0, "z": 2.5 }
      }
    },
    "histogram": {
      "padding": {
        "default": { "x": 0.1, "y": 0.1, "z": 0.1 },
        "layer": [],
        "sets": { "x": 0, "y": 0, "z": 0 }
      },
      "scale": {
        "scaleBy": "value",
        "content": "global",
        "parameter": "fixed",
        "sets": "relative",
        "default": {
          "min": 0.1,
          "max": 1
        },
        "layer": []
      },
      "TH1ZScale": {
        "default": 0.8,
        "layer": [ 0.2, 1, 1, 1],
        "set": 0.01
      },
      "wireframe": {
        "display": {
          "start": 0,
          "end": 99
        },
        "displaySets": false,
        "layer": [],
        "color": {
          "default": "0x00FF00",
          "layer": ["0x000000", "0x0B3D91", "0x00FF00", "0x00FFFF"],
          "set": []
        }
      },
      "color": {
        "colorBy": "error",
        "default": {
          "min": "0x0000ff",
          "max": "0xff0000"
        },
        "layer": [],
        "set": [
          {
            "min": "0x999999",
            "max": "0xffaa00"
          },
          {
            "min": "0x00ffff",
            "max": "0xff7f00"
          },
          {
            "min": "0x00ff00",
            "max": "0x800080"
          },
          {
            "min": "0x0000ff",
            "max": "0xff0000"
          }
        ]
      }
    },
    "bindings": {
      "resetHistogram": "r",
      "goToPreviousLayer": "z",
      "hideOutlines": "o"
    }
  }
}
```

---

## See Also

- [stateSubject Documentation](link-to-stateSubject-docs)