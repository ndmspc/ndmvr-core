import "aframe";
import functionSubjectGet from "./rxjs/FunctionSubject.js";
import dispatchSubjectGet from "./rxjs/DispatchSubject.js";
import brokerManagerGet from "./service/brokerManager.js";
import {fullAframeScene} from "./core/registerComponents.js";

/**
 * --------------------NOTE--------------------
 * You can remove whole content of this file, as it serves as demo page.
 * Below code is only for displaying varying functionalities that we provide.
 * If you remove content of this page, you will still have core ndmvr-aFrame scene initialized,
 * without any additional functionalities.
 * Main initialization provides ndmvr-aframe-core.js.
 * --------------------NOTE--------------------
 * */

document.querySelector("#app").appendChild(fullAframeScene());


const functions = [
   {
      event: 'click',
      target: {
         entity: 'histogram',
         id: [1]
      },
      function: function (data) {
         data.srcElement.setAttribute('color', getRandomColor());
      }
      // function: function (data) {
      //    brokerManagerGet().getBrokerByUrl('ws://localhost:8080', false)
      //       .send(JSON.stringify({id: data.srcElement.parentNode.components.histogram.data.id}))
      //    console.log(data.srcElement.parentNode.components.histogram.data.id)
      // }
   }
   , {
      event: 'mouseenter',
      target: {
         entity: 'histogram',
         id: '*'
      },
      function: function (data) {
         console.log(data.target.object3D.id);
      }
   }, {
      event: 'custom-event',
      target: {
         entity: 'histogram',
         id: '*'
      },
      function: function (data) {
         console.log('custom event triggered', data);
      }
   }
]

setTimeout(() => functionSubjectGet().addFunctions(functions), 100);
// setTimeout(() => {
//    functions[0].target.id = ['1','2'];
//    functionSubjectGet().addFunctions(functions);
// }, 300);

const functions2 = [
   {
      event: 'click',
      target: {
         entity: 'histogram',
         id: [1, 2]
      },
      function: function (data) {
         const scale = data.target.object3D.scale;
         if (scale.x > 3) {
            scale.x = 1;
            scale.y = 1;
            scale.z = 1;
         }
         data.target.object3D.scale.set(scale.x * 1.1, scale.y * 1.1, scale.z * 1.1);
      }
   }, {
      event: 'mouseenter',
      target: {
         entity: 'histogram',
         id: '*'
      },
      function: function (data) {
         console.log(data);
      }
   }
]

const customEvent = {
   target: 'histogram',
   event: new Event('custom-event'),
   data: {'args': 'hello custom events'}
}
setTimeout(() => dispatchSubjectGet().dispatch(customEvent), 1000);


setTimeout(() => {
   functionSubjectGet().removeFunctions(functions);
}, 2000);
setTimeout(() => functionSubjectGet().addFunctions(functions2), 2000);
setTimeout(() => document.querySelector("a-entity").remove(), 2500);
setTimeout(() => addHistogram(), 3000);
setTimeout(() => brokerManagerGet().disconnectWsByUrl("ws://localhost:8080"), 8000);

function addHistogram() {
   const scene = document.querySelector('a-scene');
   console.log(scene);
   const histogram = document.createElement('a-entity')

   histogram.innerHTML = `
    <a-entity histogram></a-entity>`;
   console.log(histogram instanceof Element)
   scene.appendChild(histogram);
}


function getRandomColor() {
   const letters = '0123456789ABCDEF';
   let color = '#';
   for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
   }
   return color;
}
