import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { binInfoSubjectGet } from "../rxjs/BinInfoSubject.js";
import { Raycaster, Vector2 } from "three";

/**
 * This class sets up and periodically updates raycaster.
 * On event (either mouse move or mouse click) all child elements of scene are checked for intersection (recursively).
 * You can check trigger source of intersection by accessing <_triggerSource> in raycaster.
 * @param scene Three.js scene object, in scene children camera has to be present.
 * @param domElement DOM element that is attached to renderer. This is used to calculate mouse position relative to renderer
 * Raycaster then traverse childs of specified scene.
 */
export class NdmvrRaycaster {
  raycaster;
  mouse;
  cameraElement;
  sceneElement;
  singleClickTimer;
  dbClickTimeout;
  configSub;
  rendererElement;
  raycastOn;

  constructor (scene, rendererElement) {
    this.singleClickTimer = null;
    this.dbClickTimeout = 190;
    this.raycastOn = true;
    this.rendererElement = rendererElement;
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
    this.sceneElement = scene;
    this.checkInterval = 1;
    this.lastCheck = undefined;
    scene.traverse((obj) => {
      if (obj.isCamera) {
        this.cameraElement = obj;
      }
    });
    this.mousemoveEventHandle = this.mousemoveEventHandle.bind(this);
    this.clickEventHandle = this.clickEventHandle.bind(this);
    this.setupRaycasting();
    this.configSub = configSubjectGet().getObservable().subscribe(c => {
      this.dbClickTimeout = c.config.environment.dbClickTimeout ?? 190;
    });
  }

  setupRaycasting () {
    window.addEventListener("mousemove", this.mousemoveEventHandle);
    window.addEventListener("click", this.clickEventHandle);
  }

  destroyRaycasting () {
    window.removeEventListener("mousemove", this.mousemoveEventHandle);
    window.removeEventListener("click", this.clickEventHandle);
  }

  toggleRaycasting () {
    this.raycastOn = !this.raycastOn;
    if (this.raycastOn) {
      this.setupRaycasting();
    } else {
      this.destroyRaycasting();
    }
  }

  mousemoveEventHandle (event) {
    const now = performance.now();
    if (now - this.lastCheck < this.checkInterval) return; // Skip if too soon
    this.lastCheck = now;

    this.updateRaycaster(event);
  }

  clickEventHandle (event) {
    const rect = this.rendererElement.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraElement);

    const currentTime = Date.now();
    const timeSinceLastClick = this.lastClick ? currentTime - this.lastClick : Infinity;
    const isDoubleClick = timeSinceLastClick < this.dbClickTimeout;

    if (this.singleClickTimer) {
      clearTimeout(this.singleClickTimer);
      this.singleClickTimer = null;
    }

    if (isDoubleClick) {
      this.raycaster._triggerSource = event.shiftKey
        ? "shiftmousedbclick"
        : "mousedbclick";
      this.handleRaycast();
    } else {
      this.singleClickTimer = setTimeout(() => {
        this.raycaster._triggerSource = event.shiftKey
          ? "shiftmouseclick"
          : "mouseclick";
        this.handleRaycast();
        this.singleClickTimer = null;
      }, this.dbClickTimeout);
    }

    this.lastClick = currentTime;
  }

  handleRaycast () {
    try {
      const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
      // if (hits.length > 0) {
        // console.log(`${this.raycaster._triggerSource}:`, hits);
      // }
    } catch (e) {
      console.warn("Error while checking intersection: ", e);
    }
  }

  updateRaycaster (event) {
    const rect = this.rendererElement.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraElement);
    this.raycaster._triggerSource = "mousemove";
    const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
    if (!hits.some(h => h.isHistogramBin)) {
      binInfoSubjectGet().next(null);
    }
  }
}