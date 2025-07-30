import registerVRModeDetector from "../component/device-detector-component.js";

import {stateSubjectGet} from "../rxjs/StateSubject.js";
import registerPseudoHistogramComponent from "../component/pseudo-histogram-component.js";
import registerScreenControlsComponent from "../component/screen-controls-component.js";
import registerOculusController from "../controllers/oculus/oculusController.js";
import registerLeftControllerLogging from "../controllers/oculus/leftOculusController.js";
import registerRightControllerLogging from "../controllers/oculus/rightOculusController.js";
import registerThumbstickOculusController from "../controllers/oculus/thumbstickOculusController.js";
import registerNdmvrRaycasterComponent from "../component/ndmvr-raycaster-component.js";
import registerDesktopController from "../controllers/desktop/wasdControlsCustom.js";
import registerHistogramComponent from "../component/histogram-component.js";
import registerHistogramBorderComponent from "../component/histogram-border-component.js";
import registerNestedHistogramComponent from "../component/nested-histogram-component.js";

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
   registerHistogramBorderComponent();
   registerNestedHistogramComponent();
   //by S.Korecko:
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