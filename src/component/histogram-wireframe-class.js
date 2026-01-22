import {configSubjectGet} from "../rxjs/ConfigSubject.js";
import {filter} from "rxjs";
import {
  BoxGeometry, Color,
  EdgesGeometry,
  FloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments, ShaderMaterial
} from "three";
import {stateSubjectGet} from "../rxjs/StateSubject.js";

export default class HistogramWireframeClass {

  wireframe = undefined;
  instGeom = undefined;
  material = undefined;
  totalInstances = undefined;
  maxInstancesPerLayer = undefined;
  instancePositions = undefined;
  instanceScales = undefined;
  instanceColors = undefined;
  colorArray = undefined;
  configSub = undefined;
  stateSub = undefined;
  config = undefined;
  numOfavailableSets = undefined;
  visibility = true;

  constructor(maxInstancesPerLayer, matrixCache, config) {
    this.config = config;
    this.maxInstancesPerLayer = maxInstancesPerLayer;

    const baseBox = new BoxGeometry(1, 1, 1);
    const baseEdges = new EdgesGeometry(baseBox);
    this.instGeom = new InstancedBufferGeometry();
    this.instGeom.instanceCount = 0;
    this.instGeom.frustumCulled = false;
    this.instGeom.index = baseEdges.index;

    for (const name in baseEdges.attributes) {
      this.instGeom.setAttribute(name, baseEdges.attributes[name]);
    }

    this.material = this.createMaterial();
    this.colorArray = new Float32Array(32 * 3);
    this.fillColorArray();

    this.instancePositions = new Float32Array(3);
    this.instanceScales = new Float32Array(3);
    this.instanceColors = new Float32Array(1);

    this.instGeom.setAttribute(
      "instancePosition",
      new InstancedBufferAttribute(this.instancePositions, 3)
    );
    this.instGeom.setAttribute(
      "instanceScale",
      new InstancedBufferAttribute(this.instanceScales, 3)
    );
    this.instGeom.setAttribute(
      "instanceColorIndex",
      new InstancedBufferAttribute(this.instanceColors, 1)
    );

    this.wireframe = new LineSegments(this.instGeom, this.material);
    this.wireframe.frustumCulled = false;

    this.stateSub = stateSubjectGet().getObservable().subscribe(v => {
      this.numOfavailableSets = v.sets.length;
    });
  }

  pushVisibleInstances(matrixCache, maxInstancesPerLayer, setIndex) {
    let parent = this.wireframe.parent;
    if (parent) {
      parent.remove(this.wireframe);
      this.instGeom.dispose();
    }

    const visibilityCache = [];
    let lastLayer = matrixCache.length - 1;

    if (Array.isArray(matrixCache[lastLayer])) {
      lastLayer = lastLayer - 1;
    }

    {
      const inst = Array.isArray(matrixCache[lastLayer])
        ? matrixCache[lastLayer][setIndex]
        : matrixCache[lastLayer];
      const rend = inst.rendered;
      const vis = new Uint8Array(rend.length);
      for (let i = 0; i < rend.length; i++) vis[i] = rend[i] !== -1 ? 1 : 0;
      visibilityCache[lastLayer] = vis;
    }

    for (let layer = lastLayer - 1; layer >= 0; layer--) {
      const inst = Array.isArray(matrixCache[layer])
        ? matrixCache[layer][setIndex]
        : matrixCache[layer];
      const rend = inst.rendered;
      const nextVis = visibilityCache[layer + 1];
      const nextSize = maxInstancesPerLayer[layer + 1] || 0;
      const vis = new Uint8Array(rend.length);

      for (let i = 0; i < rend.length; i++) {
        if (rend[i] !== -1) {
          vis[i] = 1;
          continue;
        }
        const start = i * nextSize;
        const end = start + nextSize;
        for (let j = start; j < end; j++) {
          if (nextVis[j]) {
            vis[i] = 1;
            break;
          }
        }
      }
      visibilityCache[layer] = vis;
    }

    const isVisible = (layer, i) => visibilityCache[layer][i] === 1;

    const computeNumOfInstBeneath = (layer, i) => {
      let num = 0;
      let curLayer = layer;
      let curIdx = i;
      while (curLayer + 1 < matrixCache.length) {
        curLayer++;
        curIdx *= maxInstancesPerLayer[curLayer];
        const layerData = matrixCache[curLayer];
        const inst = Array.isArray(layerData)
          ? layerData[setIndex === -1 ? 0 : setIndex]
          : layerData;
        for (let x = curIdx; x < curIdx + maxInstancesPerLayer[curLayer]; x++) {
          if (inst.rendered[x] !== -1) {
            num = curLayer - layer;
            break;
          }
        }
      }
      return num;
    };

    let count = 0;
    for (let i = 0; i < matrixCache.length; i++) {
      const layer = matrixCache[i];
      if (!Array.isArray(layer)) {
        for (let j = 0; j < layer.rendered.length; j++) {
          if (isVisible(i, j)) count++;
        }
      }
    }

    // allocate buffers
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count * 3);
    const colors = new Float32Array(count);

    let index = 0;
    for (let i = 0; i < matrixCache.length; i++) {
      const layer = matrixCache[i];
      const colorIdx = this.getColorIndex(i, setIndex);
      if (!Array.isArray(layer)) {
        for (let j = 0; j < layer.rendered.length; j++) {
          if (isVisible(i, j)) {
            const scaleAdd = computeNumOfInstBeneath(i, j) * 0.05;
            positions[index * 3]     = layer.pos[j * 3];
            positions[index * 3 + 1] = layer.pos[j * 3 + 1];
            positions[index * 3 + 2] = layer.pos[j * 3 + 2];
            scales[index * 3]     = layer.scale[j * 3] + scaleAdd;
            scales[index * 3 + 1] = layer.scale[j * 3 + 1] + scaleAdd;
            scales[index * 3 + 2] = layer.scale[j * 3 + 2] + scaleAdd;
            colors[index++] = colorIdx;
          }
        }
      }
    }

    const baseBox = new BoxGeometry(1, 1, 1);
    const baseEdges = new EdgesGeometry(baseBox);
    this.instGeom = new InstancedBufferGeometry();
    this.instGeom.instanceCount = count;
    this.instGeom.frustumCulled = false;
    this.instGeom.index = baseEdges.index;

    const attrs = baseEdges.attributes;
    for (const name in attrs) {
      this.instGeom.setAttribute(name, attrs[name]);
    }

    this.instancePositions = positions;
    this.instanceScales = scales;
    this.instanceColors = colors;
    this.instGeom.setAttribute("instancePosition", new InstancedBufferAttribute(positions, 3));
    this.instGeom.setAttribute("instanceScale", new InstancedBufferAttribute(scales, 3));
    this.instGeom.setAttribute("instanceColorIndex", new InstancedBufferAttribute(colors, 1));

    this.wireframe = new LineSegments(this.instGeom, this.material);
    this.wireframe.frustumCulled = false;
    if (parent) parent.add(this.wireframe);
  }


  //TODO cool
  toggleVisibility(matrixCache, maxInstancesPerLayer, setIndex) {
    this.visibility = !this.visibility;
    if (!this.visibility) {
      this.clearWireframe();
    } else {
      this.pushVisibleInstances(matrixCache, maxInstancesPerLayer, setIndex);
    }
  }

  //TODO cool
  dispose() {
    this.instancePositions = [];
    this.instanceScales = [];
    this.wireframe.parent.remove(this.wireframe);
    this.instGeom.dispose();
  }

  //TODO cool
  clearWireframe() {
    this.instancePositions = new Float32Array(3);
    this.instanceScales = new Float32Array(3);
    this.instanceColors = new Float32Array(1);

    this.instGeom.dispose();

    this.instGeom.instanceCount = 0;
  }

  //TODO cool
  fillColorArray() {
    new Color(this.config.color.default).toArray(this.colorArray, 0);
    let currentIndex = 1;

    this.config.color.layer
      .map(c => new Color(c))
      .forEach((color) => {
        const baseIdx = currentIndex * 3;
        color.toArray(this.colorArray, baseIdx);
        currentIndex++;
      });

    this.config.color.set
      .map(c => new Color(c))
      .forEach((color) => {
        const baseIdx = currentIndex * 3;
        color.toArray(this.colorArray, baseIdx);
        currentIndex++;
      });

    this.material.uniforms.colorArray = {value: this.colorArray};
    this.material.uniformsNeedUpdate = true;
  }

  //TODO cool
  createMaterial() {
    return new ShaderMaterial({
      vertexShader: `
                attribute vec3 instancePosition;
                attribute vec3 instanceScale;
                attribute float instanceColorIndex;
                
                uniform vec3 colorArray[32]; // must match maxColors in JS
                
                varying vec3 vColor;
                
                void main() {
                  vec3 transformed = position * instanceScale + instancePosition;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
                
                  int idx = int(instanceColorIndex);
                  vColor = colorArray[idx];
                }
      `,
      fragmentShader: `
            varying vec3 vColor;
            void main() {
              gl_FragColor = vec4(vColor, 1.0);
            }
      `,
      transparent: false
    });
  }

  //TODO cool
  getColorIndex(layer, set) {
    if (this.config.color.set[set]) {
      return this.config.color.layer.length + 1;
    } else if (this.config.color.layer[layer]) {
      return layer + 1;
    } else {
      return 0;
    }
  }

  //TODO cool
  getColorAt(layer, set) {
    if (this.config.color.set[set]) {
      return this.config.color.set[set];
    } else if (this.config.color.layer[layer]) {
      return this.config.color.layer[layer];
    } else {
      return this.config.color.default;
    }
  }
}