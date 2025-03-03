import registerHistogramComponent from "/src/component/histogram-component";
import registerVRModeDetector from "../component/device-detector-component.js";

import {stateSubjectGet} from "../rxjs/StateSubject.js";
import registerHistogramSKorComponent from "../component/histogram-skor-component.js";
import registerBinComponent from "../component/bin.component.js";
import registerPseudoHistogramComponent from "../component/pseudo-histogram-component.js";
import {
   registerInstancedMeshComponent,
   registerInstancedMeshMemberComponent
} from "../component/external/instanced-mesh-component.js";

export const registerComponents = () => {
   //by D.Chovanec:
   registerHistogramComponent();
   registerVRModeDetector(stateSubjectGet().next.bind(stateSubjectGet()));
   //by S.Korecko:
   registerHistogramSKorComponent();
   registerBinComponent();
   registerPseudoHistogramComponent();
   registerInstancedMeshComponent();
   registerInstancedMeshMemberComponent();
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