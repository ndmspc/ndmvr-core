import registerHistogramComponent from "/src/component/histogram-component";
import registerVRModeDetector from "../component/device-detector-component.js";

import {stateSubjectGet} from "../rxjs/StateSubject.js";
import registerHistogramSKorComponent from "../component/histogram-skor-component.js";
import registerPseudoHistogramComponent from "../component/pseudo-histogram-component.js";
import registerScreenControlsComponent from "../component/screen-controls-component.js";
import registerOculusController from "../controllers/oculus/oculusController.js";
import registerLeftControllerLogging from "../controllers/oculus/leftOculusController.js";
import registerRightControllerLogging from "../controllers/oculus/rightOculusController.js";
import registerThumbstickOculusController from "../controllers/oculus/thumbstickOculusController.js";
import registerNdmvrRaycasterComponent from "../component/ndmvr-raycaster-component.js";
import registerDesktopController from "../controllers/desktop/wasdControlsCustom.js";

export const registerComponents = () => {
   //by D.Chovanec:
   registerHistogramComponent();
   registerScreenControlsComponent();
   registerVRModeDetector(stateSubjectGet().next.bind(stateSubjectGet()));
   registerOculusController();
   registerLeftControllerLogging();
   registerRightControllerLogging();
   registerThumbstickOculusController();
   registerNdmvrRaycasterComponent();
   registerDesktopController();
   //by S.Korecko:
   registerHistogramSKorComponent();
   registerPseudoHistogramComponent();
}

export const fullAframeScene = () => {
   const scene = document.createElement('a-scene');
   scene.id = "a-scene";
   scene.setAttribute('cursor', 'rayOrigin: mouse');
   scene.setAttribute('device-detector', null);
   scene.innerHTML = `
        <a-entity histogram></a-entity>
        <a-sky color="#ECECEC"></a-sky>
    `;
   return scene;
}