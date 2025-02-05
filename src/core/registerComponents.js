import registerHistogramComponent from "/src/component/histogram-component";
import registerVRModeDetector from "../component/device-detector-component.js";
import stateSubjectGet from "../rxjs/StateSubject.js";

export const registerComponents = () => {
   registerHistogramComponent();
   registerVRModeDetector(stateSubjectGet().next.bind(stateSubjectGet()));
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