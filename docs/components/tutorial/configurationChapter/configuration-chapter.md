# Configuration and RxJS Integration

This chapter builds upon the first visualization tutorial, introducing RxJS concepts and showing how to configure your
visualizations dynamically.

## Result:
- Visualization of 4D histogram with a user-defined function to draw histogram beneath bin using jsroot by double-clicking.

{% raw %}
<iframe src="../configuration-chapter.html" width="100%" height="600px" frameborder="0"></iframe>
{% endraw %}

## Download the Tutorial Files

[Download Tutorial Files (ZIP)](../../../../downloads/configuration.zip)

## Understanding RxJS Basics

RxJS (Reactive Extensions for JavaScript) is a library for reactive programming using Observables. In NDMVR, we use RxJS
to:

- Handle real-time histogram updates
- Manage data streams
- React to user interactions
- Control visualization configuration

Key RxJS concepts used in NDMVR:

- **Observables**: Represent a stream of data over time
- **Subjects**: Special type of Observable that allows values to be multicasted
- **Subscribers**: Consume values emitted by Observables
- **Operators**: Transform, combine, and manipulate Observable streams

## Histogram component

For easier manipulation with histograms we will create histogram abstraction component. It's purpose will be to implement dynamic interface provided by [Histogram subject](../../communication/histogram-subject.md).

## Creating the Histogram Manager Component
- Why THnPainterManager?
- The THnPainterManager class serves as an abstraction layer between the RxJS histogram stream and the actual visualization rendering. This pattern provides several key benefits:
- 1. Separation of Concerns

- Decouples histogram data management from rendering logic
Isolates reactive stream handling in one place
Makes the codebase more maintainable and testable

- 2. Dynamic Renderer Switching
   The manager can dynamically switch between different rendering engines based on configuration:

**NDMVR Renderer** (THnPainter): Custom 3D histogram visualization optimized for performance
JSRoot Renderer (HistogramJsrootClass): Standard ROOT visualization for compatibility

- 3. Automatic Resource Management

Handles subscription lifecycle (subscribe/unsubscribe)
Automatically cleans up old renderers when switching
Prevents memory leaks from unmanaged 3D objects

- 4. Reactive Updates

Listens to the histogram stream using RxJS
Automatically re-renders when histogram data changes
Updates existing visualizations without recreation when possible

## How It Works

- Initialization: The init() method subscribes to the histogram stream for a specific element ID
- Stream Handling: When histogram data arrives, it checks the opts.render property
- Renderer Selection: Routes to either JSRoot or NDMVR renderer based on configuration
- Resource Cleanup: Removes old renderer before creating/updating new one
- Subscription Management: The remove() method unsubscribes and cleans up all resources

## Using THnPainterManager in Your Application
**Basic Setup**
```javascript
// Create a group to hold histogram objects
const histogramGroup = new THREE.Group();
scene.add(histogramGroup);

// Initialize THnPainterManager
const painterManager = new THnPainterManager("histogram1", histogramGroup, camera);

// Load histogram data
await histogramSubjectGet().next({
  id: "histogram1",
  obj: parse(h3scat),
  opts: {
    render: "ndmvr"  // or "jsroot"
  }
});
```


**Switching Renderers**

You can easily switch between rendering engines by changing the render option. On line 120 of the example code, you'll find:
```javascript
await histogramSubjectGet().next({
  id: "histogram1",
  obj: parse(h3scat),
  opts: {
    render: "ndmvr"  // ← Change this to "jsroot" to use JSRoot renderer
  }
});
```

#### Render Options:

- **"ndmvr"** - Uses the custom NDMVR renderer (THnPainter) for optimized 3D visualization
- **"jsroot"** - Uses the JSRoot renderer (HistogramJsrootClass) for standard ROOT compatibility

The manager will automatically:

Detect the renderer change
Clean up the current renderer
Initialize the new renderer
Display the histogram with the new rendering engine

Global Configuration
At the end of the file (after the histogram setup), you'll notice the global configuration:
```javascript
configSubjectGet().next(config);
```

This line loads global visualization settings from config.json. The configuration affects:

Color schemes and palettes
Default rendering options
Axis labels and scales
Visualization performance settings

The configuration is applied globally through the configSubjectGet() subject, which means:

All histograms can access these settings
Changes propagate to all active visualizations
You can update configuration at runtime

### Note:
Config is merged internally in config handler, so in addition to support of dynamic update according to configuration, it is possible to send just a part of config, **which will be merged with existing config!**

One can send just a part of config, for example:

**Line 101 of the example code**
```javascript
configSubjectGet().next({
  "config": {
    "environment": {
      "histogramPads": {
        "type": "grid1x1x1",
        "prefix": "histogram",
        "sc": {
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
          "y": 1,
          "z": 2.5
        }
      }
    }
  }
});
```

### Next Steps
Now that you understand how the histogram manager, basic configuration and communication works, you can:

If you want to find out more about all the configuration options, check out the [Configuration Reference](../../configuration/configuration.md).

Experiment with different renderers by changing the render option
Modify the global configuration to customize the visualization appearance
Create multiple histogram managers for different data sets
Implement custom rendering logic by extending the manager class

