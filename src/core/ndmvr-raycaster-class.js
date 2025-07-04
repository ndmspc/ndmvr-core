/**
 * This class sets up and periodically updates raycaster.
 * On event (either mouse move or mouse click) all child elements of scene are checked for intersection (recursively).
 * You can check trigger source of intersection by accessing <_triggerSource> in raycaster.
 * @param scene Three.js scene object, in scene children camera has to be present.
 * Raycaster then traverse childs of specified scene.
 */
export default class NdmvrRaycaster {

   raycaster;
   mouse;
   cameraElement;
   sceneElement;

   constructor(scene) {
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.sceneElement = scene;
      scene.traverse((obj) => {
         if (obj.isCamera) {
            this.cameraElement = obj;
         }
      })
      this.setupRaycasting();
   }

   setupRaycasting() {
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
         this.raycaster._triggerSource = 'mouseclick';
         const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
      });
   }

   updateRaycaster(event) {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.cameraElement);
      this.raycaster._triggerSource = 'mousemove';
      const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
   }
}