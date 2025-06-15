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
import histoSparse2 from "../public/histograms/THnSparse3.json"
import nestedHisto from "../public/histograms/hist3D.axis1-pt_axis2-ce_axis5-eta.json"
import {parse} from "jsroot";

initNdmvrAframe();

const sceneElm = generate_AFrame_blank_scene_html();
let toggleHisto = false;


document.querySelector("#app").appendChild(sceneElm);

// const geom = new THREE.BoxGeometry(1, 5, 1);
// const mate = new THREE.MeshNormalMaterial();
// const cube = new THREE.Mesh(geom, mate);
// cube.position.set(4,5,6);
// sceneElm.object3D.add(cube)

const histogramContainer = document.createElement('a-entity');
histogramContainer.id = "histogram1";
histogramContainer.setAttribute('nested-histogram', '');
histogramContainer.setAttribute('position', "0 5 0");
sceneElm.appendChild(histogramContainer);

// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histoWithOutsideContent)});
// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histoSparse)});
histogramSubjectGet().next({id: 'histogram1', histogram: parse(nestedHisto)});
// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histo6x2x1)});
// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histo4x3x1)});
// stdBin();

let showHistogramToggle = false;

// window.addEventListener('click', () => {
//    if (showHistogramToggle){
//       document.querySelector('[histogram]').components.histogram.hideAllChildHistograms();
//    } else {
//       document.querySelector('[histogram]').components.histogram.showAllChildHistograms();
//    }
//    showHistogramToggle = !showHistogramToggle;
// })

// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set1')
// }, 1000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set3')
// }, 2000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set2')
// }, 3000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set1')
// }, 4000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set3')
// }, 5000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set2')
// }, 6000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set1')
// }, 7000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set3')
// }, 8000);
//
// setTimeout(() => {
//    document.querySelector('[histogram]').components.histogram.renderMappingHistogram('set2')
// }, 9000);


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
         // console.log(event)
         const position = event.detail.getBinPosition();

         // if(event.detail.phase === 'start') {
         //    event.srcElement.components['histogram'].showChildHistogram(position.x, position.y, position.z);
         // } else {
         // event.srcElement.components['histogram'].hideChildHistogram(position.x, position.y, position.z);
         // }

         if (event.detail.phase === 'end') return;
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
         // console.log('bin content: ', event.detail.getBinContent());
         // console.log('bin position: ', event.detail.getBinPosition());
         const position = event.detail.getBinPosition();
         // console.log(position);

         if (event.detail.shiftKey) {
            console.log('shift')
            event.srcElement.components['histogram'].hideChildHistogram(position.x, position.y, position.z);
         } else {
            event.srcElement.components['histogram'].showChildHistogram(position.x, position.y, position.z);
         }

         // if (toggleHisto) {
         //    console.log('hide')
         //    document.querySelector('[histogram]').components.histogram.hideAllChildHistograms();
         // } else {
         //    document.querySelector('[histogram]').components.histogram.showAllChildHistograms();
         // }
         // toggleHisto = !toggleHisto;

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

// setTimeout(() => functionSubjectGet().addFunctions(functions), 100);