# Histograms and interactions

In this section, you will learn how to add interactions to your histograms.

## What You'll Build

A simple 3D histogram visualization with:
- Visualization of THn histogram
- Add basic interactions with the histogram
- Change default interactions to user defined ones

{% raw %}
<iframe src="../interactions.html" width="100%" height="600px" frameborder="0"></iframe>
{% endraw %}

## Download the Tutorial Files

Download the complete tutorial package that includes:
- `index.html` - The complete visualization
- `test3` - 4D histogram sample.

## Adding basic interactions

As of now, you will be able to utilize some of the basic interactions done by keys, including =>
- Navigate to layer of histogram by pressing num keys.
- Reset histogram state by pressing `r` key.
- Hide/Show bin outline by pressing `o` key.

### Adding NdmVr raycaster
- To add basic interactions with the mouse to your histogram, you need to add a raycaster to Three scene.
- We strongly recommend using NdmVr raycaster to handle mouse events.
- Ndmvr raycaster is built on top of Threejs raycaster. As it only adds handling of double clicks and clicks while some keys can be hold. This information is added to the checkIntersection calls. 

**To add NdmVr raycaster to your scene, you can simply add this line:**
```javascript
  const raycaster = new NdmvrRaycaster(scene, renderer.domElement);
```

| Property          | Type   | Description                        |
|-------------------|--------|------------------------------------|
| `scene`           | object | Three.js scene                     |
| `rendererElement` | object | DOM element from Three.js renderer |

##### Now you can use basic interactions with the histogram using also the mouse including =>
- Left click on bin to expand it by histogram in the layer beneath.
- Shift + Left click on expanded bin to hide histogram in the layer beneath.
- Double click on bin to navigate to histogram on layer beneath.
- Shift + Double click on bin to navigate to histogram on layer above.

## Adding custom user functions.
Now that we have basic interactions, we can add custom user functions to the histogram.

To add custom user functions, you can use the [function subject](../../communication/function-subject.md).

### Manipulating functions
- Here we provide examples for basic use cases on how one can manipulate functions.
- You can try these examples in the interactions.html file, by simply copy pasting below codes to the script (e.g. at line 92).
- **Note:** If you want to set functions right away, it is stronly recommended to set them in block of setTimeout with timeout of 0. This is done for ensuring al of the components are initialized, thus the event will be recorded. (See example at line 99 of interactions.html) 

#### How to utilize custom functions
- To fully utilize custom functions one need to understand what is provided and what is possible.
- Every custom function has access to the event and the context.
- event consists of:
- | Property         | Type          | Description                                                                                         |
  |------------------|---------------|-----------------------------------------------------------------------------------------------------|
  | `index`          | array: Object | Array of objects, contains xyz coordinates of intersected bin (including all layers)                |
  | `instanceId`     | array: Int    | Array of ID's (Int) identifying instance of intersected bin in NdmVr indexing.                      |
  | `jsrootInstance` | array: Int    | Array of ID's (Int) identifying instance of intersected bin in ROOT indexing.                       |
  | `jsrootObj`      | Object        | JSROOT Object linked to intersected bin.                                                            |
  | `origin`         | Object        | Instance of ThnPainter linked to intersected bin.                                                   |
  | `range`          | array: Object | Array of objects, contains info about intersected bin, such as: range of bin, title color of bin... |
  | `target`         | THREE.Vector3 | Point in space where bin was intersected.                                                           |
  | `content`        | Float         | Content value of intersected bin.                                                                   |
  | `error`          | Float         | Error of intersected bin.                                                                           |
  | `distance`       | Float         | Distance from origin of raycaster to the point of intersection.                                     |
- context property provides THnPainter instance.
- User can manipulate histogram itself by using the context.


#### Remove all functions
- If you want to remove all functions from al histograms.
- You can also specify the target id to remove only functions from specific histogram.
```javascript
functionSubjectGet().removeFunctions({
  target: {
    entity: "nested-histogram",
    id: "*"
  }
});
```

#### Remove all functions on event
- If you want to remove all functions on specific event.
```javascript
functionSubjectGet().removeFunctions({
  event: "mousemove",
  target: {
    entity: "nested-histogram",
    id: "*"
  }
});
```

#### Add default function
- If you wish to bring back the default function on a specific event.
```javascript
functionSubjectGet().addFunctions({
  event: "mousemove",
  target: {
    entity: "nested-histogram",
    id: "*"
  },
});
```

#### Add custom function
- If you wish to add custom function on a specific event.
- If you add multiple functions on the same event, they will be all executed, **not rewritten**.
- Functions will be executed in the order they were added.
```javascript
functionSubjectGet().addFunctions({
  event: "mouseclick",
  target: {
    entity: "nested-histogram",
    id: "*"
  },
  function: function (event, context) {
    console.log("my-custom-function: ", event);
  }
});
```

#### Set custom functions
- One can also set all functions at once by using the `setFunctions` method.
- This will overwrite all existing functions on the entity.
```javascript
  functionSubjectGet().setFunctions([
    //array of functions
]);
```
- With this approach you can quickly change the behavior of interactions.
- It can simply be linked to user defined tools like this:
```javascript
const functions = {
  empty: [{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }
  }],
  second: [{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "mousedbclick",
    function: function (event, context) {
      console.log("custom function from set functions: ", event, context);
      const histogramBelow = context.pointer.getChildByPosition(event.jsrootInstance);
      redraw("jsrootdiv", histogramBelow);
    }
  },{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "mouseclick",
  },{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "shiftmouseclick",
  }]
};

functionSubjectGet().setFunctions(functions.empty);
functionSubjectGet().setFunctions(functions.second);
```

### Power of user defined functions
- With the power of user-defined functions, you can create custom tools for your histogram.
- In provided demo you might notice that you cannot navigate to histogram below by double-clicking on bin. As this was overridden by custom function, which takes clicked bin and redraws it onto jsroot div.