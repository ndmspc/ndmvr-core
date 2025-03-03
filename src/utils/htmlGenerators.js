export function generate_bin_html_v1(relPos,aFrameBinSizePos,visible){
  const id = `b${relPos.x}x${relPos.y}y${relPos.z}z`;
  return(
    `<a-box id=${id} color="green"
          bin="root_rel_pos: ${relPos.x} ${relPos.y} ${relPos.z}"
          position="${aFrameBinSizePos.x.pos} ${aFrameBinSizePos.y.pos} ${aFrameBinSizePos.z.pos}" 
          width="${aFrameBinSizePos.x.size}" height="${aFrameBinSizePos.y.size}" depth="${aFrameBinSizePos.z.size}"
          visible=${visible}></a-box>
    `);
}


export function generate_bin_html(relPos){
  const id = `b${relPos.x}x${relPos.y}y${relPos.z}z`;
  return(
    `<a-entity id=${id}
          bin="root_rel_pos: ${relPos.x} ${relPos.y} ${relPos.z}"
          ></a-entity>
    `);
}

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
  scene.innerHTML = `
      <a-box position="0 0 0" rotation="0 0 0" color="#4CC3D9"></a-box>
      <a-entity id="pseudoH48000bins" position="-110 0 -180"
        pseudo-histogram="batch_size:1000; bin_count:30, 40, 40; bin_size:3 2 4; visible_ratio:1.0">        
        <a-box id="pseudoH48000bins_mesh" instanced-mesh="capacity:48000; drainColor: true">
        </a-box>
      </a-entity>
      
      <a-entity id="pseudoH60000bins" position="10 0 -180"
        pseudo-histogram="batch_size:1000; bin_count:30, 50, 40; bin_size:6 2 4; visible_ratio:1.0">        
        <a-box id="pseudoH60000bins_mesh" instanced-mesh="capacity:60000; drainColor: true">
        </a-box>
      </a-entity>     
    `;
  return scene;
}

export function generate_AFrame_JSON_hist_scene_html(){
  const scene = document.createElement('a-scene');
  scene.id = "a-min-scene";
  scene.innerHTML = `
      <a-box position="0 0 0" rotation="0 0 0" color="#4CC3D9"></a-box>
    `;
  return scene;
}