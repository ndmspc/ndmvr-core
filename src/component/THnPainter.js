import RadixCounter from "../utils/radixCounter.js";
import {
  areArraysEqual,
  calculateHierarchicalIndex,
  computeAFrameBinSizePos, computeIndexFromPosition, computeJsRootIndexFromPosition, computeMaxContentPerLayer,
  computeMaxInstancesPerLayer,
  computeMinContentPerLayer,
  createBVHTreeRecursive, fillColorArray,
  flipLocalZAxis, getGradientColor, getGradientColorInst, getRangeByPosition,
  rootSizePosToAFrame,
} from "../utils/histogramUtils.js";
import { HistogramPointerClass } from "../core/histogram-pointer-class.js";
import { stateSubjectGet } from "../rxjs/StateSubject.js";
import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";
import { binInfoSubjectGet } from "../rxjs/BinInfoSubject.js";
import HistogramWireframeClass from "./histogram-wireframe-class.js";
import { TPainter } from "./TPainter.js";
import {
  Vector3, Color, BoxGeometry, InstancedBufferGeometry,
  InstancedBufferAttribute, Mesh, ShaderMaterial, Object3D, Box3
} from "three";

export class THnPainter extends TPainter {
  stateSub = undefined;
  pointer = undefined;
  wireframe = undefined;
  BVHTree = [];
  maxInstancesPerLayer = undefined;
  maxContentPerLayer = undefined;
  totalInstances = undefined;
  color = new Color();
  matrixCache = undefined;
  selectedSet = [];
  selectedArray = "content";
  availableSets = [];
  renderHistory = [];
  dirtyInstance = [];

  mesh = undefined;
  instGeom = undefined;
  material = undefined;
  instancePositions = undefined;
  instanceScales = undefined;
  instanceColors = undefined;
  colorArray = undefined;

  constructor (histo, id, opts) {
    super(histo, id, opts);
    this.pointer = new HistogramPointerClass(this.rootObj);

    this.handleStateChange = this.handleStateChange.bind(this);
    this.stateSub = stateSubjectGet()
      .getObservable()
      .subscribe(this.handleStateChange);

    this.init();
    this.renderHistogram(0, this.totalInstances, 0);
  }

  updateHistogram (histo) {
    const parent = this.mesh.parent;
    const raycastHandler = this.mesh.raycast;

    this.mesh.raycast = () => {};
    this.matrixCache = [];
    this.BVHTree = [];
    this.availableSets = [];
    this.selectedSet = [];
    stateSubjectGet().next({
      sets: [],
      selectedSet: [],
      arrays: ["content"],
      selectedArray: "content"
    });
    this.wireframe.dispose();
    this.instGeom.dispose();
    parent.remove(this.mesh);

    this.rootObj = histo.obj;
    this.pointer = new HistogramPointerClass(this.rootObj);
    this.init();
    this.renderHistogram(0, this.totalInstances, 0);


    setTimeout(() => {
      parent.add(this.mesh);
      this.mesh.raycast = raycastHandler;
    }, 0);

    // parent.add(this.mesh);
    parent.add(this.wireframe.wireframe);
  }

  remove () {
    super.remove();
    this.matrixCache = [];
    this.instGeom.dispose();
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
      this.wireframe.dispose();
    }
    this.stateSub.unsubscribe();
  }

  /**
   * @desc Initializes base values and objects.
   * */
  init () {
    this.setAvailableSets(this.pointer.origin);
    this.setAvailableArrays(this.pointer.origin);

    this.maxInstancesPerLayer = computeMaxInstancesPerLayer(this.pointer.origin);
    this.maxContentPerLayer = computeMaxContentPerLayer(this.pointer.origin);
    this.minContentPerLayer = computeMinContentPerLayer(this.pointer.origin);
    this.totalInstances = this.maxInstancesPerLayer.reduce((acc, value) => {
      return acc * value;
    }, 1);

    this.setupInsBufGeom();

    this.wireframe = new HistogramWireframeClass(
      this.maxInstancesPerLayer,
      this.matrixCache,
      this.config.wireframe
    );
  }

  setupMatrixCache() {
    this.matrixCache = new Array(this.maxInstancesPerLayer.length - 1);
    const hasSets = this.availableSets.length > 0;
    if (hasSets) {
      this.matrixCache[this.matrixCache.length - 1] = new Array(this.availableSets.length);
    }

    let multiplier = this.maxInstancesPerLayer[0];
    for (let i = 0; i < this.maxInstancesPerLayer.length - 1 -(hasSets ? 1 : 0); i++) {
      this.matrixCache[i] = {
        pos: new Float32Array(multiplier * 3),
        scale: new Float32Array(multiplier * 3),
        rendered: new Float32Array(multiplier).fill(-1)
      };
      multiplier *= this.maxInstancesPerLayer[i + 1];
    }
    if (!hasSets) return;
    const target = this.matrixCache[this.matrixCache.length - 1];
    for (let i = 0; i < target.length; i++) {
      target[i] = {
        pos: new Float32Array(multiplier * 3),
        scale: new Float32Array(multiplier * 3),
        rendered: new Float32Array(multiplier).fill(-1)
      };
    }
  }

  setupInsBufGeom () {
    this.setupMatrixCache();

    let totalInst = this.maxInstancesPerLayer.reduce((acc, value) => {
      return acc * value;
    }, 1);

    if (this.selectedSet.length > 1) {
      totalInst *= this.selectedSet.length;
    }

    const baseBox = new BoxGeometry(1, 1, 1);
    this.instGeom = new InstancedBufferGeometry();
    this.instGeom.instanceCount = 0; // Start with 0, will be set in render
    this.instGeom.frustumCulled = false;
    this.instGeom.index = baseBox.index;

    for (const name in baseBox.attributes) {
      this.instGeom.setAttribute(name, baseBox.attributes[name]);
    }

    this.material = this.createMaterial();
    this.colorArray = new Float32Array(32 * 6);
    this.material.uniforms.colorArray = { value: this.colorArray };
    fillColorArray(this.config, this.material, this.colorArray);

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

    this.mesh = new Mesh(this.instGeom, this.material);
    this.mesh.raycast = this.raycastHandler;
    this.mesh.frustumCulled = false;

    this.material.uniforms.colorArray = { value: this.colorArray };
    this.mesh.material.uniformsNeedUpdate = true;
  }

  pushVisibleInstances () {
    let parent = this.mesh.parent;
    if (parent) {
      parent.remove(this.mesh);
      this.instGeom.dispose();
    }

    let count = 0;

    // Count first to pre-allocate
    for (let i = 0; i < this.matrixCache.length; i++) {
      const layer = this.matrixCache[i];
      if (Array.isArray(layer)){
        for (let k = 0; k < layer.length; k++) {
          const setLayer = layer[k];
          for (let j = 0; j < setLayer.rendered.length; j++) {
            if (setLayer.rendered[j] !== -1) count++;
          }
        }
      } else {
        for (let j = 0; j < layer.rendered.length; j++) {
          if (layer.rendered[j] !== -1) count++;
        }
      }
    }

    // Pre-allocate exact size
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count * 3);
    const colors = new Float32Array(count);

    let index = 0;
    for (let i = 0; i < this.matrixCache.length; i++) {
      const layer = this.matrixCache[i];
      if (Array.isArray(layer)){
        for (let k = 0; k < layer.length; k++) {
          const setLayer = layer[k];
          for (let j = 0; j < setLayer.rendered.length; j++) {
            if (setLayer.rendered[j] !== -1){
              positions[(index * 3)] = setLayer.pos[j * 3];
              positions[(index * 3) + 1] = setLayer.pos[(j * 3) + 1];
              positions[(index * 3) + 2] = setLayer.pos[(j * 3) + 2];
              scales[(index * 3)] = setLayer.scale[j * 3];
              scales[(index * 3) + 1] = setLayer.scale[(j * 3) + 1];
              scales[(index * 3) + 2] = setLayer.scale[(j * 3) + 2];
              colors[index++] = setLayer.rendered[j];
            }
          }
        }
      } else {
        for (let j = 0; j < layer.rendered.length; j++) {
          if (layer.rendered[j] !== -1) {
            positions[(index * 3)] = layer.pos[j * 3];
            positions[(index * 3) + 1] = layer.pos[(j * 3) + 1];
            positions[(index * 3) + 2] = layer.pos[(j * 3) + 2];
            scales[(index * 3)] = layer.scale[j * 3];
            scales[(index * 3) + 1] = layer.scale[(j * 3) + 1];
            scales[(index * 3) + 2] = layer.scale[(j * 3) + 2];
            colors[index++] = layer.rendered[j];
          }
        }
      }
    }

    const baseBox = new BoxGeometry(1, 1, 1);
    this.instGeom = new InstancedBufferGeometry();
    this.instGeom.instanceCount = count;
    this.instGeom.frustumCulled = false;
    this.instGeom.index = baseBox.index;

    const attrs = baseBox.attributes;
    for (const name in attrs) {
      this.instGeom.setAttribute(name, attrs[name]);
    }

    this.instancePositions = positions;
    this.instanceScales = scales;
    this.instanceColors = colors;
    this.instGeom.setAttribute("instancePosition", new InstancedBufferAttribute(positions, 3));
    this.instGeom.setAttribute("instanceScale", new InstancedBufferAttribute(scales, 3));
    this.instGeom.setAttribute("instanceColorIndex", new InstancedBufferAttribute(colors, 1));

    this.mesh = new Mesh(this.instGeom, this.material);
    this.mesh.raycast = this.raycastHandler;
    this.mesh.frustumCulled = false;
    if (parent) parent.add(this.mesh);
  }

  setMatrixCacheAt(layer, setIndex, index, binSizePos, rendered) {
    const inst = setIndex !== null
      ? this.matrixCache[layer][setIndex]
      : this.matrixCache[layer];
    inst.pos[index * 3] = binSizePos.x.pos;
    inst.pos[(index * 3) + 1] = binSizePos.y.pos;
    inst.pos[(index * 3) + 2] = binSizePos.z.pos;
    inst.scale[index * 3] = binSizePos.x.size;
    inst.scale[(index * 3) + 1] = binSizePos.y.size;
    inst.scale[(index * 3) + 2] = binSizePos.z.size;
    inst.rendered[index] = rendered;
  }

  /**
   * @desc Render whole or part of histogram.
   * @param startIndex Linear index of bin from which render will start.
   * @param endIndex Linear index of bin on which render will end.
   * @param layer Defines layer which will be rendered.
   * @note Linear index is set in this form:
   *  Bins of the deepest layer are offset by 1.
   *  Bins from each upward layer are offset by maximum number of layer beneath.
   * */
  renderHistogram (startIndex, endIndex, layer) {
    if (!this.pointer || layer >= this.maxInstancesPerLayer.length - 1) return;
    this.logRender({
      procedure: "render",
      value: {
        startIndex: startIndex,
        endIndex: endIndex,
        layer: layer,
      },
    });

    const _binSizePos = {
      x: { size: 0, pos: 0 },
      y: { size: 0, pos: 0 },
      z: { size: 0, pos: 0 }
    };

    const render = async (startIndex, endIndex, currentLayer, obj, limits, set) => {
      if (currentLayer > layer) return;
      if (!obj) return;

      const counter = new RadixCounter(
        [obj.fXaxis.fNbins, obj.fYaxis.fNbins, obj.fZaxis.fNbins]
      );
      let contentMin;
      let contentMax;
      let contentMinOut;
      let contentMaxOut;
      const outside = obj.fArrays?.[this.selectedArray]?.outside ?? false;
      const selectedSetIndex = this.selectedSet.indexOf(set);
      const availableSetIndex = this.availableSets.indexOf(set);

      if (this.config.sets.scale.maximum === "relative") {
        const selectedArrayConfig = obj.fArrays?.[this.selectedArray];
        if (!selectedArrayConfig) {
          const valuesWithoutZero = obj.fArray.filter((v) => v !== 0);
          contentMin = Math.min(...valuesWithoutZero);
          contentMax = Math.max(...valuesWithoutZero);
        } else {
          const valuesWithoutZero = selectedArrayConfig.values.filter(
            (v) => v !== 0,
          );
          contentMinOut = Math.min(...valuesWithoutZero);
          contentMaxOut = Math.max(...valuesWithoutZero);
          contentMin = selectedArrayConfig.min ?? contentMinOut;
          contentMax = selectedArrayConfig.max ?? contentMaxOut;
        }
      } else if (set && this.maxContentPerLayer[currentLayer][set]) {
        contentMax = this.maxContentPerLayer[currentLayer][set];
        contentMin = this.minContentPerLayer[currentLayer][set];
      } else {
        contentMax = this.maxContentPerLayer[currentLayer][this.selectedArray];
        contentMin = this.minContentPerLayer[currentLayer][this.selectedArray];
      }

      if (contentMin === contentMax) contentMin = contentMax - 1;

      const isTH3 = obj._typename.substring(0, 3) === "TH3";
      const isTH2 = obj._typename.substring(0, 3) === "TH2";
      const isTH1 = obj._typename.substring(0, 3) === "TH1";
      const stepFor = this.maxInstancesPerLayer
        .slice(currentLayer + 1)
        .reduce((acc, value) => {
          return acc * value;
        }, 1);
      counter.setFromNumber(startIndex / stepFor);

      const sourcePadding = this.config.padding.layer[currentLayer]
        ?? this.config.padding.default;

      let padding =
        !this.config.padding.layer[currentLayer] && isTH1
          ? { x: sourcePadding.x, y: sourcePadding.y, z: sourcePadding.z }
          : { ...sourcePadding };

      if (set && this.config.padding.sets && isTH1) {
        padding = { x: this.config.padding.sets.x, y: 0, z: 0 };
      }
      if (this.pointer.isOnSet) {
        padding = { x: 0, y: 0, z: 0 };
      }

      const { min: minFactor, max: maxFactor } = this.config.scale?.[currentLayer]
        ? this.config.scale?.[currentLayer]
        : this.config.scale.default;

      for (let i = startIndex; i < endIndex; i += stepFor) {
        const relPos = {
          x: counter.getValueAt(0),
          y: counter.getValueAt(1),
          z: counter.getValueAt(2),
        };

        const binSizePos = flipLocalZAxis(
          limits.position.z,
          limits.scale.z,
          rootSizePosToAFrame(computeAFrameBinSizePos(
            obj, relPos, padding, limits?.scale, limits?.position,
            currentLayer, _binSizePos
          )),
        );

        //-------------ODTADIAL---------
        const content = this.getBinContent(
          obj, relPos.x, relPos.y, relPos.z, this.selectedArray
        );

        let scaleFactor = 1;
        if ((content >= contentMin && content <= contentMax) === !outside) {
          const contentPer = (content - contentMin) / (contentMax - contentMin);
          if (!outside) {
            scaleFactor =
              Number.isInteger(content) && content === 0
                ? (scaleFactor = 0)
                : (maxFactor - minFactor) * contentPer + minFactor;
          } else {
            const contentPerOut =
              (content - contentMinOut) / (contentMaxOut - contentMinOut);
            scaleFactor =
              Number.isInteger(content) && content === 0
                ? (scaleFactor = 0)
                : (maxFactor - minFactor) * contentPerOut + minFactor;
          }
        } else {
          scaleFactor = 0;
        }

        this.color = getGradientColorInst(
          this.config.color, this.availableSets,
          content, 0, contentMax, availableSetIndex, currentLayer
        );

        const t = binSizePos.y.size * scaleFactor;

        if (scaleFactor === 0) {
          binSizePos.x.size = 0;
          binSizePos.z.size = 0;
          binSizePos.y.size = 0;
        } else {
          if (isTH3) {
            binSizePos.x.size *= scaleFactor;
            binSizePos.z.size *= scaleFactor;
            binSizePos.y.size = t;
          } else if (isTH2) {
            binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
            binSizePos.y.size = t;
          } else {
            binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
            binSizePos.y.size = t;
            if (set) {
              const scale = this.config.TH1ZScale.set;
              binSizePos.z.size = scale ? scale : 0.01;
            } else {
              this.config.TH1ZScale?.layer?.[currentLayer]
                ? (binSizePos.z.size =
                  limits.scale.z * this.config.TH1ZScale.layer[currentLayer])
                : (binSizePos.z.size =
                  limits.scale.z * this.config.TH1ZScale.default);
            }
          }
        }

        if (!set) {
          if (this.pointer.isOnSet) {
            binSizePos.z.size = 0.01;
            binSizePos.z.pos += (selectedSetIndex - (this.selectedSet.length - 1) / 2) * 0.1;
          }
          this.setMatrixCacheAt(
            currentLayer, null, i / stepFor, binSizePos,
            (currentLayer === layer && scaleFactor !== 0) ? this.color : -1
          );
        } else {
          binSizePos.z.size = 0.01;
          binSizePos.z.pos += (selectedSetIndex - (this.selectedSet.length - 1) / 2) * 0.1;
          this.setMatrixCacheAt(
            currentLayer, availableSetIndex, i / stepFor, binSizePos,
            (currentLayer === layer && scaleFactor !== 0) ? this.color : -1
          );
        }

        if (currentLayer === layer) {
          let ind = i;
          if (set) {
            ind += this.totalInstances * selectedSetIndex;
          }

        } else {
          const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1);
          let child = undefined;
          const limits = {
            position: new Vector3(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos),
            scale: new Vector3(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
          };
          if (obj.children.content) {
            child = obj.children.content[index];
            render(i, endIndex, currentLayer + 1, child, limits);
          } else {
            this.selectedSet.forEach((set) => {
              child = obj.children[set][index];
              render(i, endIndex, currentLayer + 1, child, limits, set);
            });
          }
        }

        //---------POTADIAL------------
        if (!counter.increment()) break;
      }
    };

    render(startIndex, endIndex, 0, this.pointer.origin, this.limits).then(() => {
      setTimeout(() => {
        this.wireframe.pushVisibleInstances(
          this.matrixCache, this.maxInstancesPerLayer,
          this.availableSets.indexOf(this.selectedSet[0])
        );
        this.pushVisibleInstances();

        this.BVHTree = createBVHTreeRecursive(
          this.matrixCache, this.pointer.origin, 0, this.selectedSet,
          this.availableSets, this.mesh.matrixWorld, this.maxInstancesPerLayer
        );

      }, 0);
    });
  }

  createMaterial () {
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

      // --- Gradient logic ---
      float colorIndex = clamp(instanceColorIndex, 0.0, 31.9999); // stay within bounds
      int idx0 = int(floor(colorIndex));
      int idx1 = int(ceil(colorIndex));
      float t = fract(colorIndex); // blend amount between the two colors
      
      vec3 c0 = colorArray[idx0];
      vec3 c1 = colorArray[idx1];
      vColor = mix(c0, c1, t); // smooth blend
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

  mouseClickDefault (event) {
    this.showChildHistogram(event.index);
    canvasSubjectGet().next({
      // id: this.id + "-cinema",
      id: "*",
      obj: event.jsrootObj,
    });
  }

  mousemoveDefault (event) {
    const areIndexesEqual = (index1, index2) => {
      if (index1.length !== index2.length) return false;
      for (let i = 0; i < index1.length; i++) {
        const a = index1[i],
          b = index2[i];
        if (a.x !== b.x || a.y !== b.y || a.z !== b.z) return false;
      }
      return true;
    };

    if (areIndexesEqual(event.index, this.dirtyInstance)) {
      this.dirtyInstance = null;
      return;
    }
    const parentRange = this.pointer.parentPath.map(p => {
      const range = p.range[0];
      return {
        bin: p.bin[0],
        ...range
      };
    });
    event.range = event.range.map((r, i) => {
      const instance = event.jsrootInstance[i];
      return { ...r, bin: instance };
    });
    const merged = {
      ...event,
      level: parentRange.length,
      range: parentRange.concat(event.range)
    };
    const { range: coords, level, content, error, set, triggerSource, instanceId } = merged;
    const minimizedEvent = { coords, level, content, error, set, triggerSource, instanceId };
    binInfoSubjectGet().next(minimizedEvent);
  }

  shiftMouseClickDefault (event) {
    this.hideChildHistogram(event.index);
  }

  mouseDBClickDefault (event) {
    event.set
      ? this.setPointerToChild(event.index, event.set)
      : this.setPointerToChild(event.index, this.selectedSet[0]);
  }

  shiftMouseDBClickDefault (event) {
    this.setPointerToParent();
  }

  intersectionHandler (intersection, triggerSource) {
    this.mouseEvents
      .filter((mouseEvent) => mouseEvent.event === triggerSource)
      .forEach((mouseEvent) => mouseEvent.function(intersection, this));

    this.dirtyInstance = intersection.index;
  }

  raycastHandler (raycaster) {
    try {
      const res = this.checkIntersectionBVH(raycaster.ray);

      const intersection = res[0];
      if (intersection) {
        const triggerSource = raycaster._triggerSource;
        this.intersectionHandler(intersection, triggerSource);
      }
    } catch (e) {
      console.log(e);
    }
  }

  handleStateChange (state) {
    if (areArraysEqual(state.sets, this.availableSets) &&
      (!areArraysEqual(state.selectedSet, this.selectedSet) ||
        this.selectedArray !== state.selectedArray)) {
      this.selectedArray = state.selectedArray;
      this.selectedSet = state.selectedSet;
      const parent = this.mesh.parent;
      this.instGeom.dispose();
      parent.remove(this.mesh);
      this.setupInsBufGeom();
      parent.add(this.mesh);

      const renderHistoryCopy = this.renderHistory;
      this.renderHistory = [];

      renderHistoryCopy.forEach((call) => {
        if (call.procedure === "render") {
          this.renderHistogram(
            call.value.startIndex, call.value.endIndex, call.value.layer
          );
        } else if (call.procedure === "hide") {
          this.hideChildHistogram(call.value);
        }
      });
    } else {
      this.availableSets = state.sets;
      this.selectedSet = state.selectedSet;
    }
  }

  /**
   * @desc Method to set pointers origin to one of origins child.
   * In result, only part of histogram specified by child is rendered.
   * @param position Array in which each entry represents position specified by jsroot.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * @param set Specifies from which set should child be chosen.
   * If children contains sets, parameter need to be specified.
   * */
  setPointerToChild (position, set) {
    const parent = this.mesh.parent;

    this.matrixCache = [];
    this.instGeom.dispose();
    this.wireframe.dispose();
    parent.remove(this.mesh);

    const range = getRangeByPosition(
      position, set, this.pointer.origin,
      this.wireframe, this.selectedSet
    );

    this.pointer.setOriginToChild(
      computeJsRootIndexFromPosition(position, this.pointer.origin, this.selectedSet),
      set, range);
    this.init();
    console.log("path: ", this.pointer.path);
    console.log("title: ", this.pointer.title);
    this.renderHistogram(0, this.totalInstances, 0);
    parent.add(this.mesh);
    parent.add(this.wireframe.wireframe);
  }

  /**
   * @desc Method to set pointers origin to its parent.
   * * */
  setPointerToParent () {
    const parent = this.mesh.parent;

    this.matrixCache = [];
    this.instGeom.dispose();
    this.wireframe.dispose();
    parent.remove(this.mesh);

    this.pointer.setOriginToParent(1);
    console.log("path: ", this.pointer.path);
    console.log("title: ", this.pointer.title);
    this.init();
    this.renderHistogram(0, this.totalInstances, 0);
    parent.add(this.mesh);
    parent.add(this.wireframe.wireframe);
  }

  /**
   * @desc Method to show (render) histogram that is currently represented by bin.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * */
  showChildHistogram (position) {
    const ind = computeIndexFromPosition(
      position, this.pointer.origin,
      this.maxInstancesPerLayer, this.selectedSet
    );

    const t = this.maxInstancesPerLayer.slice(
      -this.maxInstancesPerLayer.length + position.length,
    );
    const multiplier = t.reduce((acc, value) => {
      return acc * value;
    }, 1);

    this.renderHistogram(
      ind.slice(-1)[0],
      ind.slice(-1)[0] + multiplier,
      position.length,
    );
  }

  /**
   * @desc Method to hide (child) histogram and show (render) bin from layer above.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * */
  hideChildHistogram (position) {
    if (position.length === 1) return;

    const layerDimensions = this.maxInstancesPerLayer.slice(
      position.length - 1,
    );
    const cacheLayerDimensions = this.maxInstancesPerLayer.slice(
      position.length - 1,
      this.maxInstancesPerLayer.length - 1,
    );
    const totalMultiplier = layerDimensions.reduce(
      (acc, value) => acc * value,
      1,
    );

    const startIndex = calculateHierarchicalIndex(
      position, this.pointer.origin, this.maxInstancesPerLayer, this.selectedSet
    );
    const startIndexFloored =
      Math.floor(startIndex / totalMultiplier) * totalMultiplier;

    this.clearMatrixCacheRange(
      startIndexFloored, totalMultiplier,
      cacheLayerDimensions, position.length - 1,
    );
    this.logRender({
      procedure: "hide",
      value: position,
    });
    this.renderHistogram(
      startIndexFloored,
      startIndexFloored + totalMultiplier,
      position.length - 2,
    );
    this.renderHistory.pop(); //removes duplicit renderHistogram call
  }

  /**
   * @desc Method to clear matrix cache from start index to end index,
   * including objects in sub-layers with corresponding index.
   * @param startIndex Defines linear index from which objects will be deleted.
   * @param multiplier Defines offset from start index to end index.
   * At upmost layer endIndex = startIndex + multiplier.
   * @param dimensions Array with number of instances for each layer that will be cleared.
   * @param baseLayerIndex start index of layer from which cache is cleared.
   * */
  clearMatrixCacheRange (startIndex, multiplier, dimensions, baseLayerIndex) {
    let currentIndex = startIndex;
    let currentMultiplier = multiplier;
    const zeroVolume = {
      x: { pos: 0, size: 0 },
      y: { pos: 0, size: 0 },
      z: { pos: 0, size: 0 }
    };

    for (let i = baseLayerIndex + dimensions.length - 1; i >= baseLayerIndex; i--) {
      if (Array.isArray(this.matrixCache[i])) {
        for (let j = 0; j < this.matrixCache[i].length; j++) {
          for (let k = currentIndex; k < currentIndex + currentMultiplier; k++) {
            this.setMatrixCacheAt(i, j, k, zeroVolume, -1);
          }
          // this.matrixCache[i][j].fill(
          //   null, currentIndex, currentIndex + currentMultiplier
          // );
        }
      } else {
        for (let k = currentIndex; k < currentIndex + currentMultiplier; k++) {
          this.setMatrixCacheAt(i, null, k, zeroVolume, -1);
        }
        // this.matrixCache[i].fill(
        //   null, currentIndex, currentIndex + currentMultiplier
        // );
      }

      if (i > baseLayerIndex) {
        currentIndex /= dimensions[i - baseLayerIndex];
        currentMultiplier /= dimensions[i - baseLayerIndex];
      }
    }
  }

  /**
   * @desc Method to set available sets based on origin.
   * @param origin Jsroot histogram object
   * @return is null. Sets that are found are set in stateSubject.
   * */
  setAvailableSets (origin) {
    if (origin.children?.content) {
      const firstChild = origin.children.content.find((child) => {
        return child;
      });
      this.setAvailableSets(firstChild);
    } else if (origin?.children) {
      const currentValue = stateSubjectGet().getValue();
      currentValue.sets = Object.keys(origin.children);

      if (currentValue.selectedSet.length === 0) {
        this.selectedSet.push(currentValue.sets[0]);
        currentValue.selectedSet.push(currentValue.sets[0]);
      } else if (!this.selectedSet.every(set =>
        currentValue.sets.find(s => s === set))) {
        currentValue.selectedSet = [currentValue.sets[0]];
      }
      stateSubjectGet().next(currentValue);
    } else {
      const currentValue = stateSubjectGet().getValue();
      currentValue.sets = [];
      currentValue.selectedSet = [];
    }
  }

  setAvailableArrays (origin) {
    const currentValue = stateSubjectGet().getValue();
    currentValue.arrays = [];
    if (origin.fArrays) currentValue.arrays = Object.keys(origin.fArrays);
    currentValue.arrays.unshift("content");

    const appendChildArrays = (children) => {
      const firstChild = children.find(s => s);
      if (firstChild.fArrays) {
        currentValue.arrays = currentValue.arrays.concat(Object.keys(firstChild.fArrays));
      }
      if (firstChild.children?.content) appendChildArrays(firstChild.children.content);
    };

    if (origin.children?.content) appendChildArrays(origin.children.content);

    // if (origin.children?.content) {
    //   console.log(origin.children.content.fArrays);
    // } else if (origin?.children) {
    //   origin.children.forEach((child) => {
    //     console.log(child.fArrays);
    //   });
    // }
    stateSubjectGet().next(currentValue);
  }

  /**
   * @desc Key down handler for nested histogram.
   * Creates functionality where user can render each layer at once.
   * @param event Defines incoming event which will be put against regex.
   * */
  keyDownHandler (event) {
    const regex = /^(?:Digit|Numpad)(\d+)$/;
    const match = event.code.match(regex);
    if (match) {
      if (parseInt(match[1]) > this.matrixCache.length) return;
      const dummy = new Object3D();
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();

      let totalInst = this.maxInstancesPerLayer.reduce((acc, value) => {
        return acc * value;
      }, 1);
      if (this.selectedSet.length > 1) {
        totalInst *= this.selectedSet.length;
      }

      this.setupMatrixCache();

      this.wireframe.clearWireframe();
      this.renderHistogram(
        0, this.totalInstances, parseInt(match[1]) - 1
      );

    } else if (event.key === this.keyBindings.hideOutlines) {
      this.wireframe.toggleVisibility(
        this.matrixCache, this.maxInstancesPerLayer,
        this.availableSets.indexOf(this.selectedSet[0])
      );
    } else if (event.key === this.keyBindings.resetHistogram) {
      this.resetHistogram();
    } else if (event.key === this.keyBindings.goToPreviousLayer) {
      this.setPointerToParent();
    }
  }

  keyUpHandler (event) {
    // console.log(event);
  }

  resetHistogram() {
    this.updateHistogram({obj: this.rootObj});
  }

  /**
   * Logs rendering events (including showing and hiding child histograms)
   * to the `renderHistory`.
   *
   * This is especially useful when the selected set changes.
   *
   * @param {Object} obj - The render operation details.
   * @param {"render" | "hide"} obj.procedure - The type of operation.
   * @param {number | Object} obj.value - The associated value:
   *   - If `procedure` is `"hide"`, this is the position used in the hide method.
   *   - If `procedure` is `"render"`, this is an object containing:
   *     @param {number} obj.value.startIndex - The starting index.
   *     @param {number} obj.value.endIndex - The ending index.
   *     @param {number} obj.value.layer - The layer used in rendering.
   */

  logRender (obj) {
    if (obj.procedure === "render") {
      if (
        obj.value.startIndex === 0 &&
        obj.value.endIndex === this.totalInstances
      ) {
        this.renderHistory = [];
      }
    }
    this.renderHistory.push(obj);
  }

  getBinContent (obj, posX, posY, posZ, selectedArray) {
    if (selectedArray === "content" || !obj.fArrays) {
      return obj.getBinContent(posX + 1, posY + 1, posZ + 1);
    } else {
      const index = obj.getBin(posX + 1, posY + 1, posZ + 1);
      return obj.fArrays?.[selectedArray].values[index];
    }
  }

  checkIntersectionBVH (ray) {
    const target = new Vector3();

    const createBox3 = (layer, index, offset, set) => {
      if (index < 0 || 1 / index === -Infinity) {
        const indexABS = index * (-1);
        //matrixCache leaf node
        const t =
          set && set !== "content"
            ? this.matrixCache[layer]?.[this.availableSets.indexOf(set)]
            : this.matrixCache[layer];
        return t
          ? new Box3().setFromCenterAndSize(
            new Vector3(t.pos[indexABS * 3], t.pos[(indexABS * 3) + 1], t.pos[(indexABS * 3) + 2]),
            new Vector3(t.scale[indexABS * 3], t.scale[(indexABS * 3) + 1], t.scale[(indexABS * 3) + 2])
          )
          : undefined;
      } else {
        const t =
          set && set !== "content"
            ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
            : this.BVHTree[layer][offset];
        return t
          ? new Box3().setFromCenterAndSize(
            new Vector3(t.pos[index * 3], t.pos[(index * 3) + 1], t.pos[(index * 3) + 2]),
            new Vector3(t.scale[index * 3], t.scale[(index * 3) + 1], t.scale[(index * 3) + 2])
          )
          : undefined;
      }
    };

    const computeNumOfInstBeneath = (layer, i) => {
      let num = 0;
      let curLayer = layer;
      let curIdx = i;

      while (curLayer + 1 < this.matrixCache.length) {
        curLayer++;
        const layerData = this.matrixCache[curLayer];
        if (Array.isArray(layerData)){
          this.selectedSet.forEach(selSet =>{
            const selSetInd = this.availableSets.indexOf(selSet);
            for (let i = curIdx; i < curIdx + this.maxInstancesPerLayer[curLayer]; i++) {
              if (layerData[selSetInd].rendered[i] !== -1) {
                num = curLayer - layer;
                break;
              }
            }
          });
        } else {
          if (!layerData) return num;
          for (let i = curIdx; i < curIdx + this.maxInstancesPerLayer[curLayer]; i++) {
            if (layerData.rendered[i] !== -1) {
              num = curLayer - layer;
              break;
            }
          }
        }
        curIdx *= this.maxInstancesPerLayer[curLayer + 1];
      }
      return num;
    };

    const checkAxis = (index, offset, layer, set) => {
      const parent = set && set !== "content"
        ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
        : this.BVHTree[layer][offset];
      const boundaryFirstHalf = createBox3(layer, parent.left[index], offset, set);
      const boundarySecondHalf = createBox3(layer, parent.right[index], offset, set);

      const resultList = [];
      if (ray.intersectBox(boundaryFirstHalf, target)) {
        resultList.push({
          index: parent.left[index],
          target: target.clone(),
          distance: ray.origin.distanceTo(target),
        });
      } else {
        resultList.push(null);
      }
      if (ray.intersectBox(boundarySecondHalf, target)) {
        resultList.push({
          index: parent.right[index],
          target: target.clone(),
          distance: ray.origin.distanceTo(target),
        });
      } else {
        resultList.push(null);
      }
      return resultList;
    };

    const dfs = (layer, offset, set) => {
      const output = [];
      const traverse = (details) => {
        if (details.index < 0 || 1 / details.index === -Infinity) {
          output.push(details);
          return;
        }
        const [firstHalf, secondHalf] = checkAxis(
          details.index, offset, layer, set,
        );
        if (firstHalf) traverse(firstHalf);
        if (secondHalf) traverse(secondHalf);
      };
      const internalNode = set && set !== "content"
        ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
        : this.BVHTree[layer][offset];

      if (!internalNode) return output;

      traverse({
        index: internalNode.left.length - 1,
        target: null,
        distance: null,
      });

      return output;
    };

    const recursiveSearch = (
      node, layer, offset = 0, path = [], set = undefined
    ) => {
      const result = [];
      const perInstance = this.maxInstancesPerLayer[layer + 1];
      const indexOffset =
        this.maxInstancesPerLayer[layer] * this.maxInstancesPerLayer[layer + 1];

      dfs(layer, offset, set).forEach((intersect) => {
        const indexNormalized =
          Math.abs(intersect.index) - offset * this.maxInstancesPerLayer[layer];
        const posX = indexNormalized % node.fXaxis.fNbins;
        const posY = Math.floor(
          (indexNormalized % (node.fXaxis.fNbins * node.fYaxis.fNbins)) /
          node.fXaxis.fNbins,
        );
        const posZ = Math.floor(
          indexNormalized / (node.fXaxis.fNbins * node.fYaxis.fNbins),
        );
        const fullPath = [...path, { x: posX, y: posY, z: posZ }];

        if (node.children) {
          const children = Object.entries(node.children);

          const childResults = children.flatMap(([setX, childX]) => {
            //get child jsroot node
            const binIndex = node.getBin(posX + 1, posY + 1, posZ + 1);
            const child = childX?.[binIndex];
            if (!child) return [];

            const childOffset =
              offset * indexOffset +
              (posX + posY * node.fXaxis.fNbins + posZ *
                (node.fXaxis.fNbins * node.fYaxis.fNbins)
              ) * perInstance;
            const next = computeNumOfInstBeneath(layer, childOffset, null);

            if (!(next > 0)) return [];

            let r = recursiveSearch(
              child, layer + 1, Math.abs(intersect.index), fullPath, setX
            );

            if (setX !== "content") {
              r = r.map((res) => ({ ...res, set: setX }));
            }
            return r;
          });
          if (childResults.length > 0) {
            result.push(...childResults);
          } else {
            const childOffset =
              offset * this.maxInstancesPerLayer[layer] +
              (posX + posY * node.fXaxis.fNbins
                + posZ * (node.fXaxis.fNbins * node.fYaxis.fNbins)
              );
            const instance =
              set && set !== "content"
                ? this.matrixCache[layer]?.[this.availableSets.indexOf(set)]
                : this.matrixCache[layer];
            if (instance.rendered[childOffset] !== -1)
              result.push({
                index: fullPath,
                target: intersect.target,
                distance: intersect.distance,
                set: set,
                instanceId: computeIndexFromPosition(
                  fullPath, this.pointer.origin,
                  this.maxInstancesPerLayer, this.selectedSet),
                jsrootInstance: computeJsRootIndexFromPosition(
                  fullPath, this.pointer.origin, this.selectedSet),
                range: getRangeByPosition(
                  fullPath, set, this.pointer.origin, this.wireframe, this.selectedSet),
                origin: this,
                jsrootObj: node,
                content: this.getBinContent(node, posX, posY, posZ, this.selectedArray),
                error: node.getBinError(posX + 1, posY + 1, posZ + 1),
              });
          }
        } else {
          result.push({
            index: fullPath,
            target: intersect.target,
            distance: intersect.distance,
            set: set,
            instanceId: computeIndexFromPosition(
              fullPath, this.pointer.origin,
              this.maxInstancesPerLayer, this.selectedSet),
            jsrootInstance: computeJsRootIndexFromPosition(
              fullPath, this.pointer.origin, this.selectedSet),
            range: getRangeByPosition(
              fullPath, set, this.pointer.origin, this.wireframe, this.selectedSet),
            origin: this,
            jsrootObj: node,
            content: this.getBinContent(node, posX, posY, posZ, this.selectedArray),
            error: node.getBinError(posX + 1, posY + 1, posZ + 1),
          });
        }
      });
      return result.sort((a, b) => {
        return a.distance - b.distance;
      });
    };

    return recursiveSearch(this.pointer.origin, 0);
  }

  dispatchSubjectHandler (event) {
    console.log("dispatch: ", event);
    const pos = event.event.index.map(v => {
      return { x: v.x - 1, y: v.y - 1, z: v.z - 1 };
    });

    const node = this.pointer.getChildByPosition(
      computeJsRootIndexFromPosition([...pos]).slice(0, -1),
      event.event.set, this.selectedSet
    );
    const expandedEvent = {
      index: pos,
      set: event.event.set,
      jsrootInstance: computeJsRootIndexFromPosition(
        pos, this.pointer.origin, this.selectedSet),
      range: getRangeByPosition(
        pos, event.event.set, this.pointer.origin, this.wireframe, this.selectedSet),
      origin: this,
      jsrootObj: node,
      content: this.getBinContent(
        node, pos[0].x + 1, pos[0].y + 1, pos[0].z + 1,
        this.selectedArray
      ),
      error: node.getBinError(pos[0].x + 1, pos[0].y + 1, pos[0].z + 1)
    };
    this.intersectionHandler(expandedEvent, event.event.source);
  }
}
