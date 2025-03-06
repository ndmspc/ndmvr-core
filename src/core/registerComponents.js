import registerHistogramComponent from "/src/component/histogram-component";
import registerVRModeDetector from "../component/device-detector-component.js";

import {stateSubjectGet} from "../rxjs/StateSubject.js";
import registerHistogramSKorComponent from "../component/histogram-skor-component.js";
import registerPseudoHistogramComponent from "../component/pseudo-histogram-component.js";

export const registerComponents = () => {
   //by D.Chovanec:
   registerHistogramComponent();
   registerVRModeDetector(stateSubjectGet().next.bind(stateSubjectGet()));
   //by S.Korecko:
   registerHistogramSKorComponent();
   registerPseudoHistogramComponent();
}

export const fullAframeScene = () => {
   const scene = document.createElement('a-scene');
   scene.id = "a-scene";
   scene.setAttribute('cursor', 'rayOrigin: mouse');
   scene.setAttribute('vr-mode-detector', null);
   scene.innerHTML = `
        <a-entity histogram></a-entity>
        <a-sky color="#ECECEC"></a-sky>
    `;
   return scene;
}