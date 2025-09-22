import { Joystick } from "../controllers/mobile/joystick.js";
import { getCameraService } from "../service/cameraService.js";

/**
 * Registers custom component that handles movement on mobile device via virtual joystick
 * Has tick function that moves camera based on state of virtual joystick.
 * */
export default function registerScreenControlsComponent () {
  if (AFRAME.components["screen-controls"]) return;
  AFRAME.registerComponent("screen-controls",
    {
      init: function () {
        this.cameraService = getCameraService();
        this.joystick1 = new Joystick("stick1", 64, 8);
      },

      tick: function (time, deltaTime) {
        if (this.joystick1.value) {
          this.cameraService.horizontalMoveCameraLocal(this.joystick1.value.x, this.joystick1.value.y, 0.3);
        }
      }
    });
}

