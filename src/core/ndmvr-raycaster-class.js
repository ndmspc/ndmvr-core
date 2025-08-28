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

         const currentTime = Date.now();
         const timeSinceLastClick = currentTime - (this.lastClick || 0);
         const isDoubleClick = timeSinceLastClick < 190;

         if (this.singleClickTimer) {
            clearTimeout(this.singleClickTimer);
            this.singleClickTimer = null;
         }

         if (isDoubleClick) {
            if (event.shiftKey) {
               this.raycaster._triggerSource = 'shiftmousedbclick';
            } else {
               this.raycaster._triggerSource = 'mousedbclick';
            }

            this.handleRaycast();
         } else {
            this.singleClickTimer = setTimeout(() => {
               if (event.shiftKey) {
                  this.raycaster._triggerSource = 'shiftmouseclick';
               } else {
                  this.raycaster._triggerSource = 'mouseclick';
               }

               this.handleRaycast();
               this.singleClickTimer = null;
            }, 190);
         }

         this.lastClick = currentTime;
      });
   }

   intersectObject(obj) {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.cameraElement);

      console.log(this.raycaster.intersectObject(obj));
   }

   handleRaycast() {
      const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
      if (hits.length > 0) {
         // console.log(`${this.raycaster._triggerSource}:`, hits);
      }
   }

   updateRaycaster(event) {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.cameraElement);
      this.raycaster._triggerSource = 'mousemove';
      const hits = this.raycaster.intersectObjects(this.sceneElement.children, true);
   }
}