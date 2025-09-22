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

  constructor (scene) {
    this.singleClickTimer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.sceneElement = scene;
    scene.traverse((obj) => {
      if (obj.isCamera) {
        this.cameraElement = obj;
      }
    });
    this.setupRaycasting();
  }

  setupRaycasting () {
    let lastCheck = 0; // Timestamp tracker
    const checkInterval = 100; // 100ms delay

    window.addEventListener("mousemove", (event) => {
      const now = performance.now();
      if (now - lastCheck < checkInterval) return; // Skip if too soon
      lastCheck = now;

      this.updateRaycaster(event);
    });

    window.addEventListener("click", (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.cameraElement);

      // // --- draw line from camera to ray direction ---
      // if (!this.rayLine) {
      //     const geometry = new THREE.BufferGeometry().setFromPoints([
      //         new THREE.Vector3(),
      //         new THREE.Vector3()
      //     ]);
      //     const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
      //     this.rayLine = new THREE.Line(geometry, material);
      //     this.sceneElement.add(this.rayLine);
      // }
      //
      // // start point: camera position
      // const start = new THREE.Vector3();
      // this.cameraElement.getWorldPosition(start);
      //
      // // end point: along ray direction, extend it out some distance
      // const end = new THREE.Vector3();
      // this.raycaster.ray.at(100, end); // extend ray 100 units into scene
      //
      // // update line geometry
      // this.rayLine.geometry.setFromPoints([start, end]);

      const currentTime = Date.now();
      const timeSinceLastClick = this.lastClick ? currentTime - this.lastClick : Infinity;
      const isDoubleClick = timeSinceLastClick < 190;

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
        }, 190);
      }

      this.lastClick = currentTime;
    });
  }

  intersectObject (obj) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraElement);

    console.log(this.raycaster.intersectObject(obj));
  }

  handleRaycast () {
    const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
    if (hits.length > 0) {
      // console.log(`${this.raycaster._triggerSource}:`, hits);
    }
  }

  updateRaycaster (event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraElement);
    this.raycaster._triggerSource = "mousemove";
    const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
  }
}