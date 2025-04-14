/**
 * --------------------NOTE--------------------
 * You can remove whole content of this file, as it serves as demo page.
 * Below code is only for displaying varying functionalities that we provide.
 * If you remove content of this page, you will still have core ndmvr-aFrame scene initialized,
 * without any additional functionalities.
 * Main initialization provides ndmvr-aframe-core.js.
 * --------------------NOTE--------------------
 * */

import {generate_AFrame_blank_scene_html} from "./utils/htmlGenerators.js";
import {functionSubjectGet} from "./rxjs/FunctionSubject.js";
import {initNdmvrAframe} from "./core/ndmvr-aframe-core.js";
import histogramRecursive from "../public/histograms/THrecursive.json";
import histogram2x2x3 from "../public/histograms/TH3variableBinning2x2x3OnlyInsideContent.json";
import {histogramSubjectGet} from "./rxjs/HistogramSubject.js";
import {parse} from "jsroot";

initNdmvrAframe();

const sceneElm = generate_AFrame_blank_scene_html();


document.querySelector("#app").appendChild(sceneElm);

const histogram = document.createElement('a-entity');
histogram.id = "histogram1";
histogram.setAttribute('histogram', '');
histogram.setAttribute('position', "0 0 0");
sceneElm.appendChild(histogram);

stdBin();

function stdBin() {
   histogramSubjectGet().next({id: 'histogram1', histogram: parse(histogram2x2x3)});
   setTimeout(() => histoBin(), 5000);
}

function histoBin() {
   histogramSubjectGet().next({id: 'histogram1', histogram: parse(histogramRecursive)});
   setTimeout(() => stdBin(), 5000);
}



const functions = [
   {
      event: 'instance-hover',
      target: {
         entity: 'histogram',
         id: '*'
      },
      function: function (event) {
         const instancedMesh = event.detail.instancedMesh;
         const instanceId = event.detail.instanceId;

         let color = new THREE.Color();
         instancedMesh.getColorAt(instanceId, color);
         color.setHex(Math.random() * 0xffffff);
         instancedMesh.setColorAt(instanceId, color);
         instancedMesh.instanceColor.needsUpdate = true;

         // console.log('bin content: ', event.detail.getBinContent());
         // console.log('bin position: ', event.detail.getBinPosition());
      }
   },
   {
      event: 'instance-click',
      target: {
         entity: 'histogram',
         id: '*'
      },
      function: function (event) {
         console.log('bin content: ', event.detail.getBinContent());
         console.log('bin position: ', event.detail.getBinPosition());
         // const instancedMesh = event.detail.instancedMesh;
         // console.log(instancedMesh);
         // const instanceId = event.detail.instanceId;
         // const histogram = instancedMesh.parent.el.components['histogram'];
         // const pos = histogram.computePositionFromIndex(instanceId);
         //
         // console.log(pos);
         // console.log(histogram.rootObj.fArray.at(instanceId));
         // let dum = new THREE.Object3D();

         // instancedMesh.getMatrixAt(instanceId, dum.matrix);
         // dum.matrix.decompose(dum.position, dum.quaternion, dum.scale);
         // dum.scale.set(2,2,2);
         // dum.updateMatrix();
         // instancedMesh.setMatrixAt(instanceId, dum.matrix);
         // instancedMesh.instanceMatrix.needsUpdate = true;
      }
   }
];

setTimeout(() => functionSubjectGet().addFunctions(functions), 100);