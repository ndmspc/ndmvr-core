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

import histo125 from "../public/histograms/nested/test_125.json";
import histo12_5 from "../public/histograms/nested/test_12_5.json";
import histo1_25 from "../public/histograms/nested/test_1_25.json";
import histo1_2_5 from "../public/histograms/nested/test_1_2_5.json";
import histo5_2_1 from "../public/histograms/nested/test_5_2_1.json";

import histogram2x2x3 from "../public/histograms/TH3variableBinning2x2x3OnlyInsideContent.json";
import histo6x2x1 from "../public/histograms/TH3variableBinning2x2x3WOutsideContent.json";
import {histogramSubjectGet} from "./rxjs/HistogramSubject.js";
import histoSparse2 from "../public/histograms/THnSparse3.json"
import nestedHisto from "../public/histograms/hist3D.axis1-pt_axis2-ce_axis5-eta.json"
import nestedHisto2 from "../public/histograms/hist2D.axis1-pt_axis2-ce.json"
import nestedHisto3 from "../public/histograms/hist1D.axis1-pt.json"
import nestedHisto4 from "../public/histograms/test3D.axis1-pt_axis2-ce_axis5-eta (1).json"
// import histoSparse5 from "../public/histograms/test3D.axis1-pt_axis2-ce_axis5-eta.root"
import {parse, redraw, makeSVG, openFile, makeImage} from "jsroot";
import {stateSubjectGet} from "./rxjs/StateSubject.js";
import {filter} from "rxjs";
import {NestedHistogram} from "./component/nested-histogram-class.js";

initNdmvrAframe();

const sceneElm = generate_AFrame_blank_scene_html();


document.querySelector("#app").appendChild(sceneElm);

//    // const geom = new THREE.BoxGeometry(0.128821, 0.1515151515151515,0.9174311926605504);
//    const geom = new THREE.BoxGeometry(10,5,10);
//    const mate = new THREE.MeshNormalMaterial();
//    const cube = new THREE.Mesh(geom, mate);
//    // cube.position.set(-4.9358974,-1.13636363,4.541284403669724);
//    cube.position.set(0,0,0);
// sceneElm.object3D.add(cube)

// const cube2 = new THREE.Mesh(geom, mate);
// cube2.position.set(-4.87179,5,0);
// sceneElm.object3D.add(cube2)
//
// const cube2 = new THREE.Mesh(geom, mate);
// cube2.position.set(-5.273972602739725,3.0537634409,-8.503468780971257);
// sceneElm.object3D.add(cube2)
//
// const cube3 = new THREE.Mesh(geom, mate);
// cube3.position.set(-5.273972602739725,3.0537634409,-0.49554013875123815);
// sceneElm.object3D.add(cube3)

// const cube4 = new THREE.Mesh(geom, mate);
// cube.position.set(-5.273972602739725,3.0537634409,0.5054509415262638);
// sceneElm.object3D.add(cube4)
//
// const cube5 = new THREE.Mesh(geom, mate);
// cube.position.set(-5.273972602739725,3.0537634409,0.5054509415262638);
// sceneElm.object3D.add(cube5)


const imageContainer = document.createElement('a-entity');
imageContainer.id = "histogram1-cinema";
imageContainer.setAttribute('canvas-component', '');
imageContainer.setAttribute('position', "0 4 -6");
imageContainer.setAttribute('scale', "10 10 10");

sceneElm.appendChild(imageContainer);

const histogramContainer = document.createElement('a-entity');
histogramContainer.id = "histogram1";
histogramContainer.setAttribute('nested-histogram', '');
histogramContainer.setAttribute('position', "0 0 0");
sceneElm.appendChild(histogramContainer);

const options = new Map();
options.set("histo125", histo125);
options.set("histo12_5", histo12_5);
options.set("histo1_25", histo1_25);
options.set("histo1_2_5", histo1_2_5);
options.set("histo5_2_1", histo5_2_1);

const selectDiv = document.createElement('div');
selectDiv.innerHTML = `
  <div style="position: absolute; top: 50px; right: 50px;">
    <select name="histograms" id="histogram-select">
      <option value="histo125">histo125</option>
      <option value="histo12_5">histo12_5</option>
      <option value="histo1_25">histo1_25</option>
      <option value="histo1_2_5">histo1_2_5</option>
      <option value="histo5_2_1">histo5_2_1</option>
      <option value="custom">Set to URL</option>
    </select>
    <input type="text" id="custom-url-input" placeholder="Enter custom URL" style="display: none; margin-top: 5px; width: 200px;" />
    <button id="load-custom-url" style="display: none; margin-top: 5px;">Load</button>
  </div>
`;

document.querySelector("#app").appendChild(selectDiv);

const histogramSelect = document.getElementById('histogram-select');
const urlInput = document.getElementById('custom-url-input');
const loadButton = document.getElementById('load-custom-url');

histogramSelect.addEventListener('change', (event) => {
   const selectedValue = event.target.value;
   if (selectedValue === "custom") {
      urlInput.style.display = "inline-block";
      loadButton.style.display = "inline-block";
   } else {
      urlInput.style.display = "none";
      loadButton.style.display = "none";
      histogramSubjectGet().next({ id: 'histogram1', histogram: options.get(selectedValue) });
   }
});

const setDiv = document.createElement('div');
setDiv.innerHTML = `
  <div style="position: absolute; top: 80px; right: 50px;">
    <select name="set" id="set-select">
      <option value="loading">Loading...</option>
    </select>
  </div>
`;
document.querySelector("#app").appendChild(setDiv);

const selectEl = document.getElementById("set-select");

stateSubjectGet().getObservable().subscribe(state => {
    const newOptions = state.sets || [];

    selectEl.innerHTML = "";

    newOptions.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        selectEl.appendChild(option);
    });
    selectEl.value = state.selectedSet;
});

const setSelect = document.getElementById('set-select');
setSelect.addEventListener('change', (event) => {
   const currentValue = stateSubjectGet().getValue();

   if (currentValue.selectedSet !== event.target.value) {
       currentValue.selectedSet = event.target.value;
       stateSubjectGet().next(currentValue);
   }
});

loadButton.addEventListener('click', async () => {
   const url = urlInput.value.trim();
   if (!url) {
      alert("Please enter a valid URL.");
      return;
   }

   try {
      const response = await fetch(url);
      const data  = await response.json()
      console.log(data);
      // if (!response.ok) throw new Error("Network response was not ok");

      histogramSubjectGet().next({ id: 'histogram1', histogram: data });
   } catch (error) {
      console.error("Failed to load histogram from URL:", error);
      alert("Failed to load histogram from the specified URL.");
   }
});



// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histoWithOutsideContent)});
// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histoSparse)});

// histogramSubjectGet().next({id: 'histogram1', histogram: nestedHisto});

// histogramSubjectGet().next({id: 'histogram1', histogram: 'https://eos.ndmspc.io//eos/ndmspc/scratch/ndmspc/ndmvr-aframe/demo/hist3D.axis1-pt_axis2-ce_axis5-eta.root'});
// histogramSubjectGet().next({id: 'histogram1', histogram: parse(nestedHisto4)});

// histogramSubjectGet().next({id: 'histogram1', histogram: histo6x2x1});
// histogramSubjectGet().next({id: 'histogram1', histogram: histo125});
// histogramSubjectGet().next({id: 'histogram1', histogram: histo12_5});
histogramSubjectGet().next({id: 'histogram1', histogram: histo1_2_5});

// histogramSubjectGet().next({id: 'histogram1', histogram: parse(histo4x3x1)});


const functions = [
   {
      event: 'mouseclick',
      target: {
         entity: 'nested-histogram',
         id: '*'
      },
      function: function (event, context) {
         console.log(event)
         console.log('mouselcick');
         context.showChildHistogram(event);
      }
   },
   {
      event: 'shiftmouseclick',
      target: {
         entity: 'nested-histogram',
         id: '*'
      },
      function: function (event, context) {
         // console.log(event)
         console.log('shiftmouselcick');

         context.hideChildHistogram(event);
      }
   },
   {
      event: 'mousedbclick',
      target: {
         entity: 'nested-histogram',
         id: '*'
      },
      function: function (event, context) {
         console.log(event)
         // console.log('index: ', context.computeJsRootIndexFromPosition(event))
         context.setPointerToChild(context.computeJsRootIndexFromPosition(event), 'unlikepm');
      }
   },
   {
      event: 'shiftmousedbclick',
      target: {
         entity: 'nested-histogram',
         id: '*'
      },
      function: function (event, context) {
         // console.log(event)
         // console.log('shiftmousedbclick');
         context.setPointerToParent();
      }
   },
   {
      event: 'mousemove',
      target: {
         entity: 'nested-histogram',
         id: '*'
      },
      function: function (event, context) {
         // console.log('mousemove: ', event);
         // this.showChildHistogram(event)
      }
   }
];

setTimeout(() => functionSubjectGet().addFunctions(functions), 100);