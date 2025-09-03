import histogram55x57x34 from "../../public/histograms/TH3variableBinning55x57x34.json";
import histogramTHX from "../../public/histograms/THXvariableBinning.json";
import histogramArray from "../../public/histograms/THArray.json";
import histogram2x2x3 from "../../public/histograms/TH3variableBinning2x2x3OnlyInsideContent.json"
import histogram2x2x3Negative from "../../public/histograms/TH3variableBinning2x2x3Negative.json"
import histogramRecursive from "../../public/histograms/THrecursive.json"
import {parse} from "jsroot";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import MobileController from "../controllers/mobile/mobileController.js";
import arrow from "../assets/mobileControls/arrow.png";
import joystickBase from "../assets/mobileControls/joystick-base.png";
import joystickBlue from "../assets/mobileControls/joystick-blue.png";
import '../controllers/mobile/mobileController.css'
import {getCameraComponent} from "../component/camera.component.js";
export function generate_AFrame_min_scene_html(){
  const scene = document.createElement('a-scene');
  scene.id = "a-min-scene";
  scene.innerHTML = `
      <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9"></a-box>
      <a-sphere position="0 1.25 -5" radius="1.25" color="#EF2D5E"></a-sphere>
      <a-cylinder
        position="1 0.75 -3"
        radius="0.5"
        height="1.5"
        color="#FFC65D"
      ></a-cylinder>
      <a-plane
        position="0 0 -4"
        rotation="-90 0 0"
        width="4"
        height="4"
        color="#7BC8A4"
      ></a-plane>
      <a-sky color="#ECECEC"></a-sky>
    `;
  return scene;
}

export function generate_AFrame_rand_hist_scene_html(){
  const container = document.createElement('div');
  container.id = 'container';
  new MobileController();
  container.appendChild(generateScene());
  return container;

}

export function generate_AFrame_blank_scene_html(){
  const container = document.createElement('div');
  container.id = 'container';
  // new MobileController();
  const scene = generateBlankScene();
  container.appendChild(scene);
  return scene;

}

function generateBlankScene() {
  const scene = document.createElement('a-scene');
  scene.id = "a-min-scene";
  scene.setAttribute('stats', '');
  // scene.setAttribute('device-detector', '');
  // scene.setAttribute('screen-controls', '');
  scene.setAttribute('ndmvr-raycaster', '');
  scene.style.cssText= "position: absolute; height: 100%; width: 100%;";

  const sky = document.createElement('a-sky');
  sky.setAttribute('color', '#ffffff')

  const camera = getCameraComponent();
  scene.appendChild(camera);
  scene.appendChild(sky);

  return scene;
}

function generateScene() {
  const scene = document.createElement('a-scene');
  scene.id = "a-min-scene";
  scene.setAttribute('stats', '');
  scene.setAttribute('device-detector', '');
  scene.setAttribute('screen-controls', '');
  scene.setAttribute('ndmvr-raycaster', '');
  scene.style.cssText= "position: absolute; height: 100%; width: 100%;";

  const camera = getCameraComponent();
  scene.appendChild(camera);
  // console.log(parse(histogram55x57x34));


  // histogramSubjectGet().next({id: 'histogram18bins', histogram: parse(histogram55x57x34)});
  // histogramSubjectGet().next({id: 'histogram18bins', histogram: parse(histogram55x57x34)});
  // histogramSubjectGet().next({id: 'histogram18bins', histogram: parse(histogram2x2x3Negative)});
  // histogramSubjectGet().next({id: 'histogram18bins', histogram: parse(histogramTHX)});
  histogramSubjectGet().next({id: 'histogram18bins', histogram: parse(histogramRecursive)});
  // histogramSubjectGet().next({id: 'histogram19bins', histogram: parse(histogram2x2x3)});

  // console.log(parse(histogramTHX));

  scene.innerHTML = scene.innerHTML + `

<!--      <a-entity id="histogram18bins" position="0 0 0"-->
<!--        histogram="content_min: 0; bin_padding_x: 2; bin_padding_y: 1; bin_padding_z: 3">-->
<!--      </a-entity>-->
      
      <a-entity id="histogram18bins" position="0 2 0"
        histogram=" bin_padding_x: 1; bin_padding_y: 1; bin_padding_z: 1">
      </a-entity>
      
<!--      <a-entity id="histogram19bins" position="0 2 0"-->
<!--        histogram="bin_padding_x: 1; bin_padding_y: 1; bin_padding_z: 1">-->
<!--      </a-entity>-->
<!--      -->
<!--      <a-entity id="histogram18bins" position="2 1.5 0.5"-->
<!--        histogram="size: 1 1 1; bin_padding_x: 0; bin_padding_y: 0; bin_padding_z: 0">-->
<!--      </a-entity>-->
      
<!--      <a-entity id="histogram18bins" position="1 0 0"-->
<!--        histogram="size: 1 1 1; bin_scale: 1">-->
<!--      </a-entity>-->
      
<!--      <a-box position="0 2 0" depth="1" height="1" width="1">-->
<!--      </a-box>-->
      

      
<!--      <a-entity id="histogram18bins" position="10 0 0"-->
<!--        histogram="size: 10 10 10; bin_padding_x: 0; bin_padding_y: 0; bin_padding_z: 0">-->
<!--      </a-entity>-->

<!--      <a-entity id="histogram18bins" position="0 0 140"-->
<!--        histogram>-->
<!--      </a-entity>-->
<!--      -->
<!--      <a-entity id="histogram18bins" position="-140 0 0"-->
<!--        histogram>-->
<!--      </a-entity>-->
<!--      -->
<!--      <a-entity id="histogram18bins" position="-140 0 140"-->
<!--        histogram>-->
<!--      </a-entity>-->
    `;
  return scene;
}