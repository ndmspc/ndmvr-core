import histogram55x57x34 from "../../public/histograms/TH3variableBinning55x57x34.json";
import {parse} from "jsroot";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
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
  const scene = document.createElement('a-scene');
  scene.id = "a-min-scene";
  scene.setAttribute('stats', '');
  scene.style.cssText= "position: absolute; height: 100%; width: 100%;";


  histogramSubjectGet().next({id: 'histogram18bins', histogram: parse(histogram55x57x34)});

  scene.innerHTML = scene.innerHTML + `
      <a-entity id="histogram18bins" position="0 0 0"
        histogram-skor>
      </a-entity>
      
<!--      <a-entity id="histogram18bins" position="0 0 140"-->
<!--        histogram-skor>-->
<!--      </a-entity>-->
<!--      -->
<!--      <a-entity id="histogram18bins" position="-140 0 0"-->
<!--        histogram-skor>-->
<!--      </a-entity>-->
<!--      -->
<!--      <a-entity id="histogram18bins" position="-140 0 140"-->
<!--        histogram-skor>-->
<!--      </a-entity>-->
    `;
  return scene;
}

export function generate_AFrame_blank_scene_html(){
  const scene = document.createElement('a-scene');
  scene.id = "a-min-scene";
  scene.setAttribute('stats', '');
  scene.style.cssText= "position: absolute; height: 100%; width: 100%;";


  scene.innerHTML = scene.innerHTML + `
<!--        ref box-->
<!--      <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9"></a-box>-->
      <a-entity id="histogram1" position="0 0 0"
        histogram-skor>
      </a-entity>
      
      <a-entity id="histogram2" position="0 0 -20"
        histogram-skor>
      </a-entity>
      
      <a-entity id="histogram3" position="-20 0 0"
        histogram-skor>
      </a-entity>
    `;
  return scene;
}