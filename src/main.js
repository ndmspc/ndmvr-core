import 'aframe';
import registerHistogramComponent from "./component/histogram-component.js";
import initJsroot from "./jsroot/jsroot.js";

initJsroot();
registerHistogramComponent();

document.querySelector('#app').innerHTML= `
<a-scene id="a-scene">
    <a-entity histogram></a-entity>
    <a-sky color="#ECECEC"></a-sky>
</a-scene>
`;

setTimeout(() => document.querySelector("a-entity").remove(),3000);
