import { functionSubjectGet } from "../rxjs/FunctionSubject.js";
import { filter } from "rxjs";
import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { stateSubjectGet } from "../rxjs/StateSubject.js";
import { dispatchSubjectGet } from "../rxjs/DispatchSubject.js";
import {ensureDefaultBindings} from "../utils/baseUtil.js";
import {Vector3} from "three";

export class TPainter {
  id = undefined;
  functionSub = undefined;
  // stateSub = undefined;
  configSub = undefined;
  dispatchSub = undefined;
  rootObj = undefined;
  config = undefined;
  limits = {
    position: new Vector3(0, 0, 0),
    scale: new Vector3(10, 10, 10)
  };
  mouseEvents = [];
  keydownEvents = [];
  keyupEvents = [];
  keyBindings = {};
  opts = undefined;
  //
  constructor ( rootObj, id, opts) {
    this.rootObj = rootObj.obj;
    this.id = id;
    this.opts = opts;
    this.config = configSubjectGet().mergeHistogramConfig(this?.opts?.config);

    this.functionSub = functionSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) =>
            e.target.entity === "nested-histogram" &&
            (e.target.id.includes("*") || e.target.id.includes(this.id)),
        ),
      )
      .subscribe(event => this.functionSubjectHandler(event));

    this.configSub = configSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) => e.target.id.includes("*") || e.target.id.includes(this.id),
        ),
      )
      .subscribe((v) => {
        this.config = configSubjectGet().mergeHistogramConfig(this?.opts?.config);
        this.keyBindings = ensureDefaultBindings(v.config.bindings);
        const hasLimits = v.config.environment.histogramPads.find(
          (el) => el.id === this.id
        );

        this.limits = hasLimits ?? {
          scale:  { x: 20, y: 10, z: 20 },
          padding:{ x: 0,  y: 0,  z: 0  },
          position: { x: 0,  y: 0,  z: -5 }
        };
      });

    this.dispatchSub = dispatchSubjectGet().getObservable()
      .pipe(
        filter((event) =>
          (event.target.id === "*" || event.target.id === this.id)))
      .subscribe((event) => this.dispatchSubjectHandler(event));

    this.initDefaultFunctions();

  }

  remove() {
    this.functionSub.unsubscribe();
    this.configSub.unsubscribe();
    this.dispatchSub.unsubscribe();
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keydown", this.keyUpHandler);
  }

  initDefaultFunctions() {
    this.keyDownHandler = this.keyDownHandler.bind(this);
    this.keyUpHandler = this.keyUpHandler.bind(this);
    this.raycastHandler = this.raycastHandler.bind(this);
    this.mouseClickDefault = this.mouseClickDefault.bind(this);
    this.mousemoveDefault = this.mousemoveDefault.bind(this);
    this.shiftMouseClickDefault = this.shiftMouseClickDefault.bind(this);
    this.mouseDBClickDefault = this.mouseDBClickDefault.bind(this);
    this.shiftMouseDBClickDefault = this.shiftMouseDBClickDefault.bind(this);

    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keydown", this.keyUpHandler);

    this.addEvent("mouseclick", this.mouseClickDefault);
    this.addEvent("mousemove", this.mousemoveDefault);
    this.addEvent("shiftmouseclick", this.shiftMouseClickDefault);
    this.addEvent("mousedbclick", this.mouseDBClickDefault);
    this.addEvent("shiftmousedbclick", this.shiftMouseDBClickDefault);
  }

  functionSubjectHandler(event) {
    if (event.flag === "add") {
      if (event.function) {
        this.addEvent(event.event, event.function);
      } else {
        switch (event.event) {
        case "mousemove":
          this.addEvent(event.event, this.mousemoveDefault);
          break;
        case "mouseclick":
          this.addEvent(event.event, this.mouseClickDefault);
          break;
        case "shiftmouseclick":
          this.addEvent(event.event, this.shiftMouseClickDefault);
          break;
        case "mousedbclick":
          this.addEvent(event.event, this.mouseDBClickDefault);
          break;
        case "shiftmousedbclick":
          this.addEvent(event.event, this.shiftMouseDBClickDefault);
          break;
        }
      }
    } else if (event.flag === "remove" && event.function) {
      this.removeEvent(event.event, event.function);
    } else if (event.flag === "remove") {
      switch (event?.state) {
      case "keydown":
        this.keydownEvents = [];
        break;
      case "keyup":
        this.keyupEvents = [];
        break;
      default:
        this.mouseEvents = this.mouseEvents.filter(ev => ev.event !== event.event);
      }
    } else if (event.flag === "removeAll") {
      this.keydownEvents = [];
      this.keyupEvents = [];
      this.mouseEvents = [];
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
    console.log("mouse click default");
  }

  mousemoveDefault (event) {
    console.log("mouse move default");
  }

  shiftMouseClickDefault (event) {
    console.log("shift mouse click");
  }

  mouseDBClickDefault (event) {
    console.log("mouseDBClick default");
  }

  shiftMouseDBClickDefault (event) {
    console.log("shift mouse db click default");
  }

  dispatchSubjectHandler(event) {
    console.log("dispatch: ", event);
  }
}