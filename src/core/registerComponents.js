import registerVRModeDetector from "../component/device-detector-component.js";

import { inputDeviceSubjectGet } from "../rxjs/InputDeviceSubject.js";
import registerScreenControlsComponent from "../component/screen-controls-component.js";
import registerOculusController from "../controllers/oculus/oculusController.js";
import registerLeftControllerLogging from "../controllers/oculus/leftOculusController.js";
import registerRightControllerLogging from "../controllers/oculus/rightOculusController.js";
import registerThumbstickOculusController from "../controllers/oculus/thumbstickOculusController.js";
import registerNdmvrRaycasterComponent from "../component/ndmvr-raycaster-component.js";
import registerDesktopController from "../controllers/desktop/wasdControlsCustom.js";
import registerCanvasComponent from "../component/canvas-component.js";
import registerHistogramJsrootComponent from "../component/histogram-jsroot-component.js";
import registerBinInfoJsrootComponent from "../component/bininfo-jsroot-component.js";
import registerTHnPainterComponent from "../component/THnPainter-component.js";

export const registerComponents = () => {
  registerScreenControlsComponent();
  registerVRModeDetector(inputDeviceSubjectGet().next.bind(inputDeviceSubjectGet()));
  registerOculusController();
  registerLeftControllerLogging();
  registerRightControllerLogging();
  registerThumbstickOculusController();
  registerNdmvrRaycasterComponent();
  registerDesktopController();
  registerCanvasComponent();
  registerHistogramJsrootComponent();
  registerBinInfoJsrootComponent();
  registerTHnPainterComponent();
};