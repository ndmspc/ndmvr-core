import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { filter } from "rxjs";
import { FloatType } from "three";
import { stateSubjectGet } from "../rxjs/StateSubject.js";

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

  constructor (maxInstancesPerLayer, matrixCache, config) {
    this.config = config;
    this.maxInstancesPerLayer = maxInstancesPerLayer;

    const baseBox = new THREE.BoxGeometry(1, 1, 1);
    const baseEdges = new THREE.EdgesGeometry(baseBox);
    this.instGeom = new THREE.InstancedBufferGeometry();
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
      new THREE.InstancedBufferAttribute(this.instancePositions, 3)
    );
    this.instGeom.setAttribute(
      "instanceScale",
      new THREE.InstancedBufferAttribute(this.instanceScales, 3)
    );
    this.instGeom.setAttribute(
      "instanceColorIndex",
      new THREE.InstancedBufferAttribute(this.instanceColors, 1)
    );

    this.wireframe = new THREE.LineSegments(this.instGeom, this.material);
    this.wireframe.frustumCulled = false;

    this.stateSub = stateSubjectGet().getObservable().subscribe(v => {
      this.numOfavailableSets = v.sets.length;
    });
  }

  pushVisibleInstances (matrixCache, maxInstancesPerLayer, setIndex) {
    let parent = this.wireframe.parent;
    if (parent) {
      parent.remove(this.wireframe);
      this.instGeom.dispose();
    }

    const computeNumOfInstBeneath = (layer, i) => {
      let num = 0;
      let curLayer = layer;
      let curIdx = i;

      while (curLayer + 1 < matrixCache.length) {
        curLayer++;
        curIdx *= maxInstancesPerLayer[curLayer];
        const layerData = matrixCache[curLayer];
        const inst = Array.isArray(layerData)
          ? layerData[setIndex]
          : layerData;
        for (let i = curIdx; i < curIdx + maxInstancesPerLayer[curLayer]; i++) {
          if (inst.rendered[i] !== -1) {
            num = curLayer - layer;
            break;
          }
        }
      }
      return num;
    };

    const isVisible = (layer, i) => {
      // const layerData = matrixCache[layer];
      // if (!layerData) return false;

      const instance = Array.isArray(matrixCache[layer])
        ? matrixCache[layer][setIndex]
        : matrixCache[layer];

      if (instance.rendered[i] !== -1) return true;

      if (layer + 1 >= matrixCache.length) return false;

      const nextLayerSize = maxInstancesPerLayer[layer + 1] || 0;
      const startIndex = i * nextLayerSize;
      const endIndex = startIndex + nextLayerSize;

      for (let j = startIndex; j < endIndex; j++) {
        if (isVisible(layer + 1, j)) return true;
      }
      return false;
    };

    let count = 0;
    for (let i = 0; i < matrixCache.length; i++) {
      const layer = matrixCache[i];
      if (Array.isArray(layer)) {
        for (let k = 0; k < layer.length; k++) {
          if (this.config.displaySets) {
            // const setLayer = layer[k];
            // for (let j = 0; j < setLayer.rendered.length; j++) {
            //   if (setLayer.rendered[j] !== -1) count++;
            // }
          }
        }
      } else {
        for (let j = 0; j < layer.rendered.length; j++) {
          if (isVisible(i, j)) count++;
        }
      }
    }
    console.log("wireframe count: ", count);

    // Pre-allocate
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count * 3);
    const colors = new Float32Array(count);

    let index = 0;
    for (let i = 0; i < matrixCache.length; i++) {
      const layer = matrixCache[i];
      const colorIdx = this.getColorIndex(i, setIndex);
      if (Array.isArray(layer)) {
        for (let k = 0; k < layer.length; k++) {
          if (this.config.displaySets) {
            // const setLayer = layer[k];
            // for (let j = 0; j < setLayer.rendered.length; j++) {
            //   if (setLayer.rendered[j] !== -1) count++;
            // }
          }
        }
      } else {
        for (let j = 0; j < layer.rendered.length; j++) {
          if (isVisible(i, j)) {
            const scaleAdd = computeNumOfInstBeneath(i, j) * 0.05;
            positions[(index * 3)] = layer.pos[j * 3];
            positions[(index * 3) + 1] = layer.pos[(j * 3) + 1];
            positions[(index * 3) + 2] = layer.pos[(j * 3) + 2];
            scales[(index * 3)] = layer.scale[j * 3] + scaleAdd;
            scales[(index * 3) + 1] = layer.scale[(j * 3) + 1] + scaleAdd;
            scales[(index * 3) + 2] = layer.scale[(j * 3) + 2] + scaleAdd;
            colors[index++] = colorIdx;
          }
        }
      }
    }

    // let idx = 0;
    // let idx3 = 0;
    //
    // for (let layerIdx = 0; layerIdx < matrixCache.length; layerIdx++) {
    //   const layer = matrixCache[layerIdx];
    //   const colorIdx = this.getColorIndex(layerIdx, setIndex);
    //
    //   for (let instIdx = 0; instIdx < layer.length; instIdx++) {
    //     const instance = layer[instIdx];
    //
    //     if (Array.isArray(instance)) {
    //       if (!displaySets) continue;
    //       for (let k = 0; k < instance.length; k++) {
    //         const inst = instance[k];
    //         if (!inst) continue;
    //         const p = inst.position, s = inst.scale;
    //         positions[idx3] = p.x;
    //         positions[idx3 + 1] = p.y;
    //         positions[idx3 + 2] = p.z;
    //         scales[idx3] = s.x;
    //         scales[idx3 + 1] = s.y;
    //         scales[idx3 + 2] = s.z;
    //         colors[idx++] = colorIdx;
    //         idx3 += 3;
    //       }
    //     } else if (instance && isVisible(layerIdx, instIdx)) {
    //       const numBeneath = computeNumOfInstBeneath(layerIdx, instIdx);
    //       const scaleAdd = numBeneath * 0.05;
    //       const p = instance.position, s = instance.scale;
    //       positions[idx3] = p.x;
    //       positions[idx3 + 1] = p.y;
    //       positions[idx3 + 2] = p.z;
    //       scales[idx3] = s.x + scaleAdd;
    //       scales[idx3 + 1] = s.y + scaleAdd;
    //       scales[idx3 + 2] = s.z + scaleAdd;
    //       colors[idx++] = colorIdx;
    //       idx3 += 3;
    //     }
    //   }
    // }

    const baseBox = new THREE.BoxGeometry(1, 1, 1);
    const baseEdges = new THREE.EdgesGeometry(baseBox);
    this.instGeom = new THREE.InstancedBufferGeometry();
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
    this.instGeom.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(positions, 3));
    this.instGeom.setAttribute("instanceScale", new THREE.InstancedBufferAttribute(scales, 3));
    this.instGeom.setAttribute("instanceColorIndex", new THREE.InstancedBufferAttribute(colors, 1));

    this.wireframe = new THREE.LineSegments(this.instGeom, this.material);
    this.wireframe.frustumCulled = false;
    if (parent) parent.add(this.wireframe);
  }

  //TODO cool
  toggleVisibility (matrixCache, maxInstancesPerLayer, setIndex) {
    this.visibility = !this.visibility;
    if (!this.visibility) {
      this.clearWireframe();
    } else {
      this.pushVisibleInstances(matrixCache, maxInstancesPerLayer, setIndex);
    }
  }

  //TODO cool
  dispose () {
    this.instancePositions = [];
    this.instanceScales = [];
    this.wireframe.parent.remove(this.wireframe);
    this.instGeom.dispose();
  }

  //TODO cool
  clearWireframe () {
    this.instancePositions = new Float32Array(3);
    this.instanceScales = new Float32Array(3);
    this.instanceColors = new Float32Array(1);

    this.instGeom.dispose();

    this.instGeom.instanceCount = 0;
  }

  //TODO cool
  fillColorArray () {
    new THREE.Color(this.config.color.default).toArray(this.colorArray, 0);
    let currentIndex = 1;

    this.config.color.layer
      .map(c => new THREE.Color(c))
      .forEach((color) => {
        const baseIdx = currentIndex * 3;
        color.toArray(this.colorArray, baseIdx);
        currentIndex++;
      });

    this.config.color.set
      .map(c => new THREE.Color(c))
      .forEach((color) => {
        const baseIdx = currentIndex * 3;
        color.toArray(this.colorArray, baseIdx);
        currentIndex++;
      });

    this.material.uniforms.colorArray = { value: this.colorArray };
    this.material.uniformsNeedUpdate = true;
  }

  //TODO cool
  createMaterial () {
    return new THREE.ShaderMaterial({
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
  getColorIndex (layer, set) {
    if (this.config.color.set[set]) {
      return this.config.color.layer.length + 1;
    } else if (this.config.color.layer[layer]) {
      return layer + 1;
    } else {
      return 0;
    }
  }

  //TODO cool
  getColorAt (layer, set) {
    if (this.config.color.set[set]) {
      return this.config.color.set[set];
    } else if (this.config.color.layer[layer]) {
      return this.config.color.layer[layer];
    } else {
      return this.config.color.default;
    }
  }
}