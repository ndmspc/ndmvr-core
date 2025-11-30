import { configSubjectGet } from "../rxjs/ConfigSubject.js";

/**
 * This class sets up and periodically updates raycaster.
 * On event (either mouse move or mouse click) all child elements of scene are checked for intersection (recursively).
 * You can check trigger source of intersection by accessing <_triggerSource> in raycaster.
 * @param scene Three.js scene object, in scene children camera has to be present.
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

  constructor (scene, rendererElement) {
    this.singleClickTimer = null;
    this.dbClickTimeout = 190;
    this.rendererElement = rendererElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.sceneElement = scene;
    scene.traverse((obj) => {
      if (obj.isCamera) {
        this.cameraElement = obj;
      }
    });
    this.setupRaycasting();
    this.configSub = configSubjectGet().getObservable().subscribe(c => {
      this.dbClickTimeout = c.config.environment.dbClickTimeout ?? 190;
    });
  }

  setupRaycasting () {
    let lastCheck = 0; // Timestamp tracker
    const checkInterval = 1; // 100ms delay

    window.addEventListener("mousemove", (event) => {
      const now = performance.now();
      if (now - lastCheck < checkInterval) return; // Skip if too soon
      lastCheck = now;

      this.updateRaycaster(event);
    });

    window.addEventListener("click", (event) => {
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
    });
  }

  handleRaycast () {
    const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
    if (hits.length > 0) {
      // console.log(`${this.raycaster._triggerSource}:`, hits);
    }
  }

  updateRaycaster (event) {
    const rect = this.rendererElement.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraElement);
    this.raycaster._triggerSource = "mousemove";
    const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
  }
}