# How to use canvas component

In this section, you will learn how to use a canvas component in your scene. This component allows you to render 2D content onto a 3D [Three.Plane](https://threejs.org/docs/#Plane) object. While it can display various types of content, the supported formats are limited to HTMLImageElement, Data/URL links, and JSROOT objects.

This component can be useful in cases when you want to:

- displaying 2D content inside a VR environment
- having an additional visualization element that complements existing 3D objects
- rendering external graphical content such as images loaded from URLs or generated dynamically
- displaying JSROOT primitives that are not directly supported by our rendering components
- creating information panels, overlays, or dashboards that remain spatially anchored in the scene
- presenting charts, plots, or other data visualizations alongside 3D representations

## What You'll Build

A simple 3D histogram visualization with:
- A canvas component
- Different cases on how to update the canvas texture
- In the demo, canvas is initialized with HTMLImageElement, after 2 seconds, it will be updated using canvasSubject and after 2 seconds it will be updated using updateTexture method with a base64 encoded image.


{% raw %}
<iframe src="../canvas.html" width="100%" height="600px" frameborder="0"></iframe>
{% endraw %}

## Download the Tutorial Files

[Download Tutorial Files (ZIP)](../../../../downloads/canvas.zip)
Download the complete tutorial package that includes:
- `index.html` - The complete visualization
- `test3` - 4D histogram sample.

## Adding canvas to your scene

First, we need to add a canvas component to our scene.
```javascript
const canvasPRS = {
  pos: { x: 0, y: 5, z: 0 },
  rot: { x: 0, y: 0, z: 0 },
  sc: { x: 0.8, y: 0.6, z: 0.8 }
};
const canvas = new CanvasClass(null, canvasPRS.pos, canvasPRS.rot, canvasPRS.sc, "histogram1-canvas");
scene.add(canvas.getPlane());
```

- **Important**: Mind what id you will assign to canvas, as the default behavior of THnPainter is to send histograms to display to **ThnPainter id + "-cinema"**, so if ThnPainter id is "histogram1", then it is sent to "histogram1-cinema".

## How to update canvas manually.

- **All the provided examples can be found in the demo**

User can update canvas texture in these ways:

#### Utilizing canvasSubject

- ID can be set to "*" to update all canvases.
- **Note:** Canvas subject expects a JSROOT object as input.

```javascript
    canvasSubjectGet().next({id: "histogram1-canvas", obj: jsrootObj});
```

#### Utilizing updateTexture method

- User can also update canvas texture by using updateTexture method on the instance of canvasClass.
- **Note:** updateTexture method expects an image element or base64 encoded image (e.g. "data:image/png;base64,xyz...") as input.

```javascript
const canvas = new CanvasClass(null, canvasPRS.pos, canvasPRS.rot, canvasPRS.sc, "histogram1-canvas");

const imgEl = new Image(480, 360);
imgEl.src = "image.png";
canvas.updateTexture(imgEl);
```

```javascript
// {
//   "image": "data:image/png;base64,iVBORw0K...
canvas.updateTexture(image);
```

