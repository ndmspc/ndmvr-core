// service to manage camera
/** @module CameraService */

import {isObjectEmpty, useNdmVrRedirect} from "@ndmspc/react-ndmspc-core";

/**
 * Servis pre ovládanie a manipuláciu pozície kamery.
 * @class
 */
export class CameraService {
   #cameraRig
   #camera

   constructor() {
      this.#cameraRig = document.getElementById('cameraRig')
      this.#camera = document.getElementById('camera')
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
         this.#cameraRig = document.getElementById('cameraRig')
      if (this.#cameraRig !== null) {
         const targetPosition = new THREE.Vector3()
         const currentPosition = this.#cameraRig.object3D.position.clone() // naklonuj aktuálnu pozíciu

         if (moveUp) {
            targetPosition.copy(currentPosition).add(new THREE.Vector3(0, +speed, 0)) // nastav cieľovú pozíciu o `speed` jednotiek vyššie
            this.#cameraRig.object3D.position.lerp(targetPosition, 0.5) // 0.5 - koeficient interpolácie
         } else {
            if (this.#cameraRig.object3D.position.y > 3){
               targetPosition.copy(currentPosition).add(new THREE.Vector3(0, -speed, 0)) // nastav cieľovú pozíciu o `speed` jednotiek nižšie
               this.#cameraRig.object3D.position.lerp(targetPosition, 0.5) // 0.5 - koeficient interpolácie
            }
         }
      }
   }

   getCamera(){
      return this.#camera;
   }



}
