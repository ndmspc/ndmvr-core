import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { filter } from "rxjs";
import { build3d } from "jsroot";
import { functionSubjectGet } from "../rxjs/FunctionSubject.js";
import BinInfoVisualizer from "./bininfo-jsroot-class.js";
import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";
import { binInfoSubjectGet } from "../rxjs/BinInfoSubject.js";


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

  constructor (id, rootObj, camera) {
    this.id = id;
    this.rootObj = rootObj;
    this.camera = camera;
    this.histogramGroup = new THREE.Group();
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
        this.config = { ...v.config };
        const matrix = this.config.environment.histogramPads.find(el => el.id === this.id);
        const pos = matrix.position;
        // const scale = matrix.scale;
        this.histogramGroup.position.set(pos.x, pos.y, pos.z);
        // this.histogramGroup.scale.set(scale.x, scale.y, scale.z);
      });

    this.sub = functionSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) =>
            (e.target.id.includes("*") || e.target.id.includes(this.id)),
        ),
      )
      .subscribe((f) => {
        console.log(f);
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

    this.raycastHandler = this.raycastHandler.bind(this);
    this.mouseClickDefault = this.mouseClickDefault.bind(this);
    this.mousemoveDefault = this.mousemoveDefault.bind(this);
    this.shiftMouseClickDefault = this.shiftMouseClickDefault.bind(this);
    this.mouseDBClickDefault = this.mouseDBClickDefault.bind(this);
    this.shiftMouseDBClickDefault = this.shiftMouseDBClickDefault.bind(this);
    this.addEvent("mouseclick", this.mouseClickDefault);
    this.addEvent("mousemove", this.mousemoveDefault);
    this.addEvent("shiftmouseclick", this.shiftMouseClickDefault);
    this.addEvent("mousedbclick", this.mouseDBClickDefault);
    this.addEvent("shiftmousedbclick", this.shiftMouseDBClickDefault);

    this.renderWithBuild3d();
  }

  updateHistogram (histo) {
    this.rootObj = histo;
    this.histogramGroup.clear();
    this.renderWithBuild3d();
  }

  renderWithBuild3d() {
    build3d(this.rootObj).then(obj3d => {
      console.log("obj3d: ", obj3d);
      const matrixScale = this.config.environment.histogramPads.find(el => el.id === this.id)?.scale;
      const box = new THREE.Box3().setFromObject(obj3d);
      const size = new THREE.Vector3();
      box.getSize(size);

      obj3d.scale.set(
        matrixScale.x / size.x,
        matrixScale.z / size.y,
        (matrixScale.y / size.z));

      obj3d.rotateX(-Math.PI / 2);
      this.histogramGroup.add(obj3d);
      // console.log("obj3d: ", obj3d);
      // console.log(this.histogramGroup);

      const mesh = this.getInstancedMesh();
      this.defaultRaycastHandler = mesh.raycast.bind(mesh);
      mesh.raycast = this.raycastHandler.bind(this);
    });
  }


  raycastHandler(raycaster, intersects) {
    this.defaultRaycastHandler(raycaster, intersects);

    setTimeout(() =>{
      const firstIntersect = intersects
        .filter(intersect => intersect.instanceId !== undefined)
        .sort((a, b) => {
          return a.distance - b.distance;
        })[0];

      if (!firstIntersect) {
        this.mouseEvents
          .filter((mouseEvent) => mouseEvent.event === "mousemove")
          .forEach((mouseEvent) => mouseEvent.function(
            {
              instanceId: undefined,
              object: this.getInstancedMesh()
            }, this));
        return;
      }

      const bin = firstIntersect.object.bins[firstIntersect.instanceId];
      const xBins = this.rootObj.fXaxis.fNbins + 2;
      const yBins = this.rootObj.fYaxis.fNbins + 2;
      const index = {
        x: bin % xBins,
        y: Math.floor(bin % (xBins * yBins) / xBins),
        z: Math.floor(bin / (xBins * yBins)),
      };
      const range = this.getRangeByPosition([index]);
      const name = this.rootObj.fName;
      const intersection = {
        ...firstIntersect,
        index: [index],
        coords: [{...range, bin, name}],
        content: this.rootObj.getBinContent(index.x, index.y, index.z),
        error: this.rootObj.getBinError(index.x, index.y, index.z),
      };

      this.mouseEvents
        .filter((mouseEvent) => mouseEvent.event === raycaster._triggerSource)
        .forEach((mouseEvent) => mouseEvent.function(intersection, this));

      this.dirtyInstance = firstIntersect.instanceId;

    }, 0);



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
   * @param func has to have same reference to one that was added by addEvent.
   * */
  removeEvent (event, func) {
    const index = this.mouseEvents.find((f) => f === func);
    if (index) this.mouseEvents.splice(index, 1);
  }

  mouseClickDefault (event) {
    console.log("mouseclick default");
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

    if (event.instanceId === this.dirtyInstance) return;
    const mesh = event.object;
    if (this.dirtyInstance !== undefined) {
      const color = new THREE.Color();
      mesh.getColorAt(this.dirtyInstance, color);
      const target = new THREE.Color(0x00ffff);
      const t = 0.5;
      color.lerp(target, -t / (1 - t)); // revert tint
      mesh.setColorAt(this.dirtyInstance, color);
    }

    this.dirtyInstance = event.instanceId;

    const color = new THREE.Color();
    mesh.getColorAt(this.dirtyInstance, color);
    const target = new THREE.Color(0x00ffff);
    color.lerp(target, 0.5); // 30% toward cyan
    mesh.setColorAt(this.dirtyInstance, color);
    mesh.instanceColor.needsUpdate = true;

    this.binInfoComponent.queue.next(event);
    binInfoSubjectGet().next(event);
  }

  shiftMouseClickDefault (event) {
    console.log("shiftMouseClickDefault");
  }

  mouseDBClickDefault (event) {
    console.log("mouseDBClickDefault");
  }

  shiftMouseDBClickDefault (event) {
    console.log("shiftMouseDBClickDefault");
  }

  getInstancedMesh(node = this.histogramGroup) {
    if (!node) return null;

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
  getRangeByPosition (position) {
    const axisNames = ["x", "y", "z"];
    const nAxes = Number.parseInt(this.rootObj._typename.substring(2, 3), 10);

    let range = {};

    if (position[0]) {
      for (let i = 0; i < nAxes; i++) {
        const axisKey = axisNames[i]; // "x", "y", or "z"
        const axisObj = this.rootObj[`f${axisKey.toUpperCase()}axis`]; // fXaxis, fYaxis, fZaxis
        const posVal = position[0][axisKey];

        range[axisKey] = {
          min: axisObj.GetBinLowEdge(posVal),
          max: axisObj.GetBinCenter(posVal) * 2 - axisObj.GetBinLowEdge(posVal),
          name: axisObj.fName,
          title: axisObj.fTitle
        };
      }
      range = {...range, color: new THREE.Color(0x000000)};
    }
    return range;
  }


  remove () {
    this.histogramGroup.parent.remove(this.histogramGroup);
    this.dummyEl = document.getElementById("dummyDiv" + this.id);
    if (this.dummyEl) document.body.removeChild(this.dummyEl);
    this.configSub.unsubscribe();
    this.sub.unsubscribe();
  }

  getHistogramMesh () {
    return this.histogramGroup;
  }

}