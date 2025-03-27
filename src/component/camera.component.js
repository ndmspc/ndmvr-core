import {stateSubjectGet} from "../rxjs/StateSubject.js";

let camera;

class CameraComponent {
   #camera;
   #oculusController;

   constructor() {
      this.#camera = document.createElement('a-entity');
      this.#camera.id = "cameraRig"
      this.#camera.setAttribute('position', "0 1.6 0");
      this.#camera.innerHTML = `
         <a-camera id="camera" wasd-controls-custom="">
         </a-camera>
      `;
      this.#oculusController = document.createElement('a-entity');
      this.#oculusController.id = "oculus-controller";
      this.#oculusController.setAttribute('oculus-controller', '');
      stateSubjectGet()
         .getObservable()
         .subscribe(
            this.handleStateChange.bind(this)
         );
   }

   handleStateChange(state) {
      const cameraRig = document.getElementById('cameraRig');
      // console.log(cameraRig);
      if (state.inputDevice === 'oculus') {
         if (!cameraRig || cameraRig.contains(this.#oculusController)) return;
         cameraRig.appendChild(this.#oculusController);
      } else {
         if (!cameraRig || !cameraRig.contains(this.#oculusController)) return;
         cameraRig.removeChild(this.#oculusController);
      }
   }

   getCamera() {
      return this.#camera;
   }
}

export const getCameraComponent = () => {
   if (!camera) camera = new CameraComponent();
   return camera.getCamera();
}