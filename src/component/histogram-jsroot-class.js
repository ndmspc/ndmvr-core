import {configSubjectGet} from "../rxjs/ConfigSubject.js";
import {filter} from "rxjs";
import {build3d} from "jsroot";
import {functionSubjectGet} from "../rxjs/FunctionSubject.js";
import BinInfoVisualizer from "./bininfo-jsroot-class.js";
import {canvasSubjectGet} from "../rxjs/CanvasSubject.js";
import {binInfoSubjectGet} from "../rxjs/BinInfoSubject.js";
import {Box3, Color, Group, Vector3} from "three";
import { disposeObject3D } from "../utils/disposeObject3D.js";


export class HistogramJsrootClass {
  histogramGroup = undefined;
  binInfoComponent = undefined;
  id = undefined;
  configSub = undefined;
  rootObj = undefined;
  histoSub = undefined;
  dummyEl = undefined;
  defaultRaycastHandler = undefined;
  mouseEvents = [];
  keydownEvents = [];
  keyupEvents = [];
  color = new Color();
  colorTarget = new Color(0x00ffff);
  buildPromise = undefined;
  _buildVersion = 0;
  _interactionVersion = 0;
  _timers = new Set();
  _removed = false;
  _mesh = undefined;
  _activeBuild = undefined;

  constructor(id, rootObj, camera) {
    this.id = id;
    this.rootObj = rootObj;
    this.camera = camera;
    this.histogramGroup = new Group();
    try {
      this.dummyEl = document.getElementById("dummyDiv" + id);
      if (this.dummyEl) document.body.removeChild(this.dummyEl);

      this.binInfoComponent = new BinInfoVisualizer(
        this.camera,
        {
          backgroundColor: 0x36454F,
          textColor: 0,      // ROOT color index
          titleColor: 0,     // ROOT color index
        });

      this.dummyEl = document.createElement("div");
      this.dummyEl.id = "dummyDiv" + id;
      document.body.appendChild(this.dummyEl);

      this.configSub = configSubjectGet().getObservable()
        .pipe(filter(e =>
          ((e.target.id.includes("*")) || (e.target.id.includes(this.id)))))
        .subscribe((v) => {
          this.config = {...v.config};
          const matrix = this.config.environment.histogramPads.find(el => el.id === this.id);
          if (!matrix) return;
          const pos = matrix.position;
          // const scale = matrix.scale;
          this.histogramGroup.position.set(pos.x, pos.y, pos.z);
          // this.histogramGroup.scale.set(scale.x, scale.y, scale.z);
        });

      this.raycastHandler = this.raycastHandler.bind(this);
      this.mouseClickDefault = this.mouseClickDefault.bind(this);
      this.mousemoveDefault = this.mousemoveDefault.bind(this);
      this.shiftMouseClickDefault = this.shiftMouseClickDefault.bind(this);
      this.mouseDBClickDefault = this.mouseDBClickDefault.bind(this);
      this.shiftMouseDBClickDefault = this.shiftMouseDBClickDefault.bind(this);

      this.sub = functionSubjectGet()
        .getObservable()
        .pipe(
          filter(
            (e) =>
              (e.target.id.includes("*") || e.target.id.includes(this.id)),
          ),
        )
        .subscribe((f) => {
          if (f.flag === "add") {
            if (f.function) {
              this.addEvent(f.event, f.function);
            } else {
              switch (f.event) {
              case "mousemove":
                this.addEvent(f.event, this.mousemoveDefault);
                break;
              case "mouseclick":
                this.addEvent(f.event, this.mouseClickDefault);
                break;
              case "shiftmouseclick":
                this.addEvent(f.event, this.shiftMouseClickDefault);
                break;
              case "mousedbclick":
                this.addEvent(f.event, this.mouseDBClickDefault);
                break;
              case "shiftmousedbclick":
                this.addEvent(f.event, this.shiftMouseDBClickDefault);
                break;
              }
            }
          } else if (f.flag === "remove" && f.function) {
            this.removeEvent(f.event, f.function);
          } else if (f.flag === "remove") {
            switch (f?.state) {
            case "keydown":
              this.keydownEvents = [];
              break;
            case "keyup":
              this.keyupEvents = [];
              break;
            default:
              this.mouseEvents = this.mouseEvents.filter(ev => ev.event !== f.event);
              this.mousemoveDefault({
                object: this.getInstancedMesh(),
                instanceId: null
              });
            }
          } else if (f.flag === "removeAll") {
            this.keydownEvents = [];
            this.keyupEvents = [];
            this.mouseEvents = [];
          }
        });

      this.addEvent("mouseclick", this.mouseClickDefault);
      this.addEvent("mousemove", this.mousemoveDefault);
      this.addEvent("shiftmouseclick", this.shiftMouseClickDefault);
      this.addEvent("mousedbclick", this.mouseDBClickDefault);
      this.addEvent("shiftmousedbclick", this.shiftMouseDBClickDefault);

      this.renderWithBuild3d();
    } catch (error) {
      this.remove();
      throw error;
    }
  }

  updateHistogram(histo) {
    return this.renderWithBuild3d(histo);
  }

  renderWithBuild3d(rootObj = this.rootObj) {
    if (this._removed) return Promise.resolve();
    const version = ++this._buildVersion;
    this._activeBuild?.cancel();
    this._clearInteractions();
    if (this._removed || version !== this._buildVersion) return Promise.resolve();
    let cancel;
    const canceled = new Promise(resolve => { cancel = resolve; });
    const operation = { cancel };
    this._activeBuild = operation;
    const current = () => !this._removed && version === this._buildVersion;
    let candidate;
    const work = Promise.resolve().then(() => {
      if (current()) return build3d(rootObj);
    }).then(obj3d => {
      if (!obj3d) {
        if (current()) throw new Error("JSROOT did not build a 3D object");
        return;
      }
      candidate = obj3d;
      if (!current()) {
        disposeObject3D(candidate);
        candidate = undefined;
        return;
      }
      const matrixScale = this.config.environment.histogramPads.find(el => el.id === this.id)?.scale;
      if (!matrixScale) throw new Error("Histogram pad is not configured");
      const box = new Box3().setFromObject(obj3d);
      const size = new Vector3();
      box.getSize(size);

      obj3d.scale.set(
        matrixScale.x / size.x,
        matrixScale.z / size.y,
        (matrixScale.y / size.z));

      obj3d.rotateX(-Math.PI / 2);
      obj3d.translateZ(-(matrixScale.y / 2));

      const mesh = this.getInstancedMesh(obj3d);
      const originalRaycast = mesh?.raycast.bind(mesh);
      if (mesh) {
        mesh.raycast = (raycaster, intersects) => {
          this.raycastHandler(raycaster, intersects, mesh, rootObj, originalRaycast);
        };
      }
      this._clearInteractions();
      if (!current()) {
        disposeObject3D(candidate);
        candidate = undefined;
        return;
      }
      const previous = [...this.histogramGroup.children];
      this.rootObj = rootObj;
      this._mesh = mesh;
      this.defaultRaycastHandler = originalRaycast;
      // Transfer ownership before scene callbacks can remove or replace the painter.
      candidate = undefined;
      try {
        this.histogramGroup.add(obj3d);
      } finally {
        const disposed = new Set();
        for (const object of previous) disposeObject3D(object, disposed);
      }
    }).catch(err => {
      disposeObject3D(candidate);
      if (!current()) return;
      const matrix = this.config.environment.histogramPads.find(el => el.id === this.id);
      console.log("JSROOT was not able to build object: ", err, matrix);
      throw {
        message: err,
        scale: matrix?.scale,
        position: matrix?.position
      };
    });
    const promise = Promise.race([work, canceled]).finally(() => {
      if (this._activeBuild === operation) this._activeBuild = undefined;
    });
    this.buildPromise = promise;
    // Components can attach their error handler after subscribing to a replayed histogram.
    promise.catch(() => {});
    return promise;
  }

  _isCurrentMesh(mesh) {
    if (this._removed || !mesh || mesh !== this._mesh) return false;
    let object = mesh;
    while (object && object !== this.histogramGroup) object = object.parent;
    return object === this.histogramGroup;
  }

  _resetHover() {
    const mesh = this._hoverMesh;
    if (mesh?.geometry && mesh.instanceColor && this._hoverColor && this.dirtyInstance !== undefined) {
      mesh.setColorAt(this.dirtyInstance, this._hoverColor);
      mesh.instanceColor.needsUpdate = true;
    }
    this._hoverMesh = undefined;
    this._hoverColor = undefined;
    this.dirtyInstance = undefined;
  }

  _clearInteractions() {
    this._interactionVersion++;
    for (const timer of this._timers ?? []) clearTimeout(timer);
    this._timers?.clear();
    this._resetHover();
    this.binInfoComponent?.clear();
  }

  raycastHandler(raycaster, intersects, mesh = this._mesh, rootObj = this.rootObj, originalRaycast = this.defaultRaycastHandler) {
    if (!this._isCurrentMesh(mesh) || !originalRaycast) return;
    originalRaycast(raycaster, intersects);
    if (!this._isCurrentMesh(mesh)) return;
    const version = this._interactionVersion;
    const hits = intersects.filter(hit => hit.object === mesh && hit.instanceId !== undefined)
      .map(hit => ({ ...hit, point: hit.point?.clone?.() ?? hit.point }));
    const current = () => version === this._interactionVersion && this._isCurrentMesh(mesh);

    const timer = setTimeout(() => {
      this._timers.delete(timer);
      if (!current()) return;
      const firstIntersect = hits
        .sort((a, b) => {
          return a.distance - b.distance;
        })[0];

      if (!firstIntersect) {
        for (const mouseEvent of this.mouseEvents.filter(event => event.event === "mousemove")) {
          if (!current()) return;
          mouseEvent.function({ instanceId: undefined, object: mesh }, this);
        }
        return;
      }

      const bin = mesh.bins?.[firstIntersect.instanceId];
      if (bin === undefined) return;
      const xBins = rootObj.fXaxis.fNbins + 2;
      const yBins = rootObj.fYaxis.fNbins + 2;
      const index = {
        x: bin % xBins,
        y: Math.floor(bin % (xBins * yBins) / xBins),
        z: Math.floor(bin / (xBins * yBins)),
      };
      const range = this.getRangeByPosition([index], rootObj);
      const name = rootObj.fName;
      const intersection = {
        ...firstIntersect,
        index: [index],
        coords: [{...range, bin, name}],
        content: rootObj.getBinContent(index.x, index.y, index.z),
        error: rootObj.getBinError(index.x, index.y, index.z),
      };

      // R3F hosts assign this source in their pointer handler after raycasting.
      const triggerSource = raycaster._triggerSource;
      for (const mouseEvent of this.mouseEvents.filter(event => event.event === triggerSource)) {
        if (!current()) return;
        mouseEvent.function(intersection, this);
      }

    }, 0);
    this._timers.add(timer);
  }

  /**
   * @desc Adds function that will be called, if specified event is triggered.
   * @param event can be either mouseevent in which only name of event is required (e.g. mousclick, shiftmousedbclick),
   * or keyboard event which has to concise state (keydown or keyup) and keyCode (e.g. Numpad1)
   * @param func Function that is called if event is triggered.
   * */
  addEvent(event, func) {
    if (event?.state === "keydown") {
      this.keydownEvents.push({
        key: event.key,
        function: func,
      });
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
   * @param func has to have same reference to one that was added by addEvent.
   * */
  removeEvent(event, func) {
    const index = this.mouseEvents.findIndex(entry => entry.event === event && entry.function === func);
    if (index !== -1) this.mouseEvents.splice(index, 1);
  }

  mouseClickDefault(event) {
    console.log("mouseclick default");
  }

  mousemoveDefault(event) {
    if (this._removed || (event.object && event.object !== this._mesh)) return;
    const mesh = event.object;
    if (!Number.isInteger(event.instanceId) || !this._isCurrentMesh(mesh) ||
      event.instanceId < 0 || event.instanceId >= mesh.count) {
      this._resetHover();
      this.binInfoComponent?.clear();
      return;
    }
    if (event.instanceId === this.dirtyInstance && mesh === this._hoverMesh) return;
    this._resetHover();

    this.dirtyInstance = event.instanceId;
    this._hoverMesh = mesh;

    if (mesh.instanceColor) {
      this._hoverColor = new Color();
      mesh.getColorAt(event.instanceId, this._hoverColor);
      this.color.copy(this._hoverColor).lerp(this.colorTarget, 0.5);
      mesh.setColorAt(event.instanceId, this.color);
      mesh.instanceColor.needsUpdate = true;
    }

    const version = this._interactionVersion;
    this.binInfoComponent.queue.next(event);
    if (version === this._interactionVersion && this._isCurrentMesh(mesh)) binInfoSubjectGet().next(event);
  }

  shiftMouseClickDefault(event) {
    console.log("shiftMouseClickDefault");
  }

  mouseDBClickDefault(event) {
    console.log("mouseDBClickDefault");
  }

  shiftMouseDBClickDefault(event) {
    console.log("shiftMouseDBClickDefault");
  }

  getInstancedMesh(node = this.histogramGroup) {
    if (!node) return null;
    if (node === this.histogramGroup && this._isCurrentMesh(this._mesh)) return this._mesh;

    if (node.isInstancedMesh === true) {
      return node;
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const result = this.getInstancedMesh(child);
        if (result) return result; // return as soon as we find one
      }
    }

    return null;
  }

  /**
   * Method to obtain range of axes.
   * @param position – should be array with position for each layer.
   * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
   * */
  getRangeByPosition(position, rootObj = this.rootObj) {
    const axisNames = ["x", "y", "z"];
    const nAxes = Number.parseInt(rootObj._typename.substring(2, 3), 10);

    let range = {};

    if (position[0]) {
      for (let i = 0; i < nAxes; i++) {
        const axisKey = axisNames[i]; // "x", "y", or "z"
        const axisObj = rootObj[`f${axisKey.toUpperCase()}axis`]; // fXaxis, fYaxis, fZaxis
        const posVal = position[0][axisKey];

        range[axisKey] = {
          min: axisObj.GetBinLowEdge(posVal),
          max: axisObj.GetBinCenter(posVal) * 2 - axisObj.GetBinLowEdge(posVal),
          name: axisObj.fName,
          title: axisObj.fTitle
        };
      }
      range = {...range, color: new Color(0x000000)};
    }
    return range;
  }


  remove() {
    this._removed = true;
    this._buildVersion++;
    this._activeBuild?.cancel();
    this._activeBuild = undefined;
    this._clearInteractions();
    this.configSub?.unsubscribe();
    this.sub?.unsubscribe();
    this.histoSub?.unsubscribe();
    this.binInfoComponent?.dispose();
    disposeObject3D(this.histogramGroup);
    this.dummyEl?.parentNode?.removeChild(this.dummyEl);
    this.dummyEl = undefined;
    this.mouseEvents = [];
    this.keydownEvents = [];
    this.keyupEvents = [];
    this.defaultRaycastHandler = undefined;
    this._mesh = undefined;
  }

  getHistogramMesh() {
    return this.histogramGroup;
  }

}
