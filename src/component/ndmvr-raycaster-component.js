import "aframe";
import { NdmvrRaycaster } from "../core/ndmvr-raycaster-class.js";

const registerNdmvrRaycasterComponent = () => {
  AFRAME.registerComponent("ndmvr-raycaster", {
    schema: {},

    init: function () {
      this.rendererElement = this.el.sceneEl.renderer.domElement;
      this.raycaster = new NdmvrRaycaster(this.el.object3D, this.rendererElement);
    }
    // this.raycaster = new THREE.Raycaster();
    // this.mouse = new THREE.Vector2();
    // this.setupRaycasting();
    // this.histogram = document.getElementById('histogram1').components['nested-histogram'];
    // },

    // color: new THREE.Color(),
    // instancedMesh: undefined,
    // dirtyInstance: {
    //    instancedMesh: undefined,
    //    instancedId: undefined
    // },

    //    setupRaycasting: function () {
    //       let lastCheck = 0; // Timestamp tracker
    //       const checkInterval = 100; // 100ms delay
    //
    //
    //       window.addEventListener("mousemove", (event) => {
    //          const now = performance.now();
    //          if (now - lastCheck < checkInterval) return; // Skip if too soon
    //          lastCheck = now;
    //
    //          this.updateRaycaster(event);
    //       });
    //
    //       window.addEventListener("click", (event) => {
    //          this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //          this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //          this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
    //          this.raycaster._triggerSource = 'mouseclick';
    //          const hits = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children, true);
    //       });
    //    },
    //
    //    updateRaycaster: function (event) {
    //       this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //       this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //       this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
    //       this.raycaster._triggerSource = 'mousemove';
    //       const hits = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children, true);
    //
    //       //---------ukazka INTERSECTU
    //
    //       // this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //       // this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //       // this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
    //       //
    //       // const intersects = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children);
    //
    //       //-----------/ukazka INTERSECTU
    //    },
    //
    //
    //    sendInstanceHoverEvent: function (phase, instancedMesh, instanceId) {
    //       const histogram = instancedMesh.parent.el.components['histogram'];
    //
    //       instancedMesh.parent.el.dispatchEvent(new CustomEvent("instance-hover", {
    //          detail: {
    //             instancedMesh,
    //             instanceId,
    //             phase,
    //             getBinContent: function () {
    //                const pos = histogram.computePositionFromIndex(instanceId);
    //                return histogram.rootObj.getBinContent(pos.x, pos.y, pos.z);
    //             },
    //             getBinPosition: function () {
    //                return histogram.computePositionFromIndex(instanceId);
    //             }
    //          }
    //       }));
    //    },
    //
    //    computePositionFromIndex: function (index) {
    //       let dimensions;
    //       if (this.mappingHistogram) {
    //          dimensions = {
    //             x: this.mappingHistogram.fXaxis.fNbins,
    //             y: this.mappingHistogram.fYaxis.fNbins,
    //             z: this.mappingHistogram.fZaxis.fNbins
    //          }
    //       } else {
    //          dimensions = {
    //             x: this.rootObj.fXaxis.fNbins,
    //             y: this.rootObj.fYaxis.fNbins,
    //             z: this.rootObj.fZaxis.fNbins
    //          }
    //       }
    //
    //       const level = 1 + index % (dimensions.x * dimensions.y);
    //
    //       let x = level % dimensions.x;
    //       if (x === 0) x = dimensions.x;
    //       const y = Math.ceil(level / dimensions.x);
    //       const z = Math.floor(index / (dimensions.x * dimensions.y));
    //       const position = {x: x, y: y, z: z + 1};
    //       // console.log(`pos: x: ${x}, y: ${y}, z: ${z}`);
    //       return (position)
    //    },
  });

};

export default registerNdmvrRaycasterComponent;