import "aframe";

const registerNdmvrRaycasterComponent = () => {
   AFRAME.registerComponent("ndmvr-raycaster", {
      schema: {},

      init: function () {
         this.raycaster = new THREE.Raycaster();
         this.mouse = new THREE.Vector2();
         this.setupRaycasting();
      },

      color: new THREE.Color(),
      dirtyInstance: {
         instancedMesh: undefined,
         instancedId: undefined
      },


      setupRaycasting: function () {
         let lastCheck = 0; // Timestamp tracker
         const checkInterval = 100; // 100ms delay


         window.addEventListener("mousemove", (event) => {
            const now = performance.now();
            if (now - lastCheck < checkInterval) return; // Skip if too soon
            lastCheck = now;

            this.updateRaycaster(event);
         });

         window.addEventListener("click", (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
            const intersects = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children);

            if (intersects.length > 0) {

               if (intersects[0].object.isInstancedMesh === true) {
                  const histogram = intersects[0].object.parent.el.components['histogram'];
                  this.dirtyInstance= {
                     instancedMesh: undefined,
                        instancedId: undefined
                  }

                  intersects[0].object.parent.el.dispatchEvent(new CustomEvent("instance-click", {
                     detail: {
                        instancedMesh: intersects[0].object,
                        instanceId: intersects[0].instanceId,
                        shiftKey: event.shiftKey,
                        getBinContent: function () {
                           const position = histogram.computePositionFromIndex(intersects[0].instanceId);
                           return histogram.rootObj.getBinContent(position.x, position.y, position.z);
                        },
                        getBinPosition: function () {
                           return histogram.computePositionFromIndex(intersects[0].instanceId);
                        }
                     }
                  }))
               }
            }
         });
      },

         updateRaycaster: function (event) {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);

            const intersects = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children);

            if (intersects.length > 0 && intersects[0].object.isInstancedMesh) {
               const hit = intersects[0];

               if (this.dirtyInstance.instancedMesh === hit.object &&
                  this.dirtyInstance.instanceId === hit.instanceId) {
                  return;
               }

               const histogram = hit.object.parent.el.components['histogram'];

               if (this.dirtyInstance.instancedMesh && this.dirtyInstance.instanceId != null) {
                  this.sendInstanceHoverEvent('end', this.dirtyInstance.instancedMesh, this.dirtyInstance.instanceId);
               }

               this.sendInstanceHoverEvent('start', hit.object, hit.instanceId);

               this.dirtyInstance = {
                  instancedMesh: hit.object,
                  instanceId: hit.instanceId,
               };

            } else {
               if (this.dirtyInstance.instancedMesh && this.dirtyInstance.instanceId != null) {
                  this.sendInstanceHoverEvent('end', this.dirtyInstance.instancedMesh, this.dirtyInstance.instanceId);
                  this.dirtyInstance = {
                     instancedMesh: undefined,
                     instanceId: undefined
                  };
               }
            }
         },


      sendInstanceHoverEvent: function (phase, instancedMesh, instanceId) {
         const histogram = instancedMesh.parent.el.components['histogram'];

         instancedMesh.parent.el.dispatchEvent(new CustomEvent("instance-hover", {
            detail: {
               instancedMesh,
               instanceId,
               phase,
               getBinContent: function () {
                  const pos = histogram.computePositionFromIndex(instanceId);
                  return histogram.rootObj.getBinContent(pos.x, pos.y, pos.z);
               },
               getBinPosition: function () {
                  return histogram.computePositionFromIndex(instanceId);
               }
            }
         }));
      },

      computePositionFromIndex: function (index) {
         const dimensions = {
            x: this.rootObj.fXaxis.fNbins,
            y: this.rootObj.fYaxis.fNbins,
            z: this.rootObj.fZaxis.fNbins
         }
         const medzi = index % (dimensions.x * dimensions.y);

         let x = medzi % dimensions.x;
         if (x === 0) x = dimensions.x;
         const y = Math.ceil(medzi / dimensions.x);
         const z = Math.floor(index / (dimensions.x * dimensions.y));
         console.log(`pos: x: ${x}, y: ${y}, z: ${z + 1}`);
      },
   })

}

export default registerNdmvrRaycasterComponent;