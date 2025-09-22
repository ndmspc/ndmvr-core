// service to manage camera
/** @module CameraService */

/**
 * Servis pre ovládanie a manipuláciu pozície kamery.
 * @class
 */

let cameraService;

class CameraService {
  #cameraRig;
  #camera;

  constructor () {
    setTimeout(() => {
      this.#cameraRig = document.getElementById("cameraRig");
      this.#camera = document.getElementById("camera");
    }, 100);
  }

  /**
   * Zmena vertikálnej polohy kamery.
   * @param {boolean} moveUp - Ak je True, kamera vyššie ak je False kamera nižšie
   * @param {number} speed - Rýchlosť zmeny pozície kamery
   * @return {void}
   */
  verticalMoveCamera = (moveUp, speed) => {
    // if we have not a cameraRig
    if (this.#cameraRig === null)
      this.#cameraRig = document.getElementById("cameraRig");
    if (this.#cameraRig !== null) {
      const targetPosition = new THREE.Vector3();
      const currentPosition = this.#cameraRig.object3D.position.clone(); // naklonuj aktuálnu pozíciu
      if (moveUp) {
        targetPosition.copy(currentPosition).add(new THREE.Vector3(0, +speed, 0)); // nastav cieľovú pozíciu o `speed` jednotiek vyššie
        this.#cameraRig.object3D.position.lerp(targetPosition, 0.5); // 0.5 - koeficient interpolácie
      } else {
        if (this.#cameraRig.object3D.position.y > 1.6) {
          targetPosition.copy(currentPosition).add(new THREE.Vector3(0, -speed, 0)); // nastav cieľovú pozíciu o `speed` jednotiek nižšie
          this.#cameraRig.object3D.position.lerp(targetPosition, 0.5); // 0.5 - koeficient interpolácie
        }
      }
    }
  };

  horizontalMoveCameraLocal = (joystickX, joystickY, movementSpeed) => {
    if (!this.#cameraRig || !this.#camera) return;
    let joystickVector = new THREE.Vector2(joystickX, joystickY);
    let elementRotation = this.#camera.object3D.rotation.y;
    joystickVector.rotateAround(new THREE.Vector3(0, 0), -elementRotation);
    joystickVector.normalize();
    joystickVector.multiplyScalar(movementSpeed);
    this.#cameraRig.object3D.position["x"] += joystickVector.x;
    this.#cameraRig.object3D.position["z"] += joystickVector.y;
  };

  getCamera () {
    return this.#camera;
  }
}

export const getCameraService = () => {
  if (!cameraService) cameraService = new CameraService();
  return cameraService;
};
