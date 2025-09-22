import RadixCounter from "../utils/radixCounter.js";
import {
  computeAFrameBinSizePos,
  createBVHTree,
  createBVHTreeRecursive,
  flipLocalZAxis,
  rootSizePosToAFrame,
} from "../utils/histogramRenderUtils.js";
import { HistogramPointerClass } from "../core/histogram-pointer-class.js";
import { functionSubjectGet } from "../rxjs/FunctionSubject.js";
import { filter } from "rxjs";
import { stateSubjectGet } from "../rxjs/StateSubject.js";
import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";
import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { binInfoSubjectGet } from "../rxjs/BinInfoSubject.js";
import HistogramWireframeClass from "./histogram-wireframe-class.js";

export class NestedHistogram {
  bin_padding_x;
  bin_padding_y;
  bin_padding_z;
  id = undefined;
  sub = undefined;
  stateSub = undefined;
  configSub = undefined;
  rootObj = undefined;
  pointer = undefined;
  instancedMesh = undefined;
  wireframe = undefined;
  BVHTree = [];
  maxInstancesPerLayer = undefined;
  maxContentPerLayer = undefined;
  totalInstances = undefined;
  color = new THREE.Color();
  matrixCache = undefined;
  selectedSet = ["unlikepm"];
  selectedArray = "content";
  availableSets = [];
  renderHistory = [];
  mouseEvents = [];
  keydownEvents = [];
  keyupEvents = [];
  dirtyInstance = [];

  // clickEvents = [];
  // mousemoveEvents = [];

  constructor (bin_padding_x, bin_padding_y, bin_padding_z, histo, id) {
    this.bin_padding_x = bin_padding_x;
    this.bin_padding_y = bin_padding_y;
    this.bin_padding_z = bin_padding_z;
    this.rootObj = histo.histogram;
    this.pointer = new HistogramPointerClass(this.rootObj);
    this.id = id;
    // console.log(this.pointer.origin);
    this.setAvailableSets(this.pointer.origin);
    this.setAvailableArrays(this.pointer.origin);

    this.sub = functionSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) =>
            e.target.entity === "nested-histogram" &&
            (e.target.id.includes("*") || e.target.id.includes(this.id)),
        ),
      )
      .subscribe((f) => {
        if (f.flag === "add") {
          this.addEvent(f.event, f.function);
        } else if (f.flag === "remove") {
          this.removeEvent(f.event, f.function);
        }
      });

    this.configSub = configSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) => e.target.id.includes("*") || e.target.id.includes(this.id),
        ),
      )
      .subscribe((v) => {
        this.config = { ...v.config };
        this.config.histogramPads = this.config.histogramPads.find(
          (el) => el.id === this.id,
        );
      });

    this.handleStateChange = this.handleStateChange.bind(this);
    this.stateSub = stateSubjectGet()
      .getObservable()
      .subscribe(this.handleStateChange);

    this.keyDownHandler = this.keyDownHandler.bind(this);
    this.keyUpHandler = this.keyUpHandler.bind(this);
    this.raycastHandler = this.raycastHandler.bind(this);
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keydown", this.keyUpHandler);

    this.init();
    this.renderHistogram(0, this.totalInstances, 0);
  }

  updateHistogram (histo) {
    this.rootObj = histo.histogram;
    this.pointer = new HistogramPointerClass(this.rootObj);
    this.setAvailableSets(this.pointer.origin);
    this.setAvailableArrays(this.pointer.origin);
    const parent = this.wireframe.wireframe.parent;
    this.wireframe.dispose();
    this.init();
    this.renderHistogram(0, this.totalInstances, 0);
    parent.add(this.wireframe.wireframe);
  }

  remove () {
    this.matrixCache = [];
    this.instancedMesh.dispose();
    this.instancedMesh.parent.remove(this.instancedMesh);
    this.wireframe.dispose();
    this.sub.unsubscribe();
    this.stateSub.unsubscribe();
    this.configSub.unsubscribe();
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keydown", this.keyUpHandler);
  }

  /**
   * @desc Initializes base values and objects.
   * */
  init () {
    this.maxInstancesPerLayer = this.computeMaxInstancesPerLayer();
    this.maxContentPerLayer = this.computeMaxContentPerLayer();
    this.minContentPerLayer = this.computeMinContentPerLayer();
    console.log(this.maxContentPerLayer);
    console.log(this.minContentPerLayer);
    this.totalInstances = this.maxInstancesPerLayer.reduce((acc, value) => {
      return acc * value;
    }, 1);

    this.setupInstancedMesh();
    if (this.wireframe && this.wireframe.wireframe.parent) {
      const parent = this.wireframe.wireframe.parent;
      // console.log(parent);
      parent.remove(this.wireframe);
      this.wireframe = new HistogramWireframeClass(
        this.maxInstancesPerLayer,
        this.matrixCache,
      );
      parent.add(this.wireframe.wireframe);
    } else {
      this.wireframe = new HistogramWireframeClass(
        this.maxInstancesPerLayer,
        this.matrixCache,
      );
    }
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
    this.currentLayer = layer;
    // this.logRender(startIndex, endIndex, layer, 'render');
    this.logRender({
      procedure: "render",
      value: {
        startIndex: startIndex,
        endIndex: endIndex,
        layer: layer,
      },
    });
    // console.log(layer)

    const dummy = new THREE.Object3D();

    const render = (startIndex, endIndex, currentLayer, obj, limits, set) => {
      // if (currentLayer === 1 && startIndex === 0) {
      //    console.log('start: ', startIndex, ', end: ', endIndex, ', limits: ', limits);
      // }
      // console.log(startIndex, endIndex, currentLayer, layer)
      if (currentLayer > layer) return;
      if (!obj) return;

      // canvasSubjectGet().next({
      //     id: this.id + '-cinema',
      //     obj: obj
      // });

      const fXbins = obj.fXaxis.fNbins;
      const fYbins = obj.fYaxis.fNbins;
      const fZbins = obj.fZaxis.fNbins;

      const counter = new RadixCounter([fXbins, fYbins, fZbins]);
      // const contentMax = Math.max(...this.filterOutsideContent(obj));
      let contentMin;
      let contentMax;
      let contentMinOut;
      let contentMaxOut;
      console.log(this.maxContentPerLayer, set);

      const outside = obj.fArrays?.[this.selectedArray]?.outside ?? false;
      if (this.config.sets.scale.maximum === "relative") {
        // contentMax = this.selectedArray === 'content'
        //   ? Math.max(...obj.fArray)
        //   : Math.max(...obj.fArrays[this.selectedArray]);

        // Get the configuration for the currently selected array, if it exists
        const selectedArrayConfig = obj.fArrays?.[this.selectedArray];

        // If fArrays or the selected array config is missing,
        // use the min/max from obj.fArray (assuming this is always present when needed)
        if (!selectedArrayConfig) {
          // contentMin = Math.min(...obj.fArray);
          // contentMax = Math.max(...obj.fArray);
          // remove 0 from obj.fArray
          const valuesWithoutZero = obj.fArray.filter((v) => v !== 0);
          contentMin = Math.min(...valuesWithoutZero);
          contentMax = Math.max(...valuesWithoutZero);
        } else {
          // If selectedArrayConfig exists, use its 'min' or 'max' properties if available,
          // otherwise calculate from its 'values' array.

          // remove 0 from selectedArrayConfig.values
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

      console.log(
        `min: ${contentMin} max: ${contentMax} minOut: ${contentMinOut} maxOut: ${contentMaxOut}`,
      );
      // console.log(contentMax);
      // console.log(contentMin);

      // if (set) {
      //   if (this.config.sets.scale.maximum === "layer") {
      //     contentMax = this.maxContentPerLayer[currentLayer].content ?
      //       this.maxContentPerLayer[currentLayer].content :
      //       this.maxContentPerLayer[currentLayer][set];
      //   } else if (this.config.sets.scale.maximum === "relative") {
      //     contentMax = Math.max(...this.filterOutsideContent(obj));
      //   }
      // } else {
      //   // contentMax = this.maxContentPerLayer[currentLayer].content;
      //   contentMax = this.maxContentPerLayer[currentLayer].content ?
      //     this.maxContentPerLayer[currentLayer].content :
      //     this.maxContentPerLayer[currentLayer][set];
      // }
      const isTH3 = obj._typename.substring(0, 3) === "TH3";
      const isTH2 = obj._typename.substring(0, 3) === "TH2";
      const isTH1 = obj._typename.substring(0, 3) === "TH1";
      const stepFor = this.maxInstancesPerLayer
        .slice(currentLayer + 1)
        .reduce((acc, value) => {
          return acc * value;
        }, 1);
      counter.setFromNumber(startIndex / stepFor);
      console.log(startIndex, endIndex, stepFor);

      const sourcePadding =
        this.config.padding.layer[currentLayer] ?? this.config.padding.default;

      let padding =
        !this.config.padding.layer[currentLayer] && isTH1
          ? { x: sourcePadding.x, y: sourcePadding.y, z: sourcePadding.z }
          : { ...sourcePadding };

      if (set && this.config.padding.sets && isTH1) {
        padding = { x: this.config.padding.sets.x, y: 0, z: 0 };
      }

      const { min: minFactor, max: maxFactor } = this.config.scale?.[currentLayer]
        ? this.config.scale?.[currentLayer]
        : this.config.scale.default;

      // let outside = false;
      // if (this.selectedArray !== 'content' && obj.fArrays?.[this.selectedArray]) {
      //   outside = obj.fArrays?.[this.selectedArray]?.outside;
      // }

      // const padding = (!this.config.padding.layer[currentLayer] && isTH1)
      //   ? {x: 0, y: sourcePadding.y, z: sourcePadding.z}
      //   : {...sourcePadding};

      for (let i = startIndex; i < endIndex; i += stepFor) {
        const relPos = {
          x: counter.getValueAt(0),
          y: counter.getValueAt(1),
          z: counter.getValueAt(2),
        };
        let binSizePos = computeAFrameBinSizePos(
          obj,
          relPos,
          padding,
          limits?.scale,
          limits?.position,
          currentLayer,
        );

        if (currentLayer === 0) {
          // console.log('prvy');
          binSizePos = this.flipLocalZAxis(
            limits.position.z,
            limits.scale.z,
            rootSizePosToAFrame(binSizePos),
          );
          // binSizePos = rootSizePosToAFrame(binSizePos);
          // console.log(binSizePos)
        } else {
          // console.log('druhy');
          binSizePos = this.flipLocalZAxis(
            limits.position.z,
            limits.scale.z,
            rootSizePosToAFrame(binSizePos),
          );
          // binSizePos = rootSizePosToAFrame(binSizePos);
          // console.log('pred: ', binSizePos)
          // console.log('po: ', this.flipLocalZAxis(limits.position.z, limits.scale.z, binSizePos))
          // binSizePos.z.pos = -binSizePos.z.pos;
        }

        //TODO ASI TREBA FlipLocalZAxis (zatial netreba ak je len 1D)

        //-------------ODTADIAL---------
        const content = this.getBinContent(
          obj,
          relPos.x,
          relPos.y,
          relPos.z,
          this.selectedArray,
        );
        // const content = obj.getBinContent(relPos.x + 1, relPos.y + 1, relPos.z + 1);

        // console.log('min: ', minFactor, ', max: ', maxFactor);

        let scaleFactor = 1;
        if ((content >= contentMin && content <= contentMax) === !outside) {
          const contentPer = (content - contentMin) / (contentMax - contentMin);
          // console.log('content: ', content, 'contentMax: ', contentMax, ', contentMin: ', contentMin);
          //
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

        // let norm = 0;
        // if (contentMax !== contentMin) {
        //   norm = (content - contentMin) / (contentMax - contentMin);
        //   norm = Math.max(0, Math.min(1, norm));
        // } else {
        //   norm = 1;
        // }
        //
        // if (isTH3) {
        //   scaleFactor = norm === 0
        //     ? 0
        //     : minFactor + norm * (maxFactor - minFactor);
        // } else {
        //   scaleFactor = norm === 0 ? 0 : norm;
        // }
        //
        // if (currentLayer === 0) {
        //   scaleFactor = norm;
        //   // scaleFactor = 0.2 + 0.8 * this.easeOutCubic(norm);
        // } else {
        //   scaleFactor = norm;
        // }

        // let scaleFactor = 1;
        // if (isTH3) {
        //   scaleFactor = content === 0
        //     ? 0
        //     : minFactor + (content / contentMax) * (maxFactor - minFactor);
        // } else {
        //   scaleFactor = content === 0
        //     ? 0
        //     : scaleFactor = content / contentMax;
        // }
        // if (currentLayer === 0) {
        //   scaleFactor = content / contentMax;
        //   // scaleFactor = 0.2 + 0.8 * this.easeOutCubic(content / contentMax);
        // } else {
        //   scaleFactor = content / contentMax;
        // }

        // console.log(scaleFactor)

        this.color = this.getGradientColor(
          content,
          0,
          contentMax,
          set,
          currentLayer,
        );

        const t = binSizePos.y.size * scaleFactor;

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

        if (!set) {
          this.matrixCache[currentLayer][i / stepFor] = {
            position: new THREE.Vector3(
              binSizePos.x.pos,
              binSizePos.y.pos,
              binSizePos.z.pos,
            ),
            scale: new THREE.Vector3(
              binSizePos.x.size,
              binSizePos.y.size,
              binSizePos.z.size,
            ),
            rendered: currentLayer === layer,
          };
        } else {
          binSizePos.z.size = 0.01;
          const index = this.selectedSet.indexOf(set);
          binSizePos.z.pos += index * 0.01;
          this.matrixCache[currentLayer][this.availableSets.indexOf(set)][
          i / stepFor
            ] = {
            position: new THREE.Vector3(
              binSizePos.x.pos,
              binSizePos.y.pos,
              binSizePos.z.pos,
            ),
            scale: new THREE.Vector3(
              binSizePos.x.size,
              binSizePos.y.size,
              binSizePos.z.size,
            ),
            rendered: currentLayer === layer,
          };
        }

        dummy.position.set(
          binSizePos.x.pos,
          binSizePos.y.pos,
          binSizePos.z.pos,
        );
        dummy.scale.set(
          binSizePos.x.size,
          binSizePos.y.size,
          binSizePos.z.size,
        );
        dummy.updateMatrix();

        if (currentLayer === layer) {
          let ind = i;
          if (set) {
            ind += this.totalInstances * this.selectedSet.indexOf(set);
          }
          this.instancedMesh.setMatrixAt(ind, dummy.matrix);
          this.instancedMesh.setColorAt(ind, this.color);
        } else {
          const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1);
          let child = undefined;
          if (obj.children.content) {
            child = obj.children.content[index];
            render(
              i,
              endIndex,
              currentLayer + 1,
              child,
              this.matrixCache[currentLayer][i / stepFor],
            );
          } else {
            this.selectedSet.forEach((set) => {
              child = obj.children[set][index];
              render(
                i,
                endIndex,
                currentLayer + 1,
                child,
                this.matrixCache[currentLayer][i / stepFor],
                set,
              );
            });
          }
        }

        //---------POTADIAL------------
        if (!counter.increment(0)) break;
      }
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMesh.instanceColor.needsUpdate = true;
    };
    // console.log(this.config.histogramPads)

    render(
      startIndex,
      endIndex,
      0,
      this.pointer.origin,
      this.config.histogramPads,
    );
    const selectedSetIndexes = this.selectedSet.map((item) =>
      this.availableSets.indexOf(item),
    );
    this.wireframe.render(
      this.matrixCache,
      0,
      layer + 1,
      startIndex,
      endIndex,
      selectedSetIndexes,
    );
    // this.BVHTree = createBVHTree(this.matrixCache, this.pointer.origin, 0, null, this.instancedMesh.matrixWorld);
    this.BVHTree = createBVHTreeRecursive(
      this.matrixCache,
      this.pointer.origin,
      0,
      this.selectedSet,
      this.availableSets,
      this.instancedMesh.matrixWorld,
      this.maxInstancesPerLayer,
    );
    // this.BVHTree = Array.of(this.BVHTree);
    this.instancedMesh.computeBoundingBox();
  }

  /**
   * @desc This method sets up base for instanced mesh, which will be rendered.
   * Precisely, geometry, material, count and ray-cast interaction are being set.
   * */
  setupInstancedMesh () {
    let parent = undefined;
    if (this.instancedMesh) {
      parent = this.instancedMesh.parent;
      this.instancedMesh.parent.remove(this.instancedMesh);
      this.instancedMesh.dispose();
    }

    this.matrixCache = new Array(this.maxInstancesPerLayer.length - 1)
      .fill()
      .map(() => []);
    this.matrixCache[this.matrixCache.length - 1] = Array.from(
      { length: this.availableSets.length },
      () => [],
    );

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
    let totalInst = this.maxInstancesPerLayer.reduce((acc, value) => {
      return acc * value;
    }, 1);

    if (this.selectedSet.length > 1) {
      totalInst *= this.selectedSet.length;
    }

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, totalInst);
    const dummy = new THREE.Object3D();
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < totalInst; i++) {
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.raycast = this.raycastHandler;

    if (parent) {
      parent.add(this.instancedMesh);
    }
  }

  mergeInfo (event, node = this.pointer.origin, layer = 0) {
    const ind = event.index.splice(0, 1)[0];
    if (!ind) return event;
    const axes = ["x", "y", "z"];

    const numOfDimensions = Number.parseInt(node._typename.substring(2, 3));
    const val = [];
    for (let i = 0; i < numOfDimensions; i++) {
      const axis = event.range[layer][axes[i]];
      const bin = ind[axes[i]] + 1;
      val.push({ ...axis, bin });
      // val.push({...coords[i]})
    }
    val.push({ color: this.wireframe.getColorAt(layer, event.set) });
    // console.log("val", val);
    event.range[layer] = val;
    if (node.children && event.index.length > 0) {
      // console.log("AAAAAAAAAAAA", node.children, event.set);
      // const child = node.children[event.set][event.jsrootInstance[layer]];
      const child =
        node.children?.content || event.set === "content"
          ? node.children.content[event.jsrootInstance[layer]]
          : node.children[event.set][event.jsrootInstance[layer]];
      return this.mergeInfo(event, child, layer + 1);
    } else {
      return event;
    }
  }

  raycastHandler (raycaster, intersects) {
    const res = this.checkIntersectionBVH(raycaster.ray);
    // if (res2[0]) {
    //     console.log(res2[0].index);
    // }
    //
    // const res = this.checkIntersection(raycaster.ray);
    const intersection = res[0];
    if (intersection) {
      const triggerSource = raycaster._triggerSource;
      this.mouseEvents
        .filter((mouseEvent) => mouseEvent.event === triggerSource)
        .forEach((mouseEvent) => mouseEvent.function(intersection, this));

      const areIndexesEqual = (index1, index2) => {
        if (index1.length !== index2.length) return false;
        for (let i = 0; i < index1.length; i++) {
          const a = index1[i],
            b = index2[i];
          if (a.x !== b.x || a.y !== b.y || a.z !== b.z) return false;
        }
        return true;
      };

      const eventWithSource = { ...intersection, triggerSource };
      // // console.log(eventWithSource)
      if (
        !(
          triggerSource === "mousemove" &&
          areIndexesEqual(intersection.index, this.dirtyInstance)
        )
      ) {
        const merged = this.mergeInfo({
          ...eventWithSource,
          index: [...eventWithSource.index],
        });
        const { range: coords, content, error, set, triggerSource } = merged;
        const minimizedEvent = { coords, content, error, set, triggerSource };
        binInfoSubjectGet().next(minimizedEvent);
      }

      switch (triggerSource) {
        case "mouseclick":
          this.showChildHistogram(intersection.index);
          canvasSubjectGet().next({
            id: this.id + "-cinema",
            obj: intersection.jsrootObj,
          });
          break;
        case "shiftmouseclick":
          this.hideChildHistogram(intersection.index);
          break;
        case "mousedbclick":
          setTimeout(() => {
            intersection.set
              ? this.setPointerToChild(
                this.computeJsRootIndexFromPosition(intersection.index),
                intersection.set,
              )
              : this.setPointerToChild(
                this.computeJsRootIndexFromPosition(intersection.index),
                this.selectedSet[0],
              );
          }, 0);
          break;
        case "shiftmousedbclick":
          this.setPointerToParent();
          break;
        case "mousemove":
          break;
      }
      this.dirtyInstance = intersection.index;

      {
        const arr = Array.isArray(intersection.instanceId)
          ? intersection.instanceId
          : [intersection.instanceId];
        let linearInstanceId = arr[arr.length - 1] ?? 0;
        if (intersection.set && intersection.set !== "content") {
          linearInstanceId +=
            this.totalInstances * this.selectedSet.indexOf(intersection.set);
        }
        intersects.push({
          distance: intersection.distance,
          point: intersection.target,
          object: this.instancedMesh,
          instanceId: linearInstanceId,
        });
      }
    }
  }

  handleStateChange (state) {
    let changed = false;
    if (
      state.selectedSet &&
      !this.areArraysEqual(state.selectedSet, this.selectedSet)
    ) {
      this.selectedSet = state.selectedSet;
      changed = true;

      this.setupInstancedMesh();
      console.log(state);
    }
    if (state.sets && state.sets !== this.availableSets) {
      this.availableSets = state.sets;
    }
    if (state.selectedArray && this.selectedArray !== state.selectedArray) {
      this.selectedArray = state.selectedArray;
      changed = true;
    }

    if (changed) {
      const renderHistoryCopy = this.renderHistory;
      this.renderHistory = [];

      renderHistoryCopy.forEach((call) => {
        if (call.procedure === "render") {
          this.renderHistogram(
            call.value.startIndex,
            call.value.endIndex,
            call.value.layer,
          );
        } else if (call.procedure === "hide") {
          this.hideChildHistogram(call.value);
        }
      });
    }
  }

  /**
   * @desc Adds function that will be called, if specified event is triggered.
   * @param event can be either mouseevent in which only name of event is required (e.g. mousclick, shiftmousedbclick),
   * or keyboard event which has to concise state (keydown or keyup) and keyCode (e.g. Numpad1)
   * @param func Function that is called if event is triggered.
   * */
  addEvent (event, func) {
    if (event?.state === "keydown") {
      this.keydownEvents.push({
        key: event.key,
        function: func,
      });
      console.log("down");
    } else if (event?.state === "keyup") {
      this.keyupEvents.push({
        key: event.key,
        function: func,
      });
    } else {
      this.mouseEvents.push({
        event: event,
        function: func,
      });
    }
  }

  /**
   * @desc Removes function from event listener.
   * @param event Defines from which event should listening be removed.
   * @func Function has to have same reference to one that was added by addEvent.
   * */
  removeEvent (event, func) {
    const index = this.mouseEvents.find((f) => f === func);
    if (index) this.mouseEvents.splice(index, 1);
  }

  /**
   * @desc Computes linear index of bin by position.
   * @param position should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * @return Array in which entries represents linear index of bins for each index.
   * If used with combination from position obtained by ray-cast event,
   * the last entry is always index of visible bin.
   * */
  computeIndexFromPosition (position) {
    let ind = Array(position.length).fill(0);
    const rec = (layer, obj, index) => {
      const fX = obj.fXaxis.fNbins;
      const fY = obj.fYaxis.fNbins;
      const fZ = obj.fZaxis.fNbins;
      // console.log(this.maxInstancesPerLayer)
      const t = this.maxInstancesPerLayer.slice(
        -this.maxInstancesPerLayer.length + layer + 1,
      );
      // console.log(t)
      const multiplier = t.reduce((acc, value) => {
        return acc * value;
      }, 1);
      // console.log(multiplier)
      ind[index] +=
        (position[layer].x +
          position[layer].y * fX +
          position[layer].z * fX * fY) *
        multiplier;
      if (layer + 1 < position.length) {
        let child = undefined;
        if (obj.children.content) {
          child =
            obj.children.content[
              obj.getBin(
                position[layer].x + 1,
                position[layer].y + 1,
                position[layer].z + 1,
              )
              ];
        } else {
          child =
            obj.children[this.selectedSet[0]][
              obj.getBin(
                position[layer].x + 1,
                position[layer].y + 1,
                position[layer].z + 1,
              )
              ];
        }
        if (index > layer) {
          rec(layer + 1, child, index);
        }
      }
    };
    for (let i = 0; i < position.length; i++) {
      rec(0, this.pointer.origin, i);
    }

    return ind;
  }

  /**
   * @desc Computes jsroot (Root specification) index of bin by position.
   * @param position should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * @return Array in which entries represents jsroot index of bins for each index.
   * If used with combination from position obtained by ray-cast event,
   * the last entry is always index of visible bin.
   * */
  computeJsRootIndexFromPosition (position) {
    let ind = Array(position.length).fill(0);
    let t = this.pointer.origin;
    for (let i = 0; i < position.length; i++) {
      ind[i] = t.getBin(
        position[i].x + 1,
        position[i].y + 1,
        position[i].z + 1,
      );
      if (t.children?.content) {
        t = t.children.content[ind[i]];
      } else {
        return ind;
      }
    }
    return ind;
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
    this.wireframe.clearWireframe();
    this.pointer.setOriginToChild(position, set);
    this.init();
    console.log("path: ", this.pointer.path);
    console.log("title: ", this.pointer.title);
    this.renderHistogram(0, this.totalInstances, 0);
  }

  /**
   * @desc Method to set pointers origin to its parent.
   * * */
  setPointerToParent () {
    this.wireframe.clearWireframe();
    this.pointer.setOriginToParent(1);
    console.log("path: ", this.pointer.path);
    console.log("title: ", this.pointer.title);
    this.init();
    this.renderHistogram(0, this.totalInstances, 0);
  }

  /**
   * @desc Method to show (render) histogram that is currently represented by bin.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * */
  showChildHistogram (position) {
    const ind = this.computeIndexFromPosition(position);

    const t = this.maxInstancesPerLayer.slice(
      -this.maxInstancesPerLayer.length + position.length,
    );
    const multiplier = t.reduce((acc, value) => {
      return acc * value;
    }, 1);

    // canvasSubjectGet().next({
    //     id: this.id + '-cinema',
    //     obj: this.getChildByPosition(
    //         this.pointer.origin,
    //         [...position]) //[...] for shallow copy
    // });

    this.renderHistogram(
      ind.slice(-1)[0],
      ind.slice(-1)[0] + multiplier,
      position.length,
    );
  }

  /**
   * Method to get child (jsroot object) by position
   * @warning for @param position only supply shallow copy of value,
   * as if deep copy is supplied, the original is rewritten.
   * @param origin Defines origin from which child set by position is obtained.
   * @param position Defines position specified by jsroot indexing of bins.
   * @param set Defines set from which histogram will be choosen, if possible.
   * Has to be array (can go through more layers at once) where each entry represents children position in layer.
   * */
  getChildByPosition (origin, position, set) {
    const pos = position[0];
    let obj = origin;
    if (pos) {
      const index = origin.getBin(pos.x + 1, pos.y + 1, pos.z + 1);
      if (origin.children?.content) {
        obj = origin.children.content[index];
      } else if (origin.children?.[set]) {
        obj = origin.children[set][index];
      }
      if (origin.children && position[1]) {
        position.splice(0, 1);
        return this.getChildByPosition(obj, position);
      } else {
        return obj;
      }
    } else {
      return origin;
    }
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
    // console.log(this.maxInstancesPerLayer);
    // console.log(cacheLayerDimensions);
    const totalMultiplier = layerDimensions.reduce(
      (acc, value) => acc * value,
      1,
    );
    // console.log(totalMultiplier);

    const startIndex = this.calculateHierarchicalIndex(position);
    console.log(position.length - 1);
    const startIndexFloored =
      Math.floor(startIndex / totalMultiplier) * totalMultiplier;
    console.log(
      startIndexFloored,
      totalMultiplier,
      cacheLayerDimensions,
      position.length - 1,
    );

    this.wireframe.clearSection(
      this.matrixCache,
      startIndexFloored,
      totalMultiplier,
      cacheLayerDimensions,
      position.length - 1,
    );

    this.clearMatrixCacheRange(
      startIndexFloored,
      totalMultiplier,
      cacheLayerDimensions,
      position.length - 1,
    );
    this.hideInstanceRange(startIndexFloored, totalMultiplier);
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
   * Method to obtain range of axes from each layer.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * @param obj Jsroot object from which histogram is computed range of bin.
   * @default Pointers origin.
   * */
  getRangeByPosition (position, obj = this.pointer.origin) {
    const range = {
      x: { min: undefined, max: undefined },
      y: { min: undefined, max: undefined },
      z: { min: undefined, max: undefined },
    };
    if (position[0]) {
      range.x.min = obj.fXaxis.GetBinLowEdge(position[0].x + 1);
      range.x.max =
        obj.fXaxis.GetBinCenter(position[0].x + 1) * 2 -
        obj.fXaxis.GetBinLowEdge(position[0].x + 1);
      range.x.name = obj.fXaxis.fName;
      range.x.title = obj.fXaxis.fTitle;
      range.y.min = obj.fYaxis.GetBinLowEdge(position[0].y + 1);
      range.y.max =
        obj.fYaxis.GetBinCenter(position[0].y + 1) * 2 -
        obj.fYaxis.GetBinLowEdge(position[0].y + 1);
      range.y.title = obj.fYaxis.fTitle;
      range.y.name = obj.fYaxis.fName;
      range.z.min = obj.fZaxis.GetBinLowEdge(position[0].z + 1);
      range.z.max =
        obj.fZaxis.GetBinCenter(position[0].z + 1) * 2 -
        obj.fZaxis.GetBinLowEdge(position[0].z + 1);
      range.z.title = obj.fZaxis.fTitle;
      range.z.name = obj.fZaxis.fName;
    }
    if (position[1]) {
      let child = undefined;
      if (obj.children?.content) {
        child =
          obj.children.content[
            obj.getBin(position[0].x + 1, position[0].y + 1, position[0].z + 1)
            ];
      } else if (obj.children?.[this.selectedSet[0]]) {
        child =
          obj.children[this.selectedSet[0]][
            obj.getBin(position[0].x + 1, position[0].y + 1, position[0].z + 1)
            ];
      }
      return [range, ...this.getRangeByPosition(position.slice(1), child)];
    } else {
      return [range];
    }
  }

  /**
   * @desc Calculates linear index of bin that starts the histogram specified by position.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * @return Linear index of starting bin of the histogram specified by position.
   * * */
  calculateHierarchicalIndex (position) {
    let calculatedIndex = 0;
    const layerSizes = this.maxInstancesPerLayer.slice(1);
    const multipliers = [];

    for (let i = 0; i < layerSizes.length; i++) {
      const multiplier = layerSizes
        .slice(i)
        .reduce((acc, value) => acc * value, 1);
      multipliers.push(multiplier);
    }

    const traverse = (layer, obj) => {
      const { fNbins: fX } = obj.fXaxis;
      const { fNbins: fY } = obj.fYaxis;
      const { fNbins: fZ } = obj.fZaxis;

      const linearIndex =
        position[layer].x +
        position[layer].y * fX +
        position[layer].z * fX * fY;

      calculatedIndex += linearIndex * multipliers[layer];

      if (layer + 1 < position.length) {
        const child = this.getChildObject(obj, position[layer]);
        traverse(layer + 1, child);
      }
    };

    traverse(0, this.pointer.origin);
    return calculatedIndex;
  }

  /**
   * @desc Getter function for child in jsroot histogram object.
   * @param obj Jsroot histogram object
   * @param positionLayer - JS object with position for each axis.
   * e.g. ({x: 0, y: 2, z: 1})
   * @return Jsroot histogram object of children specified by indexLayer from obj.
   * */
  getChildObject (obj, positionLayer) {
    const binIndex = obj.getBin(
      positionLayer.x + 1,
      positionLayer.y + 1,
      positionLayer.z + 1,
    );

    if (obj.children.content) {
      return obj.children.content[binIndex];
    } else {
      return obj.children[this.selectedSet[0]][binIndex];
    }
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

    // console.log(this.matrixCache);

    for (
      let i = baseLayerIndex + dimensions.length - 1;
      i >= baseLayerIndex;
      i--
    ) {
      if (Array.isArray(this.matrixCache[i][0])) {
        console.log(this.matrixCache[i]);
        for (let j = 0; j < this.matrixCache[i].length; j++) {
          this.matrixCache[i][j].fill(
            null,
            currentIndex,
            currentIndex + currentMultiplier,
          );
        }
      } else {
        this.matrixCache[i].fill(
          null,
          currentIndex,
          currentIndex + currentMultiplier,
        );
      }

      if (i > baseLayerIndex) {
        currentIndex /= dimensions[i - baseLayerIndex];
        currentMultiplier /= dimensions[i - baseLayerIndex];
      }
    }
    // console.log(this.matrixCache)
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
      // delete origin.children.content;
      currentValue.sets = Object.keys(origin.children);
      stateSubjectGet().next(currentValue);
    }
  }

  setAvailableArrays (origin) {
    console.log("origin", origin);
    // if (origin.children?.content) {
    //   const firstChild = origin.children.content.find((child) => {
    //     return child
    //   });
    //   this.setAvailableSets(firstChild);
    // } else if (origin?.children) {
    const currentValue = stateSubjectGet().getValue();
    currentValue.arrays = [];
    if (origin.fArrays) currentValue.arrays = Object.keys(origin.fArrays);
    currentValue.arrays.unshift("content");
    stateSubjectGet().next(currentValue);
    // }
  }

  /**
   * @desc Key down handler for nested histogram.
   * Creates functionality where user can render each layer at once.
   * @param event Defines incoming event which will be put against regex.
   * */
  keyDownHandler (event) {
    // console.log(this.keydownEvents);
    const regex = /^(?:Digit|Numpad)(\d+)$/;
    const match = event.code.match(regex);
    if (match) {
      if (parseInt(match[1]) > this.matrixCache.length) return;
      const dummy = new THREE.Object3D();
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();

      let totalInst = this.maxInstancesPerLayer.reduce((acc, value) => {
        return acc * value;
      }, 1);
      if (this.selectedSet.length > 1) {
        totalInst *= this.selectedSet.length;
      }

      for (let i = 0; i < totalInst; i++) {
        this.instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.matrixCache = new Array(this.maxInstancesPerLayer.length - 1)
        .fill()
        .map(() => []);
      this.matrixCache[this.matrixCache.length - 1] = Array.from(
        { length: this.availableSets.length },
        () => [],
      );
      this.wireframe.clearWireframe();

      this.renderHistogram(0, this.totalInstances, parseInt(match[1]) - 1);
    } else if (event.key === "h") {
      const selectedSetIndexes = this.selectedSet.map((item) =>
        this.availableSets.indexOf(item),
      );
      this.wireframe.toggleVisibility(
        this.matrixCache,
        0,
        this.matrixCache.length - 1,
        0,
        this.totalInstances,
        selectedSetIndexes,
      );
    }
  }

  keyUpHandler (event) {
    // console.log(event);
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

  /**
   * @desc Hides rendered bins by transforming instanced mesh.
   * @param startIndex Linear index of instance from hiding will start.
   * @param count Number of instances to be hidden.
   * */
  hideInstanceRange (startIndex, count) {
    const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let i = startIndex; i < startIndex + count; i++) {
      this.instancedMesh.setMatrixAt(i, hiddenMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * @desc Method to check bins intersection against ray.
   * Can be used to define instanced mesh intersection behaviour
   * and override basic (traverse all instances) behaviour.
   * Performs much better especially if number of instances are enormous.
   * @param ray Instance of Three.Ray part of Three.Raycaster.
   * @return Array of intersected bins,
   * including their position, instanceId, Jsroot index and other infos.
   * */
  checkIntersection (ray) {
    // console.log('inter');
    const target = new THREE.Vector3();

    const createBox3 = (layer, index, set) => {
      const t =
        set && set !== "content"
          ? this.matrixCache[layer]?.[this.availableSets.indexOf(set)]?.[index]
          : this.matrixCache[layer]?.[index];

      // console.log(t ? new THREE.Box3().setFromCenterAndSize(t.position, t.scale) : undefined)
      return t
        ? new THREE.Box3().setFromCenterAndSize(t.position, t.scale)
        : undefined;
    };

    const checkAxis = (step, startIndex, endIndex, offset, layer, set) => {
      const half = Math.floor((startIndex + endIndex) / 2);
      const pointMin = createBox3(layer, startIndex * step + offset, set);
      const pointHalfBelow = createBox3(
        layer,
        (half + 1) * step - 1 + offset,
        set,
      );
      const pointHalfUpper = createBox3(layer, (half + 1) * step + offset, set);
      const pointMax = createBox3(
        layer,
        (endIndex + 1) * step - 1 + offset,
        set,
      );

      pointMin.applyMatrix4(this.instancedMesh.matrixWorld);
      pointHalfBelow.applyMatrix4(this.instancedMesh.matrixWorld);
      pointHalfUpper.applyMatrix4(this.instancedMesh.matrixWorld);
      pointMax.applyMatrix4(this.instancedMesh.matrixWorld);

      const boundaryFirstHalf = new THREE.Box3()
        .copy(pointMin)
        .union(pointHalfBelow);
      const boundarySecondHalf = new THREE.Box3()
        .copy(pointHalfUpper)
        .union(pointMax);

      // if (layer === 0) {      DEBUG
      //    const helper = new THREE.Box3Helper(boundaryFirstHalf, new THREE.Color(0, 1, 0));
      //    helper.raycast = () => {};
      //    this.el.object3D.add(helper);
      // }

      // console.log('prvy', startIndex, ', half: ', half, ', ')
      // console.log('druhy', half + 1, ', end: ', endIndex)

      const resultList = [];
      if (ray.intersectBox(boundaryFirstHalf, target)) {
        resultList.push({
          array: [startIndex, half],
          target: target.clone(),
          distance: ray.origin.distanceTo(target),
        });
      } else {
        resultList.push(null);
      }
      if (ray.intersectBox(boundarySecondHalf, target)) {
        resultList.push({
          array: [half + 1, endIndex],
          target: target.clone(),
          distance: ray.origin.distanceTo(target),
        });
      } else {
        resultList.push(null);
      }
      return resultList;
    };

    const dfs = (step, start, end, offset, layer, set) => {
      const output = [];
      const traverse = (details) => {
        // console.log(details)
        if (details.array[0] === details.array[1]) {
          output.push(details);
          return;
        }
        const [firstHalf, secondHalf] = checkAxis(
          step,
          details.array[0],
          details.array[1],
          offset,
          layer,
          set,
        );
        if (firstHalf) traverse(firstHalf);
        if (secondHalf) traverse(secondHalf);
      };
      traverse({ array: [start, end], target: null, distance: null });
      if (output[output.length - 1] === end + 1) output.pop(); // edge fix
      return output;
    };

    const recursiveSearch = (
      node,
      layer,
      offset = 0,
      path = [],
      set = undefined,
    ) => {
      // console.log(layer, node, offset)

      const fX = node.fXaxis.fNbins;
      const fY = node.fYaxis.fNbins;
      const fZ = node.fZaxis.fNbins;
      const perInstance = this.maxInstancesPerLayer[layer + 1];

      const stepZ = fX * fY;
      const stepY = stepZ / fY;
      const stepX = stepY / fX;

      const validZ = dfs(stepZ, 0, fZ - 1, offset, layer, set);

      const result = [];

      validZ.forEach((z) => {
        const zIndex = z.array[0];
        const offsetZ = offset + zIndex * stepZ;
        const validY = dfs(stepY, 0, fY - 1, offsetZ, layer, set);
        validY.forEach((y) => {
          const yIndex = y.array[0];
          const offsetY = offsetZ + yIndex * stepY;

          const validX = dfs(stepX, 0, fX - 1, offsetY, layer, set);

          validX.forEach((x) => {
            const xIndex = x.array[0];
            const fullPath = [...path, { x: xIndex, y: yIndex, z: zIndex }];
            const binIndex = node.getBin(xIndex + 1, yIndex + 1, zIndex + 1);

            //if node has children
            if (node.children) {
              const children = Object.entries(node.children);

              //loop through children, store result for each
              const childResults = children.flatMap(([setX, childX]) => {
                //get child jsroot node
                const child = childX?.[binIndex];
                if (!child) return [];

                //calculate child index of instance in matrixCache
                const childOffset =
                  offset * perInstance +
                  (xIndex + yIndex * fX + zIndex * (fX * fY)) * perInstance;

                //get instance from matrixCache with actually looping set
                const next =
                  setX === "content"
                    ? this.matrixCache?.[layer + 1]?.[childOffset]
                    : this.matrixCache[layer + 1][
                      this.availableSets.indexOf(setX)
                      ][childOffset];

                //!next return, child was not yet rendered
                if (!next) return [];
                // if (layer === 1) {
                //     console.log('DVOJKA')
                // }
                //child was rendered, return the return value from next layer search
                let r = recursiveSearch(
                  child,
                  layer + 1,
                  childOffset,
                  fullPath,
                  setX,
                );

                if (setX !== "content") {
                  r = r.map((res) => ({ ...res, set: setX }));
                }
                return r;
              });

              //if any child has returned result, its valid
              if (childResults.length > 0) {
                result.push(...childResults);
              } else {
                //no child returned result, if flag rendered is true, it is the last layer rendered
                //thus valid intersection
                const childOffset =
                  offset + (xIndex + yIndex * fX + zIndex * (fX * fY));
                const instance =
                  set && set !== "content"
                    ? this.matrixCache[layer]?.[
                      this.availableSets.indexOf(set)
                      ]?.[childOffset]
                    : this.matrixCache[layer]?.[childOffset];
                if (instance.rendered)
                  result.push({
                    index: fullPath,
                    target: x.target.clone(),
                    distance: x.distance,
                    set: set,
                    instanceId: this.computeIndexFromPosition(fullPath),
                    jsrootInstance:
                      this.computeJsRootIndexFromPosition(fullPath),
                    range: this.getRangeByPosition(fullPath),
                    origin: this,
                    jsrootObj: node,
                    content: node.getBinContent(
                      xIndex + 1,
                      yIndex + 1,
                      zIndex + 1,
                      this.selectedArray,
                    ),
                    error: node.getBinError(xIndex + 1, yIndex + 1, zIndex + 1),
                  });
              }
            } else {
              result.push({
                index: fullPath,
                target: x.target.clone(),
                distance: x.distance,
                set: undefined,
                instanceId: this.computeIndexFromPosition(fullPath),
                jsrootInstance: this.computeJsRootIndexFromPosition(fullPath),
                range: this.getRangeByPosition(fullPath),
                origin: this,
                jsrootObj: node,
                content: node.getBinContent(
                  xIndex + 1,
                  yIndex + 1,
                  zIndex + 1,
                  this.selectedArray,
                ),
                error: node.getBinError(xIndex + 1, yIndex + 1, zIndex + 1),
              });
            }
          });
        });
      });

      return result.sort((a, b) => {
        return a.distance - b.distance;
      });
    };

    return recursiveSearch(this.pointer.origin, 0);
  }

  checkIntersectionBVH (ray) {
    const target = new THREE.Vector3();

    const createBox3 = (layer, index, offset, set) => {
      if (index < 0 || 1 / index === -Infinity) {
        //matrixCache leaf node
        const t =
          set && set !== "content"
            ? this.matrixCache[layer]?.[this.availableSets.indexOf(set)]?.[
              Math.abs(index)
              ]
            : this.matrixCache[layer]?.[Math.abs(index)];
        return t
          ? new THREE.Box3().setFromCenterAndSize(t.position, t.scale)
          : undefined;
      } else {
        const t =
          set && set !== "content"
            ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset][
              index
              ]
            : this.BVHTree[layer][offset][index];
        return t
          ? new THREE.Box3().setFromCenterAndSize(t.position, t.scale)
          : undefined;
      }
    };

    const checkAxis = (index, offset, layer, set) => {
      // if (layer === 3) {
      //     console.log('break')
      // }
      const parent =
        set && set !== "content"
          ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset][index]
          : this.BVHTree[layer][offset][index];
      const boundaryFirstHalf = createBox3(layer, parent.left, offset, set);
      const boundarySecondHalf = createBox3(layer, parent.right, offset, set);

      // console.log('prvy', startIndex, ', half: ', half, ', ')
      // console.log('druhy', half + 1, ', end: ', endIndex)

      const resultList = [];
      if (ray.intersectBox(boundaryFirstHalf, target)) {
        resultList.push({
          index: parent.left,
          target: target.clone(),
          distance: ray.origin.distanceTo(target),
        });
      } else {
        resultList.push(null);
      }
      if (ray.intersectBox(boundarySecondHalf, target)) {
        resultList.push({
          index: parent.right,
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
          details.index,
          offset,
          layer,
          set,
        );
        if (firstHalf) traverse(firstHalf);
        if (secondHalf) traverse(secondHalf);
      };
      // console.log(this.BVHTree)
      // console.log({index: this.BVHTree[layer].length - 1, target: null, distance: null})
      const internalNode =
        set && set !== "content"
          ? this.BVHTree[layer][this.availableSets.indexOf(set)][offset]
          : this.BVHTree[layer][offset];

      if (!internalNode) return output;

      traverse({
        index: internalNode.length - 1,
        target: null,
        distance: null,
      });

      // if (output[output.length - 1] === end + 1) output.pop(); // edge fix
      return output;
    };

    const recursiveSearch = (
      node,
      layer,
      offset = 0,
      path = [],
      set = undefined,
    ) => {
      // if (layer === 3) {
      //     console.log('node: ', node, ', layer: ', layer, ', offset: ', offset, 'path: ', path, ', set: ', set)
      // }
      const result = [];
      const perInstance = this.maxInstancesPerLayer[layer + 1];
      // const indexOffset = this.maxInstancesPerLayer.slice(1, layer + 1)
      //   .reduce((acc, value) => {
      //     return acc * value
      //   }, this.maxInstancesPerLayer[1])
      const indexOffset =
        this.maxInstancesPerLayer[layer] * this.maxInstancesPerLayer[layer + 1];

      dfs(layer, offset, set).forEach((intersect) => {
        // if (layer === 1) {
        //   console.log('intersect: ', intersect)
        // }
        const indexNormalized =
          Math.abs(intersect.index) - offset * this.maxInstancesPerLayer[layer];
        const posX = indexNormalized % node.fXaxis.fNbins;
        // const posY = Math.abs(intersec.index);
        const posY = Math.floor(
          (indexNormalized % (node.fXaxis.fNbins * node.fYaxis.fNbins)) /
          node.fXaxis.fNbins,
        );
        // const posZ = Math.abs(intersec.index % node.fXaxis.fNbins * node.fYaxis.fNbins * node.fZaxis.fNbins);
        const posZ = Math.floor(
          indexNormalized / (node.fXaxis.fNbins * node.fYaxis.fNbins),
        );
        const pos = [{ x: posX, y: posY, z: posZ }];
        const fullPath = [...path, { x: posX, y: posY, z: posZ }];
        // if (layer === 1) {
        //     console.log('index: ', intersect.index ,', pos: ', pos)
        // }

        if (node.children) {
          const children = Object.entries(node.children);

          const childResults = children.flatMap(([setX, childX]) => {
            //get child jsroot node
            const binIndex = node.getBin(posX + 1, posY + 1, posZ + 1);
            const child = childX?.[binIndex];
            if (!child) return [];

            const childOffset =
              offset * indexOffset +
              (posX +
                posY * node.fXaxis.fNbins +
                posZ * (node.fXaxis.fNbins * node.fYaxis.fNbins)) *
              perInstance;
            const next =
              setX === "content"
                ? this.matrixCache?.[layer + 1]?.[childOffset]
                : this.matrixCache[layer + 1][this.availableSets.indexOf(setX)][
                  childOffset
                  ];

            if (!next) return [];

            let r = recursiveSearch(
              child,
              layer + 1,
              Math.abs(intersect.index),
              fullPath,
              setX,
            );

            if (setX !== "content") {
              r = r.map((res) => ({ ...res, set: setX }));
            }
            return r;
          });
          if (childResults.length > 0) {
            // console.log('childREsu: ', childResults)
            result.push(...childResults);
          } else {
            const childOffset =
              offset * this.maxInstancesPerLayer[layer] +
              (posX +
                posY * node.fXaxis.fNbins +
                posZ * (node.fXaxis.fNbins * node.fYaxis.fNbins));
            const instance =
              set && set !== "content"
                ? this.matrixCache[layer]?.[this.availableSets.indexOf(set)]?.[
                  childOffset
                  ]
                : this.matrixCache[layer]?.[childOffset];
            if (instance.rendered)
              result.push({
                index: fullPath,
                target: intersect.target,
                distance: intersect.distance,
                set: set,
                instanceId: this.computeIndexFromPosition(fullPath),
                jsrootInstance: this.computeJsRootIndexFromPosition(fullPath),
                range: this.getRangeByPosition(fullPath),
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
            instanceId: this.computeIndexFromPosition(fullPath),
            jsrootInstance: this.computeJsRootIndexFromPosition(fullPath),
            range: this.getRangeByPosition(fullPath),
            origin: this,
            jsrootObj: node,
            content: this.getBinContent(node, posX, posY, posZ, this.selectedArray),
            error: node.getBinError(posX + 1, posY + 1, posZ + 1),
          });
        }
        // return ({
        //     ...intersect,
        //     index: pos,
        //     set: set,
        //     instanceId: this.computeIndexFromPosition(pos),
        //     jsrootInstance: this.computeJsRootIndexFromPosition(pos),
        //     range: this.getRangeByPosition(pos),
        //     origin: this,
        //     jsrootObj: node,
        //     content: node.getBinContent(posX + 1, posY + 1, posZ + 1),
        //     error: node.getBinError(posX + 1, posY + 1, posZ + 1),
        // });
      });
      // console.log(result)
      return result.sort((a, b) => {
        return a.distance - b.distance;
      });
      //result z dfs param(layer)
    };

    return recursiveSearch(this.pointer.origin, 0);
  }

  filterOutsideContent (rootObj) {
    const binsPerAxis = [1];
    binsPerAxis.push((rootObj.fXaxis.fNbins + 2) * binsPerAxis[0]);
    binsPerAxis.push((rootObj.fYaxis.fNbins + 2) * binsPerAxis[1]);

    // console.log(rootObj.fArray);
    // console.log(binsPerAxis);

    const original = rootObj.fArray;
    const filtered = [];

    // Calculate total dimensions including overflow/underflow bins
    const xTotal = rootObj.fXaxis.fNbins + 2;
    const yTotal = rootObj.fYaxis.fNbins + 2;
    const zTotal = rootObj.fZaxis.fNbins + 2;

    // Determine if we need to exclude edge bins for each dimension
    const excludeX = rootObj.fXaxis.fNbins > 1;
    const excludeY = rootObj.fYaxis.fNbins > 1;
    const excludeZ = rootObj.fZaxis.fNbins > 1;

    // Calculate valid ranges
    const xStart = excludeX ? 1 : 0;
    const xEnd = excludeX ? xTotal - 1 : xTotal;
    const yStart = excludeY ? 1 : 0;
    const yEnd = excludeY ? yTotal - 1 : yTotal;
    const zStart = excludeZ ? 1 : 0;
    const zEnd = excludeZ ? zTotal - 1 : zTotal;

    // Handle different dimensionalities
    if (rootObj.fZaxis.fNbins <= 1 && rootObj.fYaxis.fNbins <= 1) {
      // 1D histogram - only X axis matters
      for (let x = xStart; x < xEnd; x++) {
        filtered.push(original[x]);
      }
    } else if (rootObj.fZaxis.fNbins <= 1) {
      // 2D histogram - X and Y axes
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const index = y * xTotal + x;
          filtered.push(original[index]);
        }
      }
    } else {
      // 3D histogram - X, Y, and Z axes
      for (let z = zStart; z < zEnd; z++) {
        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const index = z * (xTotal * yTotal) + y * xTotal + x;
            filtered.push(original[index]);
          }
        }
      }
    }
    return filtered;
  }

  easeOutQuad (t) {
    return 1 - (1 - t) * (1 - t);
  }

  easeOutCubic (t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * @desc Computes max numeric content for each layer and each set if available.
   * @return Array of content or set objects containing max value.
   * */
  computeMaxContentPerLayer () {
    if (!this.pointer) return;

    // looping is faster than Math.max or reduce
    const getMax = (arr) => {
      let max = -Infinity;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (v > max) max = v;
      }
      return max;
    };

    const max = [];

    max[0] = { content: getMax(this.pointer.origin.fArray) };

    if (this.pointer.origin.fArrays) {
      Object.keys(this.pointer.origin?.fArrays).forEach((array) => {
        max[0] = {
          ...max[0],
          [array]: getMax(this.pointer.origin.fArrays[array]),
        };
      });
    }

    const computation = (children, layer = 1) => {
      if (!max[layer]) {
        max[layer] = {};
      }

      Object.entries(children).forEach(([key, childArray]) => {
        childArray.forEach((child) => {
          if (!child) return;

          const temp = getMax(child.fArray);

          if (!(key in max[layer]) || temp > max[layer][key]) {
            max[layer][key] = temp;
          }

          if (child.children) {
            computation(child.children, layer + 1);
          }
        });
      });
    };

    if (this.pointer.origin.children) {
      computation(this.pointer.origin.children);
    }

    return max;
  }

  /**
   * @desc Computes max numeric content for each layer and each set if available.
   * @return Array of content or set objects containing max value.
   * */
  computeMinContentPerLayer () {
    if (!this.pointer) return;

    // looping is faster than Math.max or reduce
    const getMin = (arr) => {
      let min = Infinity;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (v < min) min = v;
      }
      return min;
    };

    const min = [];

    min[0] = {
      content: getMin(this.pointer.origin.fArray.filter((v) => v !== 0)),
    };

    if (this.pointer.origin.fArrays) {
      Object.keys(this.pointer.origin?.fArrays).forEach((array) => {
        min[0] = {
          ...min[0],
          [array]: getMin(
            this.pointer.origin.fArrays[array].values.filter((v) => v !== 0),
          ),
        };
      });
    }

    const computation = (children, layer = 1) => {
      if (!min[layer]) {
        min[layer] = {};
      }

      Object.entries(children).forEach(([key, childArray]) => {
        childArray.forEach((child) => {
          if (!child) return;

          const temp = getMin(child.fArray.filter((v) => v !== 0));

          if (!(key in min[layer]) || temp > min[layer][key]) {
            min[layer][key] = temp;
          }

          if (child.children) {
            computation(child.children, layer + 1);
          }
        });
      });
    };

    if (this.pointer.origin.children) {
      computation(this.pointer.origin.children);
    }

    return min;
  }

  /**
   * @desc Computes Maximum number of instances for each layer of histogram.
   * @return Array of numbers representing max value for each layer.
   * */
  computeMaxInstancesPerLayer () {
    if (!this.pointer) return;
    const temp =
      this.pointer.origin.fXaxis.fNbins *
      this.pointer.origin.fYaxis.fNbins *
      this.pointer.origin.fZaxis.fNbins;
    let max = [];
    max.push(temp);

    const computation = (children, layer = 1) => {
      let temp = 0;
      if (layer >= max.length) {
        max.push(0);
      }
      Object.entries(children).forEach((value, index) => {
        value[1].forEach((child) => {
          // console.log(child)
          if (child) {
            temp =
              child.fXaxis.fNbins * child.fYaxis.fNbins * child.fZaxis.fNbins;
            if (temp > max[layer]) {
              max[layer] = temp;
            }
            if (child.children) {
              computation(child.children, layer + 1);
            }
          }
        });
      });
      return max;
    };
    if (this.pointer.origin.children) {
      computation(this.pointer.origin.children);
    }
    max.push(1);
    return max;
  }

  getGradientColor (value, min, max, set, layer) {
    const normalize = (value, min, max) => (value - min) / (max - min);
    const t = normalize(value, min, max);

    const colorConfig = this.config.color;
    const setIndex = this.availableSets.indexOf(set);

    if (colorConfig.set[setIndex]) {
      const minColor = colorConfig.set[setIndex].min;
      return minColor.clone().lerp(colorConfig.set[setIndex].max, t);
    } else if (colorConfig.layer[layer]) {
      const minColor = colorConfig.layer[layer].min;
      return minColor.clone().lerp(colorConfig.layer[layer].max, t);
    } else {
      const minColor = colorConfig.default.min;
      return minColor.clone().lerp(colorConfig.default.max, t);
    }
  }

  flipLocalZAxis (worldPosition, worldScale, localPosition) {
    return {
      ...localPosition,
      z: {
        size: localPosition.z.size,
        // pos: worldPosition - worldScale + localPosition.z.pos
        pos: 2 * worldPosition - localPosition.z.pos,
      },
    };
  }

  areArraysEqual (arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    const countMap = {};
    for (const str of arr1) {
      countMap[str] = (countMap[str] || 0) + 1;
    }

    for (const str of arr2) {
      if (!countMap[str]) {
        return false;
      }
      countMap[str]--;
    }

    return true;
  }
}
