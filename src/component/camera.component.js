let camera;

class CameraComponent {
   #camera;

   constructor() {
      this.#camera = document.createElement('a-entity');
      this.#camera.id = "cameraRig"
      this.#camera.setAttribute('position', "0 1.6 0");
      this.#camera.innerHTML = `
         <a-camera id="camera">
         </a-camera>
      `;
   }

   getCamera() {
      return this.#camera;
   }
}

export const getCameraComponent = () => {
   if (!camera) camera = new CameraComponent();
   return camera.getCamera();
}