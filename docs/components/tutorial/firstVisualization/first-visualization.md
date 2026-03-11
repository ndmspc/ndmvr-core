# Your First Visualization

In this tutorial, you'll create a basic 3D histogram visualization using NDMVR-Core's THnPainter with Three.js.

While in this section is visualized 3-Dimensional histogram, THnPainter support up to N-Dimensions histogram, utilizing representation of data, via the [the hypercube](https://en.wikipedia.org/wiki/Hypercube) concept.

For more information about ndmvr-core package itself, please head to: [Home page](../../../index.md)

## Prerequisites

This tutorial assumes you have basic knowledge of:
- Three.js fundamentals (scene, camera, renderer)
- JavaScript ES6+ (async/await, imports)
- Basic understanding of 3D graphics concepts

## What You'll Build

A simple 3D histogram visualization with:
- Interactive orbit controls for rotation and zoom
- A TH3 (3D histogram) rendered using NDMVR-Core
- No build tools required - just HTML and JavaScript

{% raw %}
<iframe src="../firstVisualization.html" width="100%" height="600px" frameborder="0"></iframe>
{% endraw %}

## Download the Tutorial Files

Download the complete tutorial package that includes:
- `index.html` - The complete visualization
- `h3scat.json` - Sample 3D histogram data from ROOT

[Download Tutorial Files (ZIP)](../../../../downloads/first-visualization.zip)

## Key Concepts

### Understanding THnPainter

The `THnPainter` class is NDMVR-Core's main tool for visualizing ROOT histograms. It automatically:
- Detects the histogram type (TH1, TH2, TH3...)
- Creates appropriate 3D geometry
- Generates materials and textures
- Provides outlines overlays for clarity
- Handles coordinate systems and scaling
- For more details, see the [THnPainter API reference](../../visualization/thnpainter.md).

**Key properties:**
- `painter.mesh` - The main rendered histogram (THREE.Mesh)
- `painter.wireframe` - Object containing wireframe visualization
- `painter.wireframe.wireframe` - The wireframe mesh to add to scene

### Understanding the Data Flow

```
h3scat.json (ROOT JSON)
    ↓
parse(h3scat) - JSROOT parses ROOT format
    ↓
{obj: parsedData} - Wrap in required structure
    ↓
new THnPainter() - Create painter instance
    ↓
painter.mesh + painter.wireframe - Three.js meshes
    ↓
scene.add() - Add to Three.js scene
```

### Importing Libraries

The visualization uses several libraries loaded via import map:

```javascript
import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {THnPainter} from "ndmvr-core";
import h3scat from "./h3scat.json" with { type: "json" };
import {parse} from "jsroot";
```

**Breaking it down:**
- `THnPainter` - NDMVR-Core's painter for ROOT histograms (TH1, TH2, TH3...)
- `h3scat.json` - Your histogram data file (imported with JSON type assertion)
- `parse` - JSROOT's parser to convert ROOT JSON format to JavaScript objects

### Loading and Rendering the Histogram

This is where NDMVR-Core does its work:

```javascript
async function loadHistogram() {
  try {
    // Parse the ROOT JSON format using JSROOT
    const histoObj = {obj: parse(h3scat)}

    // Create THn painter with the parsed histogram
    const painter = new THnPainter(histoObj, "histogram1");

    // Add the histogram mesh and wireframe to the scene
    scene.add(painter.mesh);
    scene.add(painter.wireframe.wireframe);

    console.log("Histogram loaded successfully!");

  } catch (error) {
    console.error("Error loading histogram:", error);
  }
}
```

**Understanding the code:**

1. **Parsing ROOT data**: `parse(h3scat)` converts the ROOT JSON format into a JavaScript object that NDMVR-Core can understand. The result is wrapped in an object with an `obj` property as required by THnPainter.

2. **Creating the painter**: `new THnPainter(histoObj, "histogram1")` creates a painter instance:
  - First argument: The histogram data wrapped in `{obj: parsedData}`
  - Second argument: A unique identifier for this histogram

3. **Adding to the scene**: THnPainter provides two renderable objects:
  - `painter.mesh` - The solid 3D histogram bars
  - `painter.wireframe.wireframe` - The wireframe outline for better visibility

### Initializing the Visualization

```javascript
loadHistogram();
animate();
```

Simply call `loadHistogram()` to load and render your histogram, then start the animation loop.

## The Complete HTML Structure

The visualization is completely self-contained in a single HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>First Visualization - NDMVR</title>
  <style>
    /* Styling... */
  </style>
</head>
<body>
  <div id="info">
    <h3>First Visualization</h3>
    <p>Use mouse to rotate, scroll to zoom</p>
  </div>

  <!-- Import map for CDN libraries -->
  <script type="importmap">
    { "imports": { /* library mappings */ } }
  </script>

  <!-- Main visualization code -->
  <script type="module">
    // All your code here
  </script>
</body>
</html>
```

## Running Your Visualization

1. Extract the downloaded ZIP file to a folder
2. Start a local web server in that folder:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx serve
   
   # Or use VS Code's Live Server extension
   ```

3. Open your browser and navigate to `http://localhost:8000`

**Important**: You must use a local server because browsers block ES modules and JSON imports when loaded from `file://` URLs.

**Note**: For more convenient way, you can also use vscode's Live Server extension, or Built-in preview provided in any Jetbrains IDE.

## Next Steps

We now have basic visualization, not that good, but we have one. In tutorials later in the series, we'll improve and customize it further.

Now that you understand the basics:
- Explore painter configuration options
- Add interactive features with raycasting
- Create dynamic histogram updates using RxJS

The complete working code is in the downloaded `index.html` file. Use it as a starting point for your own visualizations!

Tutorial continues in [configuration section.](../configurationChapter/configuration-chapter.md)