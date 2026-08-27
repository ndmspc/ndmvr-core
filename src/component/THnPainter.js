import RadixCounter from "../utils/radixCounter.js";
import {
  areArraysEqual, areMinMaxValuesEqual,
  calculateHierarchicalIndex,
  computeIndexFromPosition,
  computeJsRootIndexFromPosition,
  computeMaxContentPerLayer,
  computeMaxErrorPerLayer,
  computeMaxInstancesPerLayer,
  computeMinContentPerLayer,
  computeMinErrorPerLayer,
  createBVHTreeRecursive,
  fillColorArray,
  flipLocalZAxis,
  getGradientColorInst,
  getRangeByPosition,
  getChildObjectByIndex,
  rootSizePosToThreeCoords, getRootBinSizePos, areAvailableAxesEqual, computeRenderRangeIterator,
} from "../utils/histogramUtils.js";
import {HistogramPointerClass} from "../core/histogram-pointer-class.js";
import {stateSubjectGet} from "../rxjs/StateSubject.js";
import {canvasSubjectGet} from "../rxjs/CanvasSubject.js";
import {binInfoSubjectGet} from "../rxjs/BinInfoSubject.js";
import HistogramWireframeClass from "./histogram-wireframe-class.js";
import {TPainter} from "./TPainter.js";
import {
  Box3,
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  Object3D,
  ShaderMaterial,
  Vector3
} from "three";
import {areLimitsEqual, createHnotFilledSprite, ensureDefaultBindings} from "../utils/baseUtil.js";
import {configSubjectGet} from "../rxjs/ConfigSubject.js";
import {ErrorCrossClass} from "./ErrorCrossClass.js";
import { build3d } from "jsroot";
import HistogramAxesClass from "./histogram-axes-class.js";

export class THnPainter extends TPainter {
  stateSub = undefined;
  pointer = undefined;
  wireframe = undefined;
  axesBuildPromise = undefined;
  axes = undefined;
  errorCross = undefined;
  BVHTree = [];
  minMaxValue = [];
  maxInstancesPerLayer = undefined;
  maxContentPerLayer = undefined;
  maxErrorPerLayer = undefined;
  totalInstances = undefined;
  color = new Color();
  matrixCache = undefined;
  selectedSet = [];
  selectedArray = "content";
  availableSets = [];
  dirtyInstance = [];
  renderRanges = [];

  mesh = undefined;
  instGeom = undefined;
  material = undefined;
  instancePositions = undefined;
  instanceScales = undefined;
  instanceColors = undefined;
  colorArray = undefined;

  constructor(histo, id, opts) {
    super(histo, id, opts);
    this.pointer = new HistogramPointerClass(this.rootObj);
    this.axes = new HistogramAxesClass(this.id);

    this.handleStateChange = this.handleStateChange.bind(this);
    this.stateSub = stateSubjectGet(this.id)
      .getObservable()
      .subscribe(this.handleStateChange);

    this.init(true);
    // this.renderHistogram(0, this.totalInstances, 0);
  }

  async updateHistogram(histo) {
    let raycastHandler = undefined;
    const parent = this.mesh.parent;
    parent.remove(this.mesh);
    // parent.remove(this.axes.axes);
    if (this.pointer.isHistogramFilled) {
      raycastHandler = this.mesh.raycast;
      this.mesh.raycast = () => {
      };
      this.wireframe.dispose();
      this.instGeom.dispose();
    }

    if (this.errorCross) {
      this.errorCross.dispose();
      this.errorCross = undefined;
    }

    this.matrixCache = [];
    this.BVHTree = [];
    this.availableSets = [];
    this.selectedSet = [];
    this.availableAxes = [];
    this.minMaxValue = [];
    // stateSubjectGet(this.id).next({
    //   sets: [],
    //   selectedSet: [],
    //   arrays: ["content"],
    //   selectedArray: "content",
    //   minMaxValue: []
    // });

    this.rootObj = histo.obj;
    this.pointer = new HistogramPointerClass(this.rootObj);
    this.init(true);
    await this.renderHistogram(0, this.totalInstances, 0);
    this.mesh.raycast = raycastHandler;

    parent.add(this.mesh);
    parent.add(this.wireframe.wireframe);
    // parent.add(this.axes.axes);
    if (this.errorCross) {
      parent.add(this.errorCross.lines);
      if (this.errorCross.linesTick) parent.add(this.errorCross.linesTick);
    }
  }

  remove() {
    super.remove();
    this.matrixCache = [];
    this.instGeom.dispose();
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
      this.wireframe.dispose();
    }
    if (this.errorCross) {
      this.errorCross.dispose();
      this.errorCross = undefined;
    }
    this.stateSub.unsubscribe();
  }

  /**
   * @desc Initializes base values and objects.
   * */
  init(updateState = false) {
    this.maxInstancesPerLayer = computeMaxInstancesPerLayer(this.pointer.origin);
    if (updateState) {
      this.maxContentPerLayer = computeMaxContentPerLayer(this.pointer.origin);
      this.minContentPerLayer = computeMinContentPerLayer(this.pointer.origin);
      this.maxErrorPerLayer = computeMaxErrorPerLayer(this.pointer.origin, this.maxContentPerLayer);
      this.minErrorPerLayer = computeMinErrorPerLayer(this.pointer.origin, this.minContentPerLayer);
      let state = stateSubjectGet(this.id).getValue();
      state = this.setAvailableSets(this.pointer.origin, state);
      state = this.setAvailableArrays(this.pointer.origin, state);
      state = this.setAvailableAxes(this.pointer.origin, state);
      state = this.setAvailableAxisRanges(this.pointer.origin, state.availableAxes, state);
      // stateSubjectGet(this.id).next(state);
      // this.setCorrectWireframeEnd();

      const minMaxValues = new Array(this.maxContentPerLayer.length);
      for (let i = 0; i < this.maxContentPerLayer.length; i++) {
        minMaxValues[i] = {};
        Object.keys(this.maxContentPerLayer[i]).forEach(key => {
          minMaxValues[i][key] = {
            value: {min: this.minContentPerLayer[i][key], max: this.maxContentPerLayer[i][key],
              fXmin: this.minContentPerLayer[i][key], fXmax: this.maxContentPerLayer[i][key]},
            error: {min: this.minErrorPerLayer[i][key], max: this.maxErrorPerLayer[i][key],
              fXmin: this.minErrorPerLayer[i][key], fXmax: this.maxErrorPerLayer[i][key]}
          };
        });
      }
      this.minMaxValue = minMaxValues;
      state.minMaxValue = minMaxValues;
      stateSubjectGet(this.id).next(state);
    }

    this.totalInstances = this.maxInstancesPerLayer.reduce((acc, value) => {
      return acc * value;
    }, 1);

    this.setupInsBufGeom();

    this.wireframe = new HistogramWireframeClass(
      this.maxInstancesPerLayer,
      this.matrixCache,
      this.config.wireframe,
      this.id
    );

    if (this.config?.errorCross?.enabled === true) {
      this.errorCross = new ErrorCrossClass(this.config, this.id);
    }
  }

  setupMatrixCache() {
    this.matrixCache = new Array(this.maxInstancesPerLayer.length - 1);
    const hasSets = this.availableSets.length > 0;
    if (hasSets) {
      this.matrixCache[this.matrixCache.length - 1] = new Array(this.availableSets.length);
    }

    let multiplier = this.maxInstancesPerLayer[0];
    for (let i = 0; i < this.maxInstancesPerLayer.length - 1 - (hasSets ? 1 : 0); i++) {
      this.matrixCache[i] = {
        pos: new Float32Array(multiplier * 3),
        scale: new Float32Array(multiplier * 3),
        rendered: new Float32Array(multiplier).fill(-1),
        error: new Float32Array(multiplier)
      };
      multiplier *= this.maxInstancesPerLayer[i + 1];
    }
    if (!hasSets) return;
    const target = this.matrixCache[this.matrixCache.length - 1];
    for (let i = 0; i < target.length; i++) {
      target[i] = {
        pos: new Float32Array(multiplier * 3),
        scale: new Float32Array(multiplier * 3),
        rendered: new Float32Array(multiplier).fill(-1),
        error: new Float32Array(multiplier)
      };
    }
  }

  setupInsBufGeom() {
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
    this.material.uniforms.colorArray = {value: this.colorArray};
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

    this.material.uniforms.colorArray = {value: this.colorArray};
    this.mesh.material.uniformsNeedUpdate = true;
  }

  pushVisibleInstances() {
    let parent = this.mesh.parent;
    if (parent) {
      parent.remove(this.mesh);
      this.instGeom.dispose();
    }

    let count = 0;

    // Count first to pre-allocate
    for (let i = 0; i < this.matrixCache.length; i++) {
      const layer = this.matrixCache[i];
      if (Array.isArray(layer)) {
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
      if (Array.isArray(layer)) {
        for (let k = 0; k < layer.length; k++) {
          const setLayer = layer[k];
          for (let j = 0; j < setLayer.rendered.length; j++) {
            if (setLayer.rendered[j] !== -1) {
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
    if (this.errorCross && this.errorCross.config.enabled) {
      this.mesh.material.colorWrite = false;
      this.mesh.material.depthWrite = false;
    }
    if (parent) parent.add(this.mesh);

    if (this.errorCross) {
      this.errorCross.pushVisibleInstances(
        this.pointer.origin,
        this.matrixCache,
        this.maxInstancesPerLayer,
        this.availableSets.indexOf(this.selectedSet[0]),
        this.limits.scale,
        count
      );
    }
  }

  setMatrixCacheAt(layer, setIndex, index, binSizePos, rendered, error) {
    const inst = setIndex !== null
      ? this.matrixCache[layer][setIndex]
      : this.matrixCache[layer];
    // if (inst.pos.length < index * 3) console.error("Index is out of bounds");
    inst.pos[index * 3] = binSizePos.x.pos;
    inst.pos[(index * 3) + 1] = binSizePos.y.pos;
    inst.pos[(index * 3) + 2] = binSizePos.z.pos;
    inst.scale[index * 3] = binSizePos.x.size;
    inst.scale[(index * 3) + 1] = binSizePos.y.size;
    inst.scale[(index * 3) + 2] = binSizePos.z.size;
    inst.rendered[index] = rendered;
    inst.error[index] = error || 0;
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
  async renderHistogram(startIndex, endIndex, layer) {
    if (!this.pointer || layer >= this.maxInstancesPerLayer.length - 1) return;
    this.logRender({
      procedure: "render",
      value: {
        startIndex: startIndex,
        endIndex: endIndex,
        layer: layer,
      },
    });
    // console.log('RENDER_________________________');

    const _binSizePos = {
      x: {size: 0, pos: 0},
      y: {size: 0, pos: 0},
      z: {size: 0, pos: 0}
    };

    const render = async (startIndex, endIndex, currentLayer, obj, limits, set) => {
      if (currentLayer > layer) return;
      if (!obj) return;
      // console.log("maxinstnces: ", this.maxInstancesPerLayer);

      const counter = new RadixCounter(
        [obj.fXaxis.fNbins, obj.fYaxis.fNbins, obj.fZaxis.fNbins]
      );

      let contentMin;
      let contentMax;
      let errorMax;
      let errorMin;
      let contentMinOut;
      let contentMaxOut;
      const outside = obj.fArrays?.[this.selectedArray]?.outside ?? false;
      const selectedSetIndex = this.selectedSet.indexOf(set);
      const availableSetIndex = this.availableSets.indexOf(set);
      const fArrayValuesAvailable = obj.fArrays ? obj.fArrays[Object.keys(obj.fArrays)[0]].values ?? false : false;
      const scaleType = this.availableAxes[currentLayer];

      //PRIKLAD NA static CONFIG
      // {
      //   "static": {
      //   "default": {
      //     "min": -1,
      //       "max": 1
      //   },
      //   "layer": [{
      //     "min": -1,
      //     "max": 1
      //   }, {
      //     "min": -1,
      //     "max": 500000
      //   }]
      // }
      // }
      const scaleByValue = this.config.scale.scaleBy === "value";

      if (set) {  //set
        if (this.config.scale.sets === "fixed") {
          // ({min: contentMin, max: contentMax} =
          //   this.config.scale.sets.static.layer?.[currentLayer] ??
          //   this.config.scale.sets.static.default);
          ({min: contentMin, max: contentMax} =
            this.minMaxValue[currentLayer + this.pointer.parentPath.length][set].value);
          ({min: errorMin, max: errorMax} =
            this.minMaxValue[currentLayer + this.pointer.parentPath.length][set].error);
          // errorMax = this.maxErrorPerLayer[currentLayer][set];
          // errorMin = this.minErrorPerLayer[currentLayer][set];

        } else if (this.config.scale.sets === "relative") { //set relative
          const fSumw2Filtered = obj.fSumw2.filter((v) => v !== 0);
          const valuesWithoutZero = scaleByValue
            ? obj.fArray.filter((v) => v !== 0)
            : fSumw2Filtered;
          contentMin = Math.min(...valuesWithoutZero);
          contentMax = Math.max(...valuesWithoutZero);
          errorMax = this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][set];
          errorMin = this.minErrorPerLayer[currentLayer + this.pointer.parentPath.length][set];
        } else {  //set global
          contentMin = scaleByValue
            ? this.minContentPerLayer[currentLayer + this.pointer.parentPath.length][set]
            : -0.1;
          contentMax = scaleByValue
            ? this.maxContentPerLayer[currentLayer + this.pointer.parentPath.length][set]
            : this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][set];
          errorMax = this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][set];
          errorMin = this.minErrorPerLayer[currentLayer + this.pointer.parentPath.length][set];
        }

      } else if (this.selectedArray !== "content" && obj.fArrays && fArrayValuesAvailable) { //array
        if (this.config.scale.parameter === "fixed") { //array fixed
          ({min: contentMin, max: contentMax} =
            // this.minMaxValue[0][this.selectedArray].value);
          this.minMaxValue[currentLayer + this.pointer.parentPath.length][this.selectedArray].value);
          ({min: errorMin, max: errorMax} =
            // this.minMaxValue[0][this.selectedArray].error);
          this.minMaxValue[currentLayer + this.pointer.parentPath.length][this.selectedArray].error);
          // ({min: contentMin, max: contentMax} =
          // this.config.scale.parameter.static.layer?.[currentLayer] ??
          // this.config.scale.parameter.static.default);

          // errorMax = this.maxErrorPerLayer[currentLayer][this.selectedArray];
          // errorMin = this.minErrorPerLayer[currentLayer][this.selectedArray];

        } else if (this.config.scale.parameter === "relative") {  //array relative
          const fSumw2Filtered = obj.fArrays[this.selectedArray].errors.filter((v) => v !== 0);
          const valuesWithoutZero = scaleByValue
            ? obj.fArrays[this.selectedArray].values.filter((v) => v !== 0)
            : fSumw2Filtered;
          contentMin = Math.min(...valuesWithoutZero);
          contentMax = Math.max(...valuesWithoutZero);
          errorMax = this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray];
          errorMin = this.minErrorPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray];

        } else {  //array global
          contentMin = scaleByValue ? this.minContentPerLayer[0][this.selectedArray] : -0.1;
          // contentMin = scaleByValue ? this.minContentPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray] : -0.1;
          contentMax = scaleByValue
            ? this.maxContentPerLayer[0][this.selectedArray]
            // ? this.maxContentPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray]
            : this.maxErrorPerLayer[0][this.selectedArray];
          // : this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray];
          // errorMax = this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray];
          errorMax = this.maxErrorPerLayer[0][this.selectedArray];
          // errorMin = this.minErrorPerLayer[currentLayer + this.pointer.parentPath.length][this.selectedArray];
          errorMin = this.minErrorPerLayer[0][this.selectedArray];
        }

      } else {  //content
        const branch = this.pointer.isOnSet ?? "content";
        if (this.config.scale.content === "fixed") { //content fixed
          ({min: contentMin, max: contentMax} =
            this.minMaxValue[currentLayer + this.pointer.parentPath.length][branch].value);
          ({min: errorMin, max: errorMax} =
            this.minMaxValue[currentLayer + this.pointer.parentPath.length][branch].error);
          // ({min: contentMin, max: contentMax} =
          //   this.config.scale.content.static.layer?.[currentLayer] ??
          //   this.config.scale.content.static.default);

          // errorMax = this.maxErrorPerLayer[currentLayer][branch];
          // errorMin = this.minErrorPerLayer[currentLayer][branch];

        } else if (this.config.scale.content === "relative") {  //content relative
          const fSumw2Filtered = obj.fSumw2.filter((v) => v !== 0);
          const valuesWithoutZero = scaleByValue
            ? obj.fArray.filter((v) => v !== 0)
            : fSumw2Filtered;
          contentMin = Math.min(...valuesWithoutZero);
          contentMax = Math.max(...valuesWithoutZero);
          errorMax = this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][branch];
          errorMin = this.minErrorPerLayer[currentLayer + this.pointer.parentPath.length][branch];
        } else {  //content global
          contentMin = scaleByValue ? this.minContentPerLayer[currentLayer + this.pointer.parentPath.length][branch] : -0.1;
          contentMax = scaleByValue
            ? this.maxContentPerLayer[currentLayer + this.pointer.parentPath.length][branch]
            : this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][branch];
          errorMax = this.maxErrorPerLayer[currentLayer + this.pointer.parentPath.length][branch];
          errorMin = this.minErrorPerLayer[currentLayer + this.pointer.parentPath.length][branch];
        }
      }

      if (contentMin === contentMax) {
        contentMin = contentMax - 0.2;
      }

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
          ? {x: sourcePadding.x, y: sourcePadding.y, z: sourcePadding.z}
          : {...sourcePadding};

      if (set && this.config.padding.sets && isTH1) {
        padding = {x: this.config.padding.sets.x, y: 0, z: 0};
      }
      if (this.pointer.isOnSet) {
        padding = {x: 0, y: 0, z: 0};
      }

      const {min: minFactor, max: maxFactor} = this.config.scale?.layer?.[currentLayer]
        ? this.config.scale?.layer[currentLayer]
        : this.config.scale.default;


      //-----------------------------------------------------------------
      //----------------MAIN FOR CYCLE-----------------------------------
      //-----------------------------------------------------------------
      for (let i = startIndex; i < endIndex; i += stepFor) {
        const relPos = {
          x: counter.getValueAt(0),
          y: counter.getValueAt(1),
          z: counter.getValueAt(2),
        };

        const binSizePos = flipLocalZAxis(
          limits.position.z,
          limits.scale.z,
          rootSizePosToThreeCoords(getRootBinSizePos(
            obj, relPos, padding, limits?.scale, limits?.position,
            currentLayer, this.config.scale.ignoreVarBinning, _binSizePos
          )),
        );

        let scaleMin = this.config.scale.scaleBy === "value" ? contentMin : errorMin;
        const scaleMax = this.config.scale.scaleBy === "value" ? contentMax : errorMax;

        let content = fArrayValuesAvailable || this.selectedArray === "content"
          ? this.getBinContent( obj, relPos.x, relPos.y, relPos.z, this.selectedArray)
          : scaleMax;
        const error = fArrayValuesAvailable || this.selectedArray === "content"
          ? this.getBinError( obj, relPos.x, relPos.y, relPos.z, this.selectedArray)
          : scaleMax;

        const scaleValue = this.config.scale.scaleBy === "value" ? content : error;

        // console.log("content", content, "error", error, "scaleValue: ", scaleValue, "outside?: ", outside, "scaleMin", scaleMin, "scaleMax", scaleMax );

        let scaleFactor = 1;
        if (scaleMin === scaleMax) {
          scaleFactor = 1;
        } else if ((scaleValue >= scaleMin) === !outside) {
          const contentPer = scaleType[0].scaleType === "log10"
            ? Math.log(1 + (scaleValue - scaleMin)) / Math.log(1 + (scaleMax - scaleMin))
            : (scaleValue - scaleMin) / (scaleMax - scaleMin);
          if (!outside) {
            // scaleFactor =
            //   Number.isInteger(scaleValue) && scaleValue === 0 && this.config.scale.scaleBy === "value"
            //     ? (scaleFactor = 0)
            //     : ((maxFactor - minFactor) * contentPer) + minFactor;
            scaleFactor = ((maxFactor - minFactor) * contentPer) + minFactor;

            if (scaleFactor > 1) scaleFactor = 1;
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

        if (this.config.color.colorBy === "value") {
          this.color = getGradientColorInst(
            this.config.color, content, contentMin, contentMax, availableSetIndex, currentLayer, scaleType[0].errorType
          );
        } else {
          this.color = getGradientColorInst(
            this.config.color, error, errorMin, errorMax, availableSetIndex, currentLayer, scaleType[0].errorType
          );
        }

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
          let pointerSet = null;
          if (this.pointer.isOnSet) {
            binSizePos.z.size = 0.01;
            binSizePos.z.pos += (selectedSetIndex - (this.selectedSet.length - 1) / 2) * 0.1;
            pointerSet = this.availableSets.indexOf(this.pointer.isOnSet);
          }
          this.setMatrixCacheAt(
            currentLayer, pointerSet, i / stepFor, binSizePos,
            (currentLayer === layer && scaleFactor !== 0) ? this.color : -1,
            error
          );
        } else {
          binSizePos.z.size = 0.01;
          binSizePos.z.pos += (selectedSetIndex - (this.selectedSet.length - 1) / 2) * 0.1;
          this.setMatrixCacheAt(
            currentLayer, availableSetIndex, i / stepFor, binSizePos,
            (currentLayer === layer && scaleFactor !== 0) ? this.color : -1,
            error
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

    return (this.pointer.isOnSet
      ? Promise.all(this.selectedSet.map(set =>
        render(startIndex, endIndex, 0,
          getChildObjectByIndex(this.pointer.rootObj,
            this.pointer.parentPath.map(v => v.bin[0]), set), this.limits, set)))
      : render(startIndex, endIndex, 0, this.pointer.origin, this.limits)
    ).then(() => {
      if (!this.pointer.isOnSet) {
        this.wireframe.pushVisibleInstances(
          this.matrixCache, this.maxInstancesPerLayer,
          this.availableSets.indexOf(this.selectedSet[0])
        );
      }
      this.pushVisibleInstances();
      this.axes.buildAxes(this.pointer.origin, this.limits);

      const pointerSet = this.availableSets.indexOf(this.pointer.isOnSet) === -1
        ? null
        : this.availableSets.indexOf(this.pointer.isOnSet);
      this.BVHTree = createBVHTreeRecursive(
        this.matrixCache, this.pointer.origin, 0, this.selectedSet,
        pointerSet,
        this.availableSets, this.mesh.matrixWorld, this.maxInstancesPerLayer
      );
    });
  }

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


  mouseClickDefault(event) {
    const parentRange = this.pointer.parentPath.map(p => {
      const range = p.range[0];
      return {bin: p.bin[0], ...range};
    });
    const rangeWithBin = (event.range || []).map((r, i) => ({...r, bin: event.jsrootInstance?.[i]}));
    binInfoSubjectGet().next({
      coords: parentRange.concat(rangeWithBin),
      level: parentRange.length,
      content: event.content,
      error: event.error,
      set: event.set,
      instanceId: event.instanceId,
      point: event.target,
    });

    this.showChildHistogram(event.index);
    if (event.selectedArray !== "content" && event.jsrootObj?.fArrays[event.selectedArray]?.values) {
      event.jsrootObj.fArray = event.jsrootObj.fArrays[event.selectedArray]?.values;
      event.jsrootObj.fSumw2 = event.jsrootObj.fArrays[event.selectedArray]?.errors;
      event.jsrootObj.fMinimum = event.jsrootObj.fArrays[event.selectedArray]?.min;
      event.jsrootObj.fMaximum = event.jsrootObj.fArrays[event.selectedArray]?.max;
    }
    canvasSubjectGet().next({
      id: this.id + "-cinema",
      // id: "*",
      obj: event.jsrootObj,
    });
  }

  /**
   * @desc Returns the bin position and scale
   * for a given index and set from matrix cache(scaled to content/error).
   * @returns {Object} - {position: {x, y, z}, scale: {x, y, z}}
   * */
  getBinPosScaleByIndexMC(index, set) {
    const layer = set && set !== "content"
      ? this.matrixCache[index.length - 1][this.availableSets.indexOf(set)]
      : this.matrixCache[index.length - 1];

    const cacheIndex = (index.at(-1) /   //instance index
        this.maxInstancesPerLayer.slice(index.length).reduce((acc, value) => acc * value, 1)) //divider
      * 3;  //match array

    return {
      position: layer.pos.slice(cacheIndex, cacheIndex + 3),
      scale: layer.scale.slice(cacheIndex, cacheIndex + 3)
    };
  }

  /**
   * @desc Returns the bin position and scale (whole available/not scaled)
   * for a given index and set(scaled to content/error).
   * @returns {Object} - {position: {x, y, z}, scale: {x, y, z}}
   * */
  getBinPosScaleByIndex(index, set, obj, relPos) {
    const toXYZ = ({ scale, position }) => ({
      scale: { x: scale[0], y: scale[1], z: scale[2] },
      position: { x: position[0], y: position[1], z: position[2] }
    });

    const currentLayer = index.length - 1;
    const limits = currentLayer === 0 //get limits of previous bin layer
      ? this.limits
      : toXYZ(this.getBinPosScaleByIndexMC(index.slice(0, -1), null));
    const _binSizePos = {
      x: {size: 0, pos: 0},
      y: {size: 0, pos: 0},
      z: {size: 0, pos: 0}
    };

    const isTH1 = obj._typename.substring(0, 3) === "TH1";
    const sourcePadding = this.config.padding.layer[currentLayer]
      ?? this.config.padding.default;

    let padding =
      !this.config.padding.layer[currentLayer] && isTH1
        ? {x: sourcePadding.x, y: sourcePadding.y, z: sourcePadding.z}
        : {...sourcePadding};

    if (set && this.config.padding.sets && isTH1) {
      padding = {x: this.config.padding.sets.x, y: 0, z: 0};
    }
    if (this.pointer.isOnSet) {
      padding = {x: 0, y: 0, z: 0};
    }

    flipLocalZAxis(
      limits.position.z,
      limits.scale.z,
      rootSizePosToThreeCoords(getRootBinSizePos(
        obj, relPos, padding, limits?.scale, limits?.position,
        currentLayer, this.config.scale.ignoreVarBinning, _binSizePos
      )),
    );

    return {
      position: [_binSizePos.x.pos, _binSizePos.y.pos, _binSizePos.z.pos],
      scale: [_binSizePos.x.size, _binSizePos.y.size, _binSizePos.z.size]
    };
  }


  mousemoveDefault(event) {
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
      return {...r, bin: instance};
    });
    const merged = {
      ...event,
      level: parentRange.length,
      range: parentRange.concat(event.range)
    };
    const {range: coords, level, content, error, set, triggerSource, instanceId} = merged;
    const minimizedEvent = {coords, level, content, error, set, triggerSource, instanceId, point: event.target};
    binInfoSubjectGet().next(minimizedEvent);
  }

  shiftMouseClickDefault(event) {
    this.hideChildHistogram(event.index);
  }

  mouseDBClickDefault(event) {
    event.set
      ? this.setPointerToChild(event.index, event.set)
      : this.setPointerToChild(event.index, this.selectedSet[0]);
  }

  shiftMouseDBClickDefault(event) {
    this.setPointerToParent();
  }

  intersectionHandler(intersection, triggerSource) {
    this.mouseEvents
      .filter((mouseEvent) => mouseEvent.event === triggerSource)
      .forEach((mouseEvent) => mouseEvent.function(intersection, this));

    this.dirtyInstance = intersection.index;
  }

  raycastHandler(raycaster, intersects) {
    try {
      const res = this.checkIntersectionBVH(raycaster.ray);

      const intersection = res[0];
      if (intersection) {
        intersection.isHistogramBin = true;
        const triggerSource = raycaster._triggerSource;
        this.intersectionHandler(intersection, triggerSource);
        intersects.push(intersection);
      }
    } catch (e) {
      console.log(e);
    }
  }

  handleStateChange(state) {
    const setsAreSame = areArraysEqual(state.sets, this.availableSets);
    const selectedSetChanged = !areArraysEqual(state.selectedSet, this.selectedSet);
    const selectedArrayChanged = this.selectedArray !== state.selectedArray;
    const axisRangesChanged = !areMinMaxValuesEqual(
      this.pointer.axisRanges,
      state.axisRanges
    );
    const minMaxValuesChanged =
      this.minMaxValue.length !== 0 &&
      !areMinMaxValuesEqual(state.minMaxValue, this.minMaxValue);

    if ((setsAreSame &&
        (selectedSetChanged || selectedArrayChanged || axisRangesChanged)) ||
      minMaxValuesChanged
    ) {
      this.selectedArray = state.selectedArray;
      this.selectedSet = state.selectedSet;
      this.minMaxValue = state.minMaxValue;

      const parent = this.mesh.parent;
      this.instGeom.dispose();
      parent.remove(this.mesh);
      if (this.errorCross && this.errorCross.config.enabled) {
        this.mesh.material.colorWrite = false;
        this.mesh.material.depthWrite = false;
      }
      if (axisRangesChanged) {
        this.pointer.setHistogramRanges(state.axisRanges);
        this.maxInstancesPerLayer = computeMaxInstancesPerLayer(this.pointer.origin);
        this.totalInstances = this.maxInstancesPerLayer.reduce((acc, value) => {
          return acc * value;
        }, 1);
        this.setupInsBufGeom();
        this.renderHistogram(0, this.totalInstances, 0);
        parent.add(this.mesh);
      } else {
        this.setupInsBufGeom();
        parent.add(this.mesh);
        this.renderHistogramHistory();
      }

    }
    // else if (this.minMaxValue.length !== 0 && areMinMaxValuesEqual(state.minMaxValue, this.minMaxValue)) {
    //   this.renderHistogramHistory();
    //
    // }
    else {
      this.availableSets = state.sets;
      this.selectedSet = state.selectedSet;
      this.minMaxValue = state.minMaxValue;
      this.availableAxes = state.availableAxes;
      if (axisRangesChanged) {
        this.pointer.setHistogramRanges(state.axisRanges);
        this.maxInstancesPerLayer = computeMaxInstancesPerLayer(this.pointer.origin);
        this.totalInstances = this.maxInstancesPerLayer.reduce((acc, value) => {
          return acc * value;
        }, 1);

      }
    }
  }

  async renderHistogramHistory() {
    const renderHistoryCopy = this.renderHistory;
    this.renderHistory = [];

    for (const call of renderHistoryCopy) {
      if (call.procedure === "render") {
        await this.renderHistogram(
          call.value.startIndex, call.value.endIndex, call.value.layer
        );
      } else if (call.procedure === "hide") {
        this.hideChildHistogram(call.value);
      }
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
  async setPointerToChild(position, set) {
    const parent = this.mesh.parent;

    this.matrixCache = [];
    this.instGeom.dispose();
    this.wireframe.dispose();
    parent.remove(this.mesh);

    if (this.errorCross) {
      this.errorCross.dispose();
      this.errorCross = undefined;
    }

    const range = getRangeByPosition(
      position, set, this.pointer.origin,
      this.wireframe, this.selectedSet
    );

    this.pointer.setOriginToChild(
      computeJsRootIndexFromPosition(position, this.pointer.origin, this.selectedSet),
      set, range);

    if (!this.pointer.isHistogramFilled) {
      this.mesh = createHnotFilledSprite(this.limits, this.setPointerToParent.bind(this));
      parent.add(this.mesh);
      return;
    }

    this.init(false);
    console.log("path: ", this.pointer.path);
    console.log("title: ", this.pointer.title);
    await this.renderHistogram(0, this.totalInstances, 0);
    parent.add(this.mesh);
    parent.add(this.wireframe.wireframe);
    if (this.errorCross) {
      parent.add(this.errorCross.lines);
      if (this.errorCross.linesTick) parent.add(this.errorCross.linesTick);
    }

    if (this.pointer.isOnSet) {
      this.wireframe.toggleVisibility(this.matrixCache, this.maxInstancesPerLayer, this.availableSets.indexOf(set));
    }
  }

  /**
   * @desc Method to set pointers origin to its parent.
   * * */
  async setPointerToParent() {
    const parent = this.mesh.parent;
    parent.remove(this.mesh);
    if (this.pointer.isHistogramFilled) {
      this.matrixCache = [];
      this.instGeom.dispose();
      this.wireframe.dispose();
    }

    if (this.errorCross) {
      this.errorCross.dispose();
      this.errorCross = undefined;
    }

    this.pointer.setOriginToParent(1);
    console.log("path: ", this.pointer.path);
    console.log("title: ", this.pointer.title);
    this.init(false);
    await this.renderHistogram(0, this.totalInstances, 0);
    parent.add(this.mesh);
    parent.add(this.wireframe.wireframe);
    if (this.errorCross) {
      parent.add(this.errorCross.lines);
      if (this.errorCross.linesTick) parent.add(this.errorCross.linesTick);
    }
  }

  /**
   * @desc Method to show (render) histogram that is currently represented by bin.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * */
  showChildHistogram(position) {
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
  hideChildHistogram(position) {
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
  clearMatrixCacheRange(startIndex, multiplier, dimensions, baseLayerIndex) {
    let currentIndex = startIndex;
    let currentMultiplier = multiplier;
    const zeroVolume = {
      x: {pos: 0, size: 0},
      y: {pos: 0, size: 0},
      z: {pos: 0, size: 0}
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
   * @desc Method to set available axes based on origin.
   * @param origin Jsroot histogram object
   * @note size/color can either be linear or log10
   * @return is null. Sets that are found are set in stateSubject.
   * */
  setAvailableAxes(origin, currentValue) {
    if (!currentValue) currentValue = stateSubjectGet(this.id).getValue();
    const axes = [];
    const axisNames = ["x", "y", "z"];

    const setAxesForObj = (obj) => {
      const layerAxes = [];
      layerAxes.push({size: "linear", color: "linear"});
      const nAxes = Number.parseInt(obj._typename.substring(2, 3), 10);
      for (let i = 0; i < nAxes; i++) {
        const axisKey = axisNames[i]; // "x", "y", or "z"
        const axisObj = obj[`f${axisKey.toUpperCase()}axis`];
        layerAxes.push({
          axis: axisKey,
          fTitle: axisObj.fTitle,
          fName: axisObj.fName,
          size: "linear",
          color: "linear",
          fXmax: axisObj.fXmax,
          fXmin: axisObj.fXmin,
          fNbins: axisObj.fNbins,
        });
      }
      axes.push(layerAxes);
      if (obj.children) {
        setAxesForObj(obj.children[Object.keys(obj.children)[0]].find(x => x !== null));
      }
    };
    setAxesForObj(origin);
    currentValue.availableAxes = axes;
    this.availableAxes = axes;
    return currentValue;
    // stateSubjectGet(this.id).next(currentValue);
  }

  /**
   * @desc Method to set available sets based on origin.
   * @param origin Jsroot histogram object
   * @return is null. Sets that are found are set in stateSubject.
   * */
  setAvailableSets(origin, currentValue) {
    if (origin.children?.content) {
      const firstChild = origin.children.content.find((child) => {
        return child;
      });
      this.setAvailableSets(firstChild, currentValue);
    } else if (origin?.children) {
      if (!currentValue) currentValue = stateSubjectGet(this.id).getValue();
      // const currentValue = stateSubjectGet(this.id).getValue();
      currentValue.sets = Object.keys(origin.children);
      this.availableSets = currentValue.sets;
      // this.selectedSet = this.availableSets[0];

      if (currentValue.selectedSet.length === 0 || this.selectedSet.length === 0) {
        this.selectedSet.push(currentValue.sets[0]);
        // currentValue.selectedSet.push(currentValue.sets[0]);
      } else if (!this.selectedSet.every(set =>
        currentValue.sets.find(s => s === set))) {
        currentValue.selectedSet = [currentValue.sets[0]];
        this.selectedSet = currentValue.selectedSet;
      }
      return currentValue;
      // stateSubjectGet(this.id).next(currentValue);
    } else {
      const currentValue = stateSubjectGet(this.id).getValue();
      currentValue.sets = [];
      currentValue.selectedSet = [];
    }
  }

  setAvailableArrays(origin, currentValue) {
    if (!currentValue) currentValue = stateSubjectGet(this.id).getValue();
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
    currentValue.arrays = [...new Set(currentValue.arrays)];
    return currentValue;
    // stateSubjectGet(this.id).next(currentValue);
  }

  setAvailableAxisRanges(origin, availableAxes, currentValue) {
    if (!currentValue) currentValue = stateSubjectGet(this.id).getValue();
    const ret = structuredClone(availableAxes)
      .map((layer) => layer
        .filter(axisF => axisF.axis)
        .map(axis => { return {
          axis: axis.axis, fTitle: axis.fTitle, fName: axis.fName,
          fXmax: axis.fXmax, fXmin: axis.fXmin, fXbot: axis.fXmin,
          fXtop: axis.fXmax, fNbins: axis.fNbins,
        };})
      );

    currentValue.axisRanges = computeRenderRangeIterator(origin, ret);
    this.pointer.axisRanges = currentValue.axisRanges;
    return currentValue;
  }

  _handleErrorCrossConfig(ec) {
    if (ec.enabled === true && !this.errorCross) {
      this.errorCross = new ErrorCrossClass(this.config, this.id);
      if (this.mesh.parent) this.mesh.parent.add(this.errorCross.lines);
    }

    if (!this.errorCross) return;

    if (ec.color !== undefined) this.errorCross.setColor(ec.color);

    if (ec.enabled === false) {
      // Hide without disposing — geometry stays on GPU for instant re-show
      this.errorCross.config.enabled = false;
      this.errorCross.setVisible(false);
      this.mesh.material.colorWrite = true;
      this.mesh.material.depthWrite = true;
    }

    if (ec.enabled === true) {
      this.errorCross.config.enabled = true;
      this.errorCross.setVisible(true);
      // Hide cubes visually but keep mesh in scene so raycasting (hover) still works
      this.mesh.material.colorWrite = false;
      this.mesh.material.depthWrite = false;
      // If geometry was never built, build it now
      if (this.errorCross.instGeom && this.errorCross.instGeom.instanceCount === 0) {
        let ecCount = 0;
        for (let i = 0; i < this.matrixCache.length; i++) {
          const layer = this.matrixCache[i];
          if (Array.isArray(layer)) {
            for (let k = 0; k < layer.length; k++) {
              for (let j = 0; j < layer[k].rendered.length; j++) {
                if (layer[k].rendered[j] !== -1) ecCount++;
              }
            }
          } else {
            for (let j = 0; j < layer.rendered.length; j++) {
              if (layer.rendered[j] !== -1) ecCount++;
            }
          }
        }
        this.errorCross.pushVisibleInstances(
          this.pointer.origin,
          this.matrixCache,
          this.maxInstancesPerLayer,
          this.availableSets.indexOf(this.selectedSet[0]),
          this.limits.scale,
          ecCount
        );
      }
    }
  }

  configSubjectHandler(event) {
    this.config = configSubjectGet().mergeHistogramConfig(this?.opts?.config);
    this.keyBindings = ensureDefaultBindings(event.config).bindings;

    if (event?.config?.histogram?.errorCross) {
      this._handleErrorCrossConfig(event.config.histogram.errorCross);
    }

    const newLimits = event.config.environment.histogramPads.find(
      (el) => el.id === this.id
    );
    if (newLimits) {
      if (!areLimitsEqual(this.limits, newLimits) && this.renderHistory.length > 0) {
        this.limits = {...newLimits};
        // this.renderHistogramHistory();
      }
    }
    this.limits = {...newLimits};
    if (this.wireframe) this.wireframe.updateConfig(this.config.wireframe);
    this.renderHistogramHistory();
  }

  /**
   * @desc Key down handler for nested histogram.
   * Creates functionality where user can render each layer at once.
   * @param event Defines incoming event which will be put against regex.
   * */
  keyDownHandler(event) {
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

  keyUpHandler(event) {
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

  logRender(obj) {
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

  getBinContent(obj, posX, posY, posZ, selectedArray) {
    if (selectedArray === "content" || !obj.fArrays) {
      return obj.getBinContent(posX + 1, posY + 1, posZ + 1);
    } else {
      const index = obj.getBin(posX + 1, posY + 1, posZ + 1);
      return obj.fArrays?.[selectedArray].values[index];
    }
  }

  getBinError(obj, posX, posY, posZ, selectedArray) {
    const index = obj.getBin(posX + 1, posY + 1, posZ + 1);
    if (selectedArray === "content" || !obj.fArrays) {
      if (obj.fSumw2.length !== 0) {
        return obj.fSumw2[index];
      }
      return obj.getBinError(index);
    } else {
      return obj.fArrays?.[selectedArray].errors[index];
    }
  }

  checkIntersectionBVH(ray) {
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
            ? Array.isArray(this.BVHTree[layer][this.availableSets.indexOf(set)])
              ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
              : this.BVHTree[layer][this.availableSets.indexOf(set)]
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
        if (Array.isArray(layerData)) {
          this.selectedSet.forEach(selSet => {
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
        ? Array.isArray(this.BVHTree[layer][this.availableSets.indexOf(set)])
          ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
          : this.BVHTree[layer][this.availableSets.indexOf(set)]
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
        ? Array.isArray(this.BVHTree[layer][this.availableSets.indexOf(set)])
          ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
          : this.BVHTree[layer][this.availableSets.indexOf(set)]
        : this.BVHTree[layer][offset];

      if (!internalNode || internalNode.length === 0) return output;

      traverse({
        index: internalNode.left.length - 1,
        target: null,
        distance: null,
      });

      return output;
    };

    const recursiveSearch = (
      node, layer, offset = 0, path = [], set = null) => {
      const result = [];
      const perInstance = this.maxInstancesPerLayer[layer + 1];
      const indexOffset =
        this.maxInstancesPerLayer[layer] * this.maxInstancesPerLayer[layer + 1];
      const fArrayValuesAvailable = node.fArrays
        ? node.fArrays[Object.keys(node.fArrays)[0]].values
        : false;

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
        const fullPath = [...path, {x: posX, y: posY, z: posZ}];

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
              r = r.map((res) => ({...res, set: setX}));
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
                selectedArray: this.selectedArray,
                instanceId: computeIndexFromPosition(
                  fullPath, this.pointer.origin,
                  this.maxInstancesPerLayer, this.selectedSet),
                jsrootInstance: computeJsRootIndexFromPosition(
                  fullPath, this.pointer.origin, this.selectedSet),
                range: getRangeByPosition(
                  fullPath, set, this.pointer.origin, this.wireframe, this.selectedSet),
                origin: this,
                jsrootObj: node,
                content: this.getBinContent(
                  node, posX, posY, posZ, fArrayValuesAvailable ? this.selectedArray : "content"
                ),
                error: this.getBinError(
                  node, posX, posY, posZ, fArrayValuesAvailable ? this.selectedArray : "content"
                ),
              });
          }
        } else {
          result.push({
            index: fullPath,
            target: intersect.target,
            distance: intersect.distance,
            set: set,
            selectedArray: this.selectedArray,
            instanceId: computeIndexFromPosition(
              fullPath, this.pointer.origin,
              this.maxInstancesPerLayer, this.selectedSet),
            jsrootInstance: computeJsRootIndexFromPosition(
              fullPath, this.pointer.origin, this.selectedSet),
            range: getRangeByPosition(
              fullPath, set, this.pointer.origin, this.wireframe, this.selectedSet),
            origin: this,
            object: this.mesh,
            jsrootObj: node,
            content: this.getBinContent(
              node, posX, posY, posZ, fArrayValuesAvailable ? this.selectedArray : "content"
            ),
            error: this.getBinError(
              node, posX, posY, posZ, fArrayValuesAvailable ? this.selectedArray : "content"
            ),
          });
        }
      });
      return result.sort((a, b) => {
        return a.distance - b.distance;
      });
    };

    if (this.pointer.isOnSet === null) {
      return recursiveSearch(this.pointer.origin, 0, 0, [], this.pointer.isOnSet);
    } else {
      const results = this.selectedSet.map(set => {
        return recursiveSearch(getChildObjectByIndex(
          this.pointer.rootObj, this.pointer.parentPath.map(v => v.bin[0]), set),
        0, 0, [], set);
      }).filter(v => v.length !==0);
      const distanceMin = Math.min(...results.map(v => v[0].distance));
      return results.find(v => v[0].distance === distanceMin) ?? [];
    }
  }

  dispatchSubjectHandler(event) {
    if (!event.event.jsrootInstance) {
      const pos = event.event.index.map(v => {
        return {x: v.x - 1, y: v.y - 1, z: v.z - 1};
      });

      const node = this.pointer.getChildByPosition(
        computeJsRootIndexFromPosition([...pos]).slice(0, -1),
        event.event.set, this.selectedSet
      );
      event.event = {
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
          node.fArrays[Object.keys(node.fArrays)[0]].values ? this.selectedArray : "content"
        ),
        error: node.getBinError(pos[0].x + 1, pos[0].y + 1, pos[0].z + 1)
      };
    }

    this.intersectionHandler(event.event, event.event.source);
  }
}