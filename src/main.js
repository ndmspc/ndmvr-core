/**
 * --------------------NOTE--------------------
 * You can remove whole content of this file, as it serves as demo page.
 * Below code is only for displaying varying functionalities that we provide.
 * If you remove content of this page, you will still have core ndmvr-aFrame scene initialized,
 * without any additional functionalities.
 * Main initialization provides ndmvr-aframe-core.js.
 * --------------------NOTE--------------------
 * */

import { generate_AFrame_blank_scene_html } from "./utils/htmlGenerators.js";
import { functionSubjectGet } from "./rxjs/FunctionSubject.js";
import { initNdmvrAframe } from "./core/ndmvr-aframe-core.js";
// import histogramRecursive from "./assets/histograms/THrecursive.json";

import config from "./config-aframe.json";

import histo125 from "./assets/histograms/nested/test_125.json";
import histo12_5 from "./assets/histograms/nested/test_12_5.json";
// import rsn from "./assets/histograms/nested/rsn.json";
import histo1_25 from "./assets/histograms/nested/test_1_25.json";
import histo1_2_5 from "./assets/histograms/nested/test_1_2_5.json";
import histo5_2_1 from "./assets/histograms/nested/test_5_2_1.json";
import test3 from "./assets/histograms/nested/test3.json";
// import test3f from "./assets/histograms/nested/test3f.json";
import nav from "./assets/histograms/nested/nav.json";
import h3scat from "./assets/histograms/h3scat.json";
import labelH from "./assets/histograms/wLabel/label.json";

import test55x57x56 from "./assets/histograms/TH3variableBinning55x57x56.json";


import histogram2x2x3 from "./assets/histograms/TH3variableBinning2x2x3OnlyInsideContent.json";
import histo2x2x3 from "./assets/histograms/TH3variableBinning2x2x3WOutsideContent.json";
import histo6x2x1 from "./assets/histograms/TH3variable6x2x1wOutsideContent.json";
import test3D from "./assets/histograms/test3D.json";
import { histogramSubjectGet } from "./rxjs/HistogramSubject.js";
import nestedHisto from "./assets/histograms/hist3D.axis1-pt_axis2-ce_axis5-eta.json";
import nestedHisto2 from "./assets/histograms/hist2D.axis1-pt_axis2-ce.json";
import nestedHisto3 from "./assets/histograms/hist1D.axis1-pt.json";
import nestedHisto4 from "./assets/histograms/test3D.axis1-pt_axis2-ce_axis5-eta (1).json";
// import histoSparse5 from "../public/histograms/test3D.axis1-pt_axis2-ce_axis5-eta.root"
import { parse, redraw, makeSVG, openFile, makeImage } from "jsroot";
import { stateSubjectGet } from "./rxjs/StateSubject.js";
import { configSubjectGet } from "./rxjs/ConfigSubject.js";
import { binInfoSubjectGet } from "./rxjs/BinInfoSubject.js";
import {registerComponents} from "./core/registerComponents.js";
import {Vector3} from "three";

initNdmvrAframe();
registerComponents();

const sceneElm = generate_AFrame_blank_scene_html();

document.querySelector("#app").appendChild(sceneElm);


// cube.position.set(0, 0, -5);
// sceneElm.object3D.add(cube);


// const geom = new THREE.BoxGeometry(0.2, 10, 2);
// const mate = new THREE.MeshNormalMaterial();
// const cube = new THREE.Mesh(geom, mate);
// cube.position.set(0.1, 5, -7);
// sceneElm.object3D.add(cube);

// const geom2 = new THREE.BoxGeometry(10, 2.333333333, 10);
// const mate2 = new THREE.MeshPhongMaterial();
// const cube2 = new THREE.Mesh(geom2, mate2);
// cube2.position.set(2, 1.3333333333, 0);
// sceneElm.object3D.add(cube2)

const imageContainer = document.createElement("a-entity");
const imageContainer2 = document.createElement("a-entity");
imageContainer.id = "histogram1-cinema";
imageContainer2.id = "histogram2-cinema";
imageContainer.setAttribute("canvas-component", "");
imageContainer2.setAttribute("canvas-component", "");
// imageContainer.setAttribute("position", "0 4 -6");
// imageContainer.setAttribute("rotation", "0 4 -6");
// imageContainer.setAttribute("scale", "10 10 10");

sceneElm.appendChild(imageContainer);
sceneElm.appendChild(imageContainer2);



// const instGeomContainer = document.createElement("a-entity");
// instGeomContainer.setAttribute("inst-geom-hist", "");
// instGeomContainer.setAttribute("position", "0 0 0");
//
// sceneElm.appendChild(instGeomContainer);

// setTimeout(() =>{
//   const s = document.getElementById("a-min-scene");
//   const r = s.getAttribute("renderer");
//   console.log(s.renderer.info.render);
// }, 4000);
//
// setTimeout(() =>{
//   const s = document.getElementById("a-min-scene");
//   const r = s.getAttribute("renderer");
//   console.log(s.renderer.info.render);
// }, 9000);
//
// setTimeout(() =>{
//   const s = document.getElementById("a-min-scene");
//   const r = s.getAttribute("renderer");
//   console.log(s.renderer.info.render);
// }, 13000);


const histogramContainer = document.createElement("a-entity");
histogramContainer.id = "histogram1";
histogramContainer.setAttribute("thnpainter", "");
histogramContainer.setAttribute("position", "0 0 0");
sceneElm.appendChild(histogramContainer);

const histogramContainer2 = document.createElement("a-entity");
histogramContainer2.id = "histogram2";
histogramContainer2.setAttribute("histogram", "");
histogramContainer2.setAttribute("position", "0 0 0");
sceneElm.appendChild(histogramContainer2);

const histogramContainer3 = document.createElement("a-entity");
histogramContainer3.id = "histogram3";
histogramContainer3.setAttribute("histogram", "");
histogramContainer3.setAttribute("position", "0 0 0");
sceneElm.appendChild(histogramContainer3);

const histogramContainer4 = document.createElement("a-entity");
histogramContainer4.id = "histogram4";
histogramContainer4.setAttribute("histogram", "");
histogramContainer4.setAttribute("position", "0 0 0");
sceneElm.appendChild(histogramContainer4);

const options = new Map();
options.set("h3scat", h3scat);
options.set("test6x2x1", histo6x2x1);
options.set("histo125", histo125);
options.set("histo12_5", histo12_5);
options.set("histo1_25", histo1_25);
options.set("histo1_2_5", histo1_2_5);
options.set("histo5_2_1", histo5_2_1);

const selectDiv = document.createElement("div");
selectDiv.innerHTML = `
  <div style="position: absolute; top: 50px; right: 50px;">
    <select name="histograms" id="histogram-select">
      <option value="h3scat">h3scat</option>
      <option value="test6x2x1">text6x2x1</option>
      <option value="histo125">histo125</option>
      <option value="histo12_5">histo12_5</option>
      <option value="histo1_25">histo1_25</option>
      <option value="histo1_2_5">histo1_2_5</option>
      <option value="histo5_2_1">histo5_2_1</option>
      <option value="custom">Set to URL</option>
    </select>
    <input type="text" id="custom-url-input" value="https://eos.ndmspc.io/eos/ndmspc/scratch/ndmspc/ndmvr-aframe/demo/rsn.json" placeholder="Enter custom URL" style="display: none; margin-top: 5px; width: 200px;" />
    <button id="load-custom-url" style="display: none; margin-top: 5px;">Load</button>
  </div>
`;

document.querySelector("#app").appendChild(selectDiv);

const histogramSelect = document.getElementById("histogram-select");
const urlInput = document.getElementById("custom-url-input");
const loadButton = document.getElementById("load-custom-url");

histogramSelect.addEventListener("change", (event) => {
  const selectedValue = event.target.value;
  if (selectedValue === "custom") {
    urlInput.style.display = "inline-block";
    loadButton.style.display = "inline-block";
  } else {
    urlInput.style.display = "none";
    loadButton.style.display = "none";
    histogramSubjectGet().next({
      id: "histogram1",
      opts: { render: "ndmvr" },
      obj: options.get(selectedValue),
      config: {
        TH1ZScale: {
          default: 0.8,
          layer: [0.08, 1, 1, 1],
          set: 0.1,
        },
        color: {
          default: {
            min: "0x0033ff",
            max: "0xff3300",
          },
        }
      }
    });
  }
});

const setDiv = document.createElement("div");
setDiv.innerHTML = `
  <div style="position: absolute; top: 110px; right: 50px;">
    <div id="set-checkboxes"></div>
  </div>
`;
document.querySelector("#app").appendChild(setDiv);

const checkboxContainer = document.getElementById("set-checkboxes");

const arrayDiv = document.createElement("div");
arrayDiv.innerHTML = `
<div style="position: absolute; top: 80px; right: 50px;">
  <select id="arraySelect" aria-label="Dynamic options">
    <option value="content">content</option>
  </select>
</div>
`;
document.querySelector("#app").appendChild(arrayDiv);
const arraySelect = document.getElementById("arraySelect");

stateSubjectGet("histogram1")
  .getObservable()
  .subscribe((state) => {
    const newOptions = state.sets || [];

    // Clear previous checkboxes
    checkboxContainer.innerHTML = "";

    newOptions.forEach((value) => {
      const label = document.createElement("label");
      label.style.display = "block"; // stack them vertically

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = value;

      // Check if this one should be selected
      if (Array.isArray(state.selectedSet)) {
        // If selectedSet is multiple
        checkbox.checked = state.selectedSet.includes(value);
      } else {
        // If selectedSet is single
        checkbox.checked = state.selectedSet === value;
      }

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + value));
      checkboxContainer.appendChild(label);
    });

    const arrayOptions = state.arrays || [];
    arraySelect.innerHTML = "";

    arrayOptions.forEach((value) => {
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = value;
      ph.value = value;
      if (value === state.selectedArray) ph.selected = true;
      // ph.selected = selectedValue === null; // selected if no selectedValue provided
      arraySelect.appendChild(ph);
    });
  });

arraySelect.addEventListener("change", (event) => {
  // console.log(event);
  console.log(arraySelect.value);
  const currentValue = stateSubjectGet("histogram1").getValue();
  currentValue.selectedArray = arraySelect.value;
  stateSubjectGet("histogram1").next(currentValue);
});

checkboxContainer.addEventListener("change", (event) => {
  if (event.target.type === "checkbox") {
    const currentValue = stateSubjectGet("histogram1").getValue();

    // Collect all checked values
    const checkedValues = Array.from(
      checkboxContainer.querySelectorAll("input[type='checkbox']:checked"),
    ).map((cb) => cb.value);

    // Only update if something changed
    if (
      JSON.stringify(currentValue.selectedSet) !== JSON.stringify(checkedValues)
    ) {
      currentValue.selectedSet = checkedValues;
      stateSubjectGet("histogram1").next(currentValue);
    }
  }
});

loadButton.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    alert("Please enter a valid URL.");
    return;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    // if (!response.ok) throw new Error("Network response was not ok");
    // delete data.children;

    histogramSubjectGet().next({
      id: "histogram1",
      opts: { render: "ndmvr" },
      obj: data,
    });
  } catch (error) {
    console.error("Failed to load histogram from URL:", error);
    alert("Failed to load histogram from the specified URL.");
  }
});

// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histoSparse)});

// histogramSubjectGet().next({id: 'histogram1', histogram: nestedHisto});

// histogramSubjectGet().next({id: 'histogram1', histogram: 'https://eos.ndmspc.io//eos/ndmspc/scratch/ndmspc/ndmvr-aframe/demo/hist3D.axis1-pt_axis2-ce_axis5-eta.root'});
// histogramSubjectGet().next({id: 'histogram1', histogram: parse(nestedHisto4)});

// histogramSubjectGet().next({id: 'histogram1', histogram: test3D});
// histogramSubjectGet().next({id: 'histogram1', histogram: histo1_2_5});
// histogramSubjectGet().next({id: 'histogram1', histogram: test55x57x56});

// const commands = [
//   () => histogramSubjectGet().next({ id: 'histogram1', histogram: h3scat }),
//   () => histogramSubjectGet().next({ id: 'histogram1', histogram: histo1_2_5 }),
//   () => histogramSubjectGet().next({ id: 'histogram1', histogram: histo12_5 })
// ];
//
// // Rotation interval in milliseconds
// const interval = 10; // change to your desired "n" milliseconds
//
// let index = 0;
//
// setInterval(() => {
//   commands[index](); // run current command
//   index = (index + 1) % commands.length; // move to next (loop back to start)
// }, interval);

// histogramSubjectGet().next({id: 'histogram1-jsroot', histogram: histo2x2x3});

// histogramSubjectGet().next({id: "histogram1", opts: {render: "jsroot"}, histogram: h3scat});
// histogramSubjectGet().next({
//   id: "histogram1",
//   opts: {
//     render: "ndmvr",
//     config: {
//       TH1ZScale: {
//         default: 0.8,
//         layer: [0.08, 1, 1, 1],
//         set: 0.1,
//       },
//       color: {
//         default: {
//           min: "0x0066ff",
//           max: "0xff6600",
//         },
//       },
//       // wireframe: {
//       //   display: {
//       //     start: 1
//       //   }
//       // }
//     }
//
//   },
//   histogram: histo125,
// });

// histogramSubjectGet().next({ id: "histogram1", opts: { render: "jsroot" }, obj: h3scat });
//

histogramSubjectGet().next({id: "histogram1", opts: {render: "ndmvr"}, obj: test3});
// histogramSubjectGet().next({id: 'histogram4', opts: {render: "nested"}, histogram: h3scat});
// histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
//


// setTimeout(()=> {
//   histogramSubjectGet().next({id: "histogram1", opts: {render: "ndmvr"}, obj: h3scat});
//
// //     histogramSubjectGet().next({id: "histogram1", opts: {render: "ndmvr"}, obj: testmv});
// }, 10000);
// setTimeout(()=> {
//     histogramSubjectGet().next({id: "histogram1", opts: {render: "jsroot"}, obj: h3scat});
// }, 6000);
// setTimeout(()=> {
//     histogramSubjectGet().next({id: "histogram1", opts: {render: "nested"}, obj: testmv});
// }, 8000);
// setTimeout(()=> {
//   histogramSubjectGet().next({id: "histogram1", opts: {render: "jsroot"}, obj: h3scat});
// }, 10000);
// setTimeout(()=> {
//   histogramSubjectGet().next({id: "histogram1", opts: {render: "nested"}, obj: testmv});
// }, 12000);


// histogramSubjectGet().next({id: 'histogram1', histogram: histo125});
// histogramSubjectGet().next({id: 'histogram1', histogram: histo12_5});

// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histo4x3x1)});

configSubjectGet().next(config);
//
// setTimeout(() => {
//   const v = stateSubjectGet("histogram1").getValue();
//   v.minMaxValue[1]["ComBg"].value.max  = 50000;
//   stateSubjectGet("histogram1").next(v);
// }, 5000);

// let conf;
//
// configSubjectGet().getObservable().subscribe((config) => {
//   conf = config;
// });
//
// setTimeout(() => {
//   conf.config.environment.histogramPads[0].scale = new Vector3(15, 15, 15);
//   configSubjectGet().next(conf);
// }, 5000);
//
binInfoSubjectGet()
  .getObservable()
  .subscribe((event) => {
    console.log(event);
  });

// const tools = {
//   empty: [{
//     target: {
//       entity: "nested-histogram",
//       id: "histogram1"
//     }
//   }],
//   first: [{
//     target: {
//       entity: "nested-histogram",
//       id: "histogram1"
//     }, event: "mousemove"
//   }, {
//     target: {
//       entity: "nested-histogram",
//       id: "histogram1"
//     }, event: "mouseclick",
//     function: function (event, context) {
//       console.log("custom function from set functions: ", event, context);
//     }
//   }]
// };
//
// setTimeout(() => {
//   functionSubjectGet().setFunctions(tools.empty);
// }, 2000);
//
// setTimeout(() => {
//   functionSubjectGet().setFunctions(tools.first);
// }, 5000);

// setTimeout(() => {
//   dispatchSubjectGet().next({
//     target: {
//       name: "nested-histogram",
//       id: "histogram1"
//     },
//     event: {
//       source: "mousedbclick",
//       index: [{ x: 1, y: 1, z: 2 }],
//       set: "unlikepm"
//     }
//   });
// }, 5000);
// //
// setTimeout(() => {
//   dispatchSubjectGet().next({
//     target: {
//       name: "nested-histogram",
//       id: "histogram1"
//     },
//     event: {
//       source: "shiftmousedbclick",
//       // index: [{ x: 1, y: 1, z: 2 }, { x: 23, y: 1, z: 1 }],
//       index: [{ x: 23, y: 1, z: 1 }],
//       set: "unlikepm"
//     }
//   });
// }, 6000);

// setTimeout(() => {
//REMOVE ALL FUNCTIONS
// functionSubjectGet().removeFunctions({
//   target: {
//     entity: "nested-histogram",
//     id: "*"
//   }
// });

// REMOVE ALL FUNCTIONS ON EVENT
// functionSubjectGet().removeFunctions({
//   event: "mousemove",
//   target: {
//     entity: "nested-histogram",
//     id: "*"
//   }
// });

//ADD DEFAULT FUNCTION
// functionSubjectGet().addFunctions({
//   event: "mousemove",
//   target: {
//     entity: "nested-histogram",
//     id: "*"
//   },
// });

//ADD CUSTOM FUNCTION
//   functionSubjectGet().addFunctions({
//     event: "mouseclick",
//     target: {
//       entity: "nested-histogram",
//       id: "*"
//     },
//     function: function (event, context) {
//       console.log("my-custom-function: ", event);
//     }
//   });
// }, 3000);

// const functions = [
//     {
//         event: 'mouseclick',
//         target: {
//             entity: 'nested-histogram',
//             id: '*'
//         },
//         function: function (event, context) {
//             console.log(event)
//             console.log('index: ', context.computeIndexFromPosition(event.index))
//             console.log('jsrootIndex: ', context.computeJsRootIndexFromPosition(event.index))
//             const histo = context.getChildByPosition(context.pointer.origin, [...event.index], event.set);
//             console.log(histo);
//             context.showChildHistogram(event.index);
//             canvasSubjectGet().next({
//                 id: context.id + '-cinema',
//                 obj: histo
//             });
//         }
//     },
//     {
//         event: 'shiftmouseclick',
//         target: {
//             entity: 'nested-histogram',
//             id: '*'
//         },
//         function: function (event, context) {
//             context.hideChildHistogram(event.index);
//         }
//     },
//     {
//         event: 'mousedbclick',
//         target: {
//             entity: 'nested-histogram',
//             id: '*'
//         },
//         function: function (event, context) {
//             // console.log('index: ', context.computeJsRootIndexFromPosition(event))
//             context.setPointerToChild(context.computeJsRootIndexFromPosition(event.index), 'unlikepm');
//         }
//     },
//     {
//         event: 'shiftmousedbclick',
//         target: {
//             entity: 'nested-histogram',
//             id: '*'
//         },
//         function: function (event, context) {
//             // console.log(event)
//             // console.log('shiftmousedbclick');
//             context.setPointerToParent();
//         }
//     },
//     {
//         event: 'mousemove',
//         target: {
//             entity: 'nested-histogram',
//             id: '*'
//         },
//         function: function (event, context) {
//             console.log('mousemove: ', event);
//             // this.showChildHistogram(event)
//         }
//     }
// ];

// setTimeout(() => functionSubjectGet().addFunctions(functions), 100);
