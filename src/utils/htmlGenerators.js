import histogram55x57x34 from "../../public/histograms/TH3variableBinning55x57x34.json";
import histogramTHX from "../../public/histograms/THXvariableBinning.json";
import histogramArray from "../../public/histograms/THArray.json";
import histogram2x2x3 from "../../public/histograms/TH3variableBinning2x2x3OnlyInsideContent.json";
import histogram2x2x3Negative from "../../public/histograms/TH3variableBinning2x2x3Negative.json";
import histogramRecursive from "../../public/histograms/THrecursive.json";
import { parse } from "jsroot";
import { histogramSubjectGet } from "../rxjs/HistogramSubject.js";
import MobileController from "../controllers/mobile/mobileController.js";
import arrow from "../assets/mobileControls/arrow.png";
import joystickBase from "../assets/mobileControls/joystick-base.png";
import joystickBlue from "../assets/mobileControls/joystick-blue.png";
import "../controllers/mobile/mobileController.css";
import { getCameraComponent } from "../component/camera.component.js";

export function generate_AFrame_blank_scene_html () {
  const container = document.createElement("div");
  container.id = "container";
  // new MobileController();
  const scene = generateBlankScene();
  container.appendChild(scene);
  return scene;

}

function generateBlankScene() {
  const scene = document.createElement("a-scene");
  scene.id = "a-min-scene";
  scene.setAttribute("stats", "");
  scene.setAttribute("ndmvr-raycaster", "");
  // scene.setAttribute("vr-mode-ui", "enabled: false");
  // scene.setAttribute("embedded", "");
  scene.style.cssText = "height: 100%; width: 100%";

  const sky = document.createElement("a-sky");
  sky.setAttribute("color", "#ffffff");

  const camera = getCameraComponent();
  scene.appendChild(camera);
  scene.appendChild(sky);

  return scene;
}