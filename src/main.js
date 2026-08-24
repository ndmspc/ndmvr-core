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
import testNested from "./assets/histograms/nested/test_nested.json";
// import rsnNested from "./assets/histograms/nested/rsn_nested.json";
// import veronika from "./assets/histograms/nested/veronika.json";
// import cernstaff from "./assets/histograms/nested/cernstaff_145_369.json";
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

// import { parse } from "jsroot";
// import { build3d } from "./modules/build/jsroot-build3d.mjs";
//
// console.log(h3scat);
// build3d(parse(h3scat), '', true).then(obj3d => {
//   console.log("OBJ3D: ", obj3d);
// })

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
const imagePad = document.createElement("a-entity");
imageContainer.id = "histogram1-cinema";
imageContainer2.id = "histogram2-cinema";
imagePad.id = "pad1-cinema";
imageContainer.setAttribute("canvas-component", "");
imageContainer2.setAttribute("canvas-component", "");
imagePad.setAttribute("canvas-component", "");
// imageContainer.setAttribute("position", "0 4 -6");
// imageContainer.setAttribute("rotation", "0 4 -6");
// imageContainer.setAttribute("scale", "10 10 10");

// sceneElm.appendChild(imageContainer);
// sceneElm.appendChild(imageContainer2);
sceneElm.appendChild(imagePad);



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


// const histogramContainer = document.createElement("a-entity");
// histogramContainer.id = "histogram1";
// histogramContainer.setAttribute("thnpainter", "");
// histogramContainer.setAttribute("position", "0 0 0");
// sceneElm.appendChild(histogramContainer);

const padContainer = document.createElement("a-entity");
padContainer.id = "pad1";
padContainer.setAttribute("thnpainter", "");
padContainer.setAttribute("position", "0 0 0");
sceneElm.appendChild(padContainer);

const binInfoEl = document.createElement("a-entity");
binInfoEl.setAttribute("bininfo-jsroot", "");
sceneElm.appendChild(binInfoEl);

// const histogramContainer2 = document.createElement("a-entity");
// histogramContainer2.id = "histogram2";
// histogramContainer2.setAttribute("histogram", "");
// histogramContainer2.setAttribute("position", "0 0 0");
// sceneElm.appendChild(histogramContainer2);
//
// const histogramContainer3 = document.createElement("a-entity");
// histogramContainer3.id = "histogram3";
// histogramContainer3.setAttribute("histogram", "");
// histogramContainer3.setAttribute("position", "0 0 0");
// sceneElm.appendChild(histogramContainer3);
//
// const histogramContainer4 = document.createElement("a-entity");
// histogramContainer4.id = "histogram4";
// histogramContainer4.setAttribute("histogram", "");
// histogramContainer4.setAttribute("position", "0 0 0");
// sceneElm.appendChild(histogramContainer4);

const options = new Map();
options.set("h3scat", h3scat);
options.set("test6x2x1", histo6x2x1);
options.set("histo125", histo125);
options.set("histo12_5", histo12_5);
options.set("histo1_25", histo1_25);
options.set("histo1_2_5", histo1_2_5);
options.set("histo5_2_1", histo5_2_1);

const menuDiv = document.createElement("div");
menuDiv.innerHTML = `
  <div style="position: fixed; top: 12px; right: 12px; left: auto; z-index: 1000; width: 280px; padding: 10px; border-radius: 8px; background: rgba(20, 20, 30, 0.9); color: #f5f5f5; font-family: Arial, sans-serif; max-height: calc(100vh - 24px); overflow-y: auto;">
    <div style="display: flex; gap: 6px; margin-bottom: 10px;">
      <button type="button" data-panel="histogram-panel" style="flex: 1; padding: 6px; border: 1px solid #2b4966; background: #1e3550; color: #fff; cursor: pointer; border-radius: 4px;">Histogram Select</button>
      <button type="button" data-panel="draw-options-panel" style="flex: 1; padding: 6px; border: 1px solid #444; background: #2f2f38; color: #fff; cursor: pointer; border-radius: 4px;">Draw Options</button>
      <button type="button" data-panel="draw-ranges-panel" style="flex: 1; padding: 6px; border: 1px solid #444; background: #2f2f38; color: #fff; cursor: pointer; border-radius: 4px;">Draw Ranges</button>
    </div>

    <div id="histogram-panel" data-menu-panel>
      <select name="histograms" id="histogram-select" style="width: 100%; padding: 6px; margin-bottom: 6px;">
        <option value="h3scat">h3scat</option>
        <option value="test6x2x1">text6x2x1</option>
        <option value="histo125">histo125</option>
        <option value="histo12_5">histo12_5</option>
        <option value="histo1_25">histo1_25</option>
        <option value="histo1_2_5">histo1_2_5</option>
        <option value="histo5_2_1">histo5_2_1</option>
        <option value="custom">Set to URL</option>
      </select>
      <input type="text" id="custom-url-input" value="https://eos.ndmspc.io/eos/ndmspc/scratch/ndmspc/hp_2026/rsn.json" placeholder="Enter custom URL" style="display: none; width: 100%; padding: 6px; margin-bottom: 6px;" />
      <button id="load-custom-url" style="display: none; width: 100%; padding: 6px;">Load</button>
    </div>

    <div id="draw-options-panel" data-menu-panel style="display: none;">
      <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 8px; cursor: pointer;">
        <input type="checkbox" id="error-cross" style="accent-color: #00ffff;" />
        Error cross display
      </label>

      <label for="arraySelect" style="font-size: 12px; color: #c8c8c8;">Array select</label>
      <select id="arraySelect" aria-label="Dynamic options" style="width: 100%; padding: 6px; margin: 4px 0 10px;">
        <option value="content">content</option>
      </select>

      <div style="font-size: 12px; color: #c8c8c8; margin-bottom: 4px;">Set select</div>
      <div id="set-checkboxes" style="max-height: 160px; overflow-y: auto;"></div>
    </div>

    <div id="draw-ranges-panel" data-menu-panel style="display: none;">
      <div id="draw-ranges-content" style="font-size: 13px; color: #c8c8c8;">No axis ranges available yet.</div>
      <button id="apply-ranges-button" style="width: 100%; padding: 6px; margin-top: 8px;">Apply ranges</button>
    </div>
  </div>
`;

document.querySelector("#app").appendChild(menuDiv);

const menuButtons = menuDiv.querySelectorAll("button[data-panel]");
const menuPanels = menuDiv.querySelectorAll("[data-menu-panel]");

const setMenuPanel = (panelId) => {
  menuPanels.forEach((panel) => {
    panel.style.display = panel.id === panelId ? "block" : "none";
  });

  menuButtons.forEach((button) => {
    const isActive = button.dataset.panel === panelId;
    button.style.background = isActive ? "#1e3550" : "#2f2f38";
    button.style.borderColor = isActive ? "#2b4966" : "#444";
  });
};

menuButtons.forEach((button) => {
  button.addEventListener("click", () => setMenuPanel(button.dataset.panel));
});

setMenuPanel("histogram-panel");

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
      id: "pad1",
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

const checkboxContainer = document.getElementById("set-checkboxes");
const arraySelect = document.getElementById("arraySelect");
const drawRangesContainer = document.getElementById("draw-ranges-content");
const applyRangesButton = document.getElementById("apply-ranges-button");

const formatAxisValue = (value) => {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";

  const absValue = Math.abs(value);
  if (absValue >= 1e6 || absValue < 1e-4) {
    return value.toExponential(6).replace(/\.?(0+)(e)/, "$2");
  }

  return Number.parseFloat(value.toPrecision(12)).toString();
};

// Render Axis Ranges into provided container
const renderAxisRangesTo = (axisRanges, targetEl) => {
  targetEl.innerHTML = "";

  if (!Array.isArray(axisRanges) || axisRanges.length === 0) {
    targetEl.textContent = "No axis ranges available yet.";
    return;
  }

  axisRanges.forEach((layerRanges, layerIndex) => {
    const layerWrap = document.createElement("div");
    layerWrap.style.marginBottom = "10px";
    layerWrap.style.padding = "8px";
    layerWrap.style.border = "1px solid #3a3a47";
    layerWrap.style.borderRadius = "6px";

    const layerTitle = document.createElement("div");
    layerTitle.textContent = `Layer ${layerIndex + 1}`;
    layerTitle.style.fontSize = "12px";
    layerTitle.style.fontWeight = "bold";
    layerTitle.style.marginBottom = "8px";
    layerWrap.appendChild(layerTitle);

    if (!Array.isArray(layerRanges) || layerRanges.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No axes in this layer.";
      empty.style.color = "#9e9ea7";
      empty.style.fontSize = "12px";
      layerWrap.appendChild(empty);
      targetEl.appendChild(layerWrap);
      return;
    }

    layerRanges.forEach((axisRange, axisIndex) => {
      const minBound = Number(axisRange?.fXmin);
      const maxBound = Number(axisRange?.fXmax);
      const hasValidBounds = Number.isFinite(minBound) && Number.isFinite(maxBound) && minBound < maxBound;

      const startMin = hasValidBounds ? Math.min(Math.max(Number(axisRange?.fXbot), minBound), maxBound) : 0;
      const startMax = hasValidBounds ? Math.min(Math.max(Number(axisRange?.fXtop), minBound), maxBound) : 1;

      const axisWrap = document.createElement("div");
      axisWrap.style.marginBottom = "10px";
      axisWrap.style.paddingBottom = "8px";
      axisWrap.style.borderBottom = "1px solid #2f2f39";

      const axisTitle = document.createElement("div");
      axisTitle.textContent = `${axisRange?.fTitle || "Axis"} (${axisRange?.axis || "?"})`;
      axisTitle.style.fontSize = "12px";
      axisTitle.style.marginBottom = "4px";
      axisWrap.appendChild(axisTitle);

      if (!hasValidBounds) {
        const invalid = document.createElement("div");
        invalid.textContent = "Invalid bounds";
        invalid.style.fontSize = "12px";
        invalid.style.color = "#ff9a9a";
        axisWrap.appendChild(invalid);
        layerWrap.appendChild(axisWrap);
        return;
      }

      const valuesInfo = document.createElement("div");
      valuesInfo.style.fontSize = "11px";
      valuesInfo.style.color = "#b9b9c6";
      valuesInfo.style.marginBottom = "4px";
      axisWrap.appendChild(valuesInfo);

      const minSlider = document.createElement("input");
      minSlider.type = "range";
      minSlider.step = "any";
      minSlider.min = String(minBound);
      minSlider.max = String(maxBound);
      minSlider.value = String(startMin);
      minSlider.dataset.layerIndex = String(layerIndex);
      minSlider.dataset.axisIndex = String(axisIndex);
      minSlider.dataset.rangeRole = "min";
      minSlider.style.width = "100%";
      axisWrap.appendChild(minSlider);

      const maxSlider = document.createElement("input");
      maxSlider.type = "range";
      maxSlider.step = "any";
      maxSlider.min = String(minBound);
      maxSlider.max = String(maxBound);
      maxSlider.value = String(Math.max(startMin, startMax));
      maxSlider.dataset.layerIndex = String(layerIndex);
      maxSlider.dataset.axisIndex = String(axisIndex);
      maxSlider.dataset.rangeRole = "max";
      maxSlider.style.width = "100%";
      axisWrap.appendChild(maxSlider);

      const syncRangeText = () => {
        let currentMin = Number(minSlider.value);
        let currentMax = Number(maxSlider.value);

        if (currentMin > currentMax) {
          if (document.activeElement === minSlider) {
            currentMax = currentMin;
            maxSlider.value = String(currentMax);
          } else {
            currentMin = currentMax;
            minSlider.value = String(currentMin);
          }
        }

        valuesInfo.textContent = `Range: ${formatAxisValue(currentMin)} -> ${formatAxisValue(currentMax)}`;
      };

      minSlider.addEventListener("input", syncRangeText);
      maxSlider.addEventListener("input", syncRangeText);
      syncRangeText();

      layerWrap.appendChild(axisWrap);
    });

    targetEl.appendChild(layerWrap);
  });
};

// Render Min/Max Values (both value and error) into provided container
const renderMinMaxValuesTo = (minMaxValue, targetEl) => {
  targetEl.innerHTML = "";

  if (!Array.isArray(minMaxValue) || minMaxValue.length === 0) {
    targetEl.textContent = "No min/max values available yet.";
    return;
  }

  minMaxValue.forEach((layerObj, layerIndex) => {
    const layerWrap = document.createElement("div");
    layerWrap.style.marginBottom = "10px";
    layerWrap.style.padding = "8px";
    layerWrap.style.border = "1px solid #3a3a47";
    layerWrap.style.borderRadius = "6px";

    const layerTitle = document.createElement("div");
    layerTitle.textContent = `Layer ${layerIndex + 1}`;
    layerTitle.style.fontSize = "12px";
    layerTitle.style.fontWeight = "bold";
    layerTitle.style.marginBottom = "8px";
    layerWrap.appendChild(layerTitle);

    if (!layerObj || typeof layerObj !== "object") {
      const empty = document.createElement("div");
      empty.textContent = "No keys in this layer.";
      empty.style.color = "#9e9ea7";
      empty.style.fontSize = "12px";
      layerWrap.appendChild(empty);
      targetEl.appendChild(layerWrap);
      return;
    }

    Object.keys(layerObj).forEach((key) => {
      const entry = layerObj[key] || {};
      const valueObj = entry.value || {};
      const errorObj = entry.error || {};

      // For Min/Max Values sliders use role-specific fXmin/fXmax as read-only bounds when provided.
      // No extra validation is performed; if values are null/Infinity/etc. it's acceptable.

      const sectionWrap = document.createElement("div");
      sectionWrap.style.marginBottom = "10px";
      sectionWrap.style.paddingBottom = "8px";
      sectionWrap.style.borderBottom = "1px solid #2f2f39";

      const title = document.createElement("div");
      title.textContent = String(key);
      title.style.fontSize = "12px";
      title.style.marginBottom = "4px";
      sectionWrap.appendChild(title);

      // Helper to build a pair of sliders (min/max) for a role (value or error)
      const buildSliderPair = (role, current) => {
        const box = document.createElement("div");
        box.style.margin = "6px 0";

        const label = document.createElement("div");
        label.textContent = role === "value" ? "Value" : "Error";
        label.style.fontSize = "11px";
        label.style.color = "#b9b9c6";
        label.style.marginBottom = "2px";
        box.appendChild(label);

        // Original (read-only) slider bounds taken directly from role's fXmin/fXmax
        const roleMinBoundRaw = current?.fXmin;
        const roleMaxBoundRaw = current?.fXmax;

        // Initialize slider positions from current values without clamping
        const startMin = Number.isFinite(Number(current?.min)) ? Number(current.min) : 0;
        const startMax = Number.isFinite(Number(current?.max)) ? Number(current.max) : 1;

        const info = document.createElement("div");
        info.style.fontSize = "11px";
        info.style.color = "#b9b9c6";
        info.style.marginBottom = "4px";
        box.appendChild(info);

        const minSlider = document.createElement("input");
        minSlider.type = "range";
        minSlider.step = "any";
        if (Number.isFinite(Number(roleMinBoundRaw))) minSlider.min = String(Number(roleMinBoundRaw));
        if (Number.isFinite(Number(roleMaxBoundRaw))) minSlider.max = String(Number(roleMaxBoundRaw));
        minSlider.value = String(startMin);
        minSlider.dataset.mmLayerIndex = String(layerIndex);
        minSlider.dataset.mmKey = String(key);
        minSlider.dataset.mmRole = role; // value | error
        minSlider.dataset.rangeRole = "min";
        minSlider.style.width = "100%";
        box.appendChild(minSlider);

        const maxSlider = document.createElement("input");
        maxSlider.type = "range";
        maxSlider.step = "any";
        if (Number.isFinite(Number(roleMinBoundRaw))) maxSlider.min = String(Number(roleMinBoundRaw));
        if (Number.isFinite(Number(roleMaxBoundRaw))) maxSlider.max = String(Number(roleMaxBoundRaw));
        maxSlider.value = String(Math.max(startMin, startMax));
        maxSlider.dataset.mmLayerIndex = String(layerIndex);
        maxSlider.dataset.mmKey = String(key);
        maxSlider.dataset.mmRole = role;
        maxSlider.dataset.rangeRole = "max";
        maxSlider.style.width = "100%";
        box.appendChild(maxSlider);

        const sync = () => {
          let cmin = Number(minSlider.value);
          let cmax = Number(maxSlider.value);
          if (cmin > cmax) {
            if (document.activeElement === minSlider) {
              cmax = cmin;
              maxSlider.value = String(cmax);
            } else {
              cmin = cmax;
              minSlider.value = String(cmin);
            }
          }
          info.textContent = `${role === "value" ? "Value" : "Error"} range: ${formatAxisValue(cmin)} -> ${formatAxisValue(cmax)}`;
        };
        minSlider.addEventListener("input", sync);
        maxSlider.addEventListener("input", sync);
        sync();

        return box;
      };

      sectionWrap.appendChild(buildSliderPair("value", valueObj));
      sectionWrap.appendChild(buildSliderPair("error", errorObj));

      layerWrap.appendChild(sectionWrap);
    });

    targetEl.appendChild(layerWrap);
  });
};

// Build the two-column layout and render both Axis Ranges and Min/Max Values
const renderRangesPanel = (state) => {
  drawRangesContainer.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "10px";

  const left = document.createElement("div");
  left.style.flex = "1 1 0";
  const leftTitle = document.createElement("div");
  leftTitle.textContent = "Axis Ranges";
  leftTitle.style.fontSize = "12px";
  leftTitle.style.fontWeight = "bold";
  leftTitle.style.margin = "0 0 6px 0";
  left.appendChild(leftTitle);
  const leftContent = document.createElement("div");
  leftContent.id = "axis-ranges-content";
  left.appendChild(leftContent);

  const right = document.createElement("div");
  right.style.flex = "1 1 0";
  const rightTitle = document.createElement("div");
  rightTitle.textContent = "Min/Max Values";
  rightTitle.style.fontSize = "12px";
  rightTitle.style.fontWeight = "bold";
  rightTitle.style.margin = "0 0 6px 0";
  right.appendChild(rightTitle);
  const rightContent = document.createElement("div");
  rightContent.id = "minmax-values-content";
  right.appendChild(rightContent);

  wrap.appendChild(left);
  wrap.appendChild(right);
  drawRangesContainer.appendChild(wrap);

  renderAxisRangesTo(state?.axisRanges, leftContent);
  renderMinMaxValuesTo(state?.minMaxValue, rightContent);
};

applyRangesButton.addEventListener("click", () => {
  const currentValue = stateSubjectGet("pad1").getValue();
  // Update axisRanges from sliders if present
  if (Array.isArray(currentValue?.axisRanges)) {
    currentValue.axisRanges = currentValue.axisRanges.map((layerRanges, layerIndex) => {
      if (!Array.isArray(layerRanges)) return layerRanges;

      return layerRanges.map((axisRange, axisIndex) => {
        const minSlider = drawRangesContainer.querySelector(
          `input[data-layer-index="${layerIndex}"][data-axis-index="${axisIndex}"][data-range-role="min"]`,
        );
        const maxSlider = drawRangesContainer.querySelector(
          `input[data-layer-index="${layerIndex}"][data-axis-index="${axisIndex}"][data-range-role="max"]`,
        );

        if (!minSlider || !maxSlider) return axisRange;

        const minValue = Number(minSlider.value);
        const maxValue = Number(maxSlider.value);
        const nextMin = Math.min(minValue, maxValue);
        const nextMax = Math.max(minValue, maxValue);

        return {
          ...axisRange,
          fXbot: nextMin,
          fXtop: nextMax,
        };
      });
    });
  }
  // Update minMaxValue from sliders if present
  if (Array.isArray(currentValue?.minMaxValue)) {
    currentValue.minMaxValue = currentValue.minMaxValue.map((layerObj, layerIndex) => {
      if (!layerObj || typeof layerObj !== "object") return layerObj;
      const nextLayer = { ...layerObj };
      Object.keys(layerObj).forEach((key) => {
        const entry = layerObj[key] || {};
        const valMinEl = drawRangesContainer.querySelector(
          `input[data-mm-layer-index="${layerIndex}"][data-mm-key="${key}"][data-mm-role="value"][data-range-role="min"]`,
        );
        const valMaxEl = drawRangesContainer.querySelector(
          `input[data-mm-layer-index="${layerIndex}"][data-mm-key="${key}"][data-mm-role="value"][data-range-role="max"]`,
        );
        const errMinEl = drawRangesContainer.querySelector(
          `input[data-mm-layer-index="${layerIndex}"][data-mm-key="${key}"][data-mm-role="error"][data-range-role="min"]`,
        );
        const errMaxEl = drawRangesContainer.querySelector(
          `input[data-mm-layer-index="${layerIndex}"][data-mm-key="${key}"][data-mm-role="error"][data-range-role="max"]`,
        );

        const nextEntry = { ...entry };
        if (valMinEl && valMaxEl) {
          const a = Number(valMinEl.value);
          const b = Number(valMaxEl.value);
          // Preserve existing keys like fXmin/fXmax; update only min/max
          nextEntry.value = { ...(entry.value || {}), min: Math.min(a, b), max: Math.max(a, b) };
        }
        if (errMinEl && errMaxEl) {
          const a = Number(errMinEl.value);
          const b = Number(errMaxEl.value);
          // Preserve existing keys like fXmin/fXmax; update only min/max
          nextEntry.error = { ...(entry.error || {}), min: Math.min(a, b), max: Math.max(a, b) };
        }
        nextLayer[key] = nextEntry;
      });
      return nextLayer;
    });
  }

  stateSubjectGet("pad1").next(currentValue);
});


document.getElementById("error-cross").addEventListener("change", (e) => {
  configSubjectGet().next({
    config: {
      histogram: {
        errorCross: { enabled: e.target.checked }
      }
    }
  });
  
});

// ─────────────────────────────────────────────────────────────────────────────



stateSubjectGet("pad1")
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

    renderRangesPanel(state);
  });

arraySelect.addEventListener("change", () => {
  const currentValue = stateSubjectGet("pad1").getValue();
  currentValue.selectedArray = arraySelect.value;
  stateSubjectGet("pad1").next(currentValue);
  
});

checkboxContainer.addEventListener("change", (event) => {
  if (event.target.type === "checkbox") {
    const currentValue = stateSubjectGet("pad1").getValue();

    const checkedValues = Array.from(
      checkboxContainer.querySelectorAll("input[type='checkbox']:checked"),
    ).map((cb) => cb.value);

    if (
      JSON.stringify(currentValue.selectedSet) !== JSON.stringify(checkedValues)
    ) {
      currentValue.selectedSet = checkedValues;
      stateSubjectGet("pad1").next(currentValue);
      
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
      id: "pad1",
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

// histogramSubjectGet().next({id: "pad1", opts: {render: "ndmvr"}, obj: testNested});
histogramSubjectGet().next({id: "pad1", opts: {render: "ndmvr"}, obj: histo1_2_5});
// histogramSubjectGet().next({id: "pad1", opts: {render: "ndmvr"}, obj: cernstaff});
// histogramSubjectGet().next({id: 'histogram4', opts: {render: "nested"}, histogram: h3scat});
// histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
//

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

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

// binInfoSubjectGet()
//   .getObservable()
//   .subscribe((event) => {
//     sceneElm.object3D.remove(cube);
//     cube.position.set(event.binPosSize.position[0], event.binPosSize.position[1], event.binPosSize.position[2]);
//     cube.scale.set(event.binPosSize.scale[0], event.binPosSize.scale[1], event.binPosSize.scale[2]);
//     sceneElm.object3D.add(cube);
//     // console.log(sceneElm.object3D);
//     console.log(event);
//   });

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
