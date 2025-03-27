

/**
 * --------------------NOTE--------------------
 * You can remove whole content of this file, as it serves as demo page.
 * Below code is only for displaying varying functionalities that we provide.
 * If you remove content of this page, you will still have core ndmvr-aFrame scene initialized,
 * without any additional functionalities.
 * Main initialization provides ndmvr-aframe-core.js.
 * --------------------NOTE--------------------
 * */

import {generate_AFrame_rand_hist_scene_html} from "./utils/htmlGenerators.js";
import {functionSubjectGet} from "./rxjs/FunctionSubject.js";

const sceneElm = generate_AFrame_rand_hist_scene_html();

if (sceneElm) {
   document.querySelector("#app").appendChild(sceneElm);
}

const functions = [
   {
      event: 'instance-hover',
      target: {
         entity: 'histogram-skor',
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
      }
   },
   {
      event: 'instance-click',
      target: {
         entity: 'histogram-skor',
         id: '*'
      },
      function: function (event) {
         const instancedMesh = event.detail.instancedMesh;
         const instanceId = event.detail.instanceId;
         const histogram = instancedMesh.parent.el.components['histogram-skor'];
         const pos = histogram.computePositionFromIndex(instanceId);

         console.log(pos);
         console.log(histogram.rootObj.fArray.at(instanceId));
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