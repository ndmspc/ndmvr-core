import "aframe";

const registerNdmvrRaycasterComponent = () => {
   AFRAME.registerComponent("ndmvr-raycaster", {
      schema: {},

      init: function () {
         this.raycaster = new THREE.Raycaster();
         this.mouse = new THREE.Vector2();
         this.setupRaycasting();
         this.histogram = document.getElementById('histogram1').components['nested-histogram'];
      },

      color: new THREE.Color(),
      instancedMesh: undefined,
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
            // this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            // this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            // // this.instancedMesh = document.getElementById('histogram1').object3D;
            //
            // this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
            // const instancedMesh = this.histogram.instancedMesh;
            //
            // const worldBoundingBox = instancedMesh.boundingBox.clone();
            // worldBoundingBox.applyMatrix4(instancedMesh.matrixWorld);
            // const target = new THREE.Vector3();
            //
            // if (!this.raycaster.ray.intersectBox(worldBoundingBox, target)) {
            //    // No hit at all
            //    // console.log('nehitlo')
            //    return null;
            // } else {
            //    const res = this.histogram.checkIntersection(this.raycaster.ray);
            //    if (res[0]){
            //       this.histogram.showChildHistogram(res[0].index)
            //       console.log(res);
            //    }
            // }


            // this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            // this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            // //
            // this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
            // const intersects = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children);
            //
            // if (intersects.length > 0) {
            //    console.log(intersects[0].instanceId)

               // const id = intersects[0].instanceId / 130;
               //
               // const histogram = intersects[0].object.parent.el.components['nested-histogram'];
               // this.rootObj = histogram.rootObj;
               // const pos = this.computePositionFromIndex(id);
               // console.log(histogram.rootObj)
               // console.log(histogram.rootObj.children['unlikepm'][histogram.rootObj.getBin(pos.x, pos.y, pos.z)])


               // if (intersects[0].object.isInstancedMesh === true) {
               //    const histogram = intersects[0].object.parent.el.components['histogram'];
               //    this.dirtyInstance = {
               //       instancedMesh: undefined,
               //       instancedId: undefined
               //    }
               //
               //    intersects[0].object.parent.el.dispatchEvent(new CustomEvent("instance-click", {
               //       detail: {
               //          instancedMesh: intersects[0].object,
               //          instanceId: intersects[0].instanceId,
               //          shiftKey: event.shiftKey,
               //          getBinContent: function () {
               //             const position = histogram.computePositionFromIndex(intersects[0].instanceId);
               //             return histogram.rootObj.getBinContent(position.x, position.y, position.z);
               //          },
               //          getBinPosition: function () {
               //             return histogram.computePositionFromIndex(intersects[0].instanceId);
               //          }
               //       }
               //    }))
               // }
            // }
         });
      },

      updateRaycaster: function (event) {
         this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
         this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
         // // this.instancedMesh = document.getElementById('histogram1').object3D;
         //
         this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
         this.raycaster._triggerSource = 'mousemove';
         const hits = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children, true);
         // const instancedMesh = this.histogram.instancedMesh;
         //
         // const worldBoundingBox = instancedMesh.boundingBox.clone();
         // worldBoundingBox.applyMatrix4(instancedMesh.matrixWorld);
         // const target = new THREE.Vector3();
         //
         // if (!this.raycaster.ray.intersectBox(worldBoundingBox, target)) {
         //    // No hit at all
         //    // console.log('nehitlo')
         //    return null;
         // } else {
         //    const res = this.histogram.checkIntersection(this.raycaster.ray);
         //    if (res[0]){
         //       // this.histogram.showChildHistogram(res[0].index)
         //       console.log(res);
         //    }
         // }

         // console.log('update')

         //---------ukazka INTERSECTU

         // this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
         // this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
         // this.raycaster.setFromCamera(this.mouse, this.el.sceneEl.camera);
         //
         // const intersects = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children);

         //-----------/ukazka INTERSECTU

         // const instancedMesh = this.histogram.instancedMesh;
         //
         // const worldBoundingBox = instancedMesh.boundingBox.clone();
         // worldBoundingBox.applyMatrix4(instancedMesh.matrixWorld);
         //
         // if (!this.raycaster.ray.intersectsBox(worldBoundingBox)) {
         //    // No hit at all
         //    // console.log('nehitlo')
         //    return null;
         // } else {
         //    // console.log('hitlo')
         //    // this.checkIntersection(0, this.instancedMesh.count - 1);
         //    // console.log(instancedMesh.count / 2 - 1)
         //    const res = this.histogram.checkIntersection(0, instancedMesh.count, this.raycaster);
         //    console.log(res);
         // }


         // const intersects = this.raycaster.intersectObject(this.instancedMesh.boundingSphere, true);
         // console.log(this.instancedMesh)
         // console.log(intersects)
         //
         // if (intersects.length > 0 && intersects[0].object.isInstancedMesh) {
         //    const hit = intersects[0];
         //
         //    if (this.dirtyInstance.instancedMesh === hit.object &&
         //       this.dirtyInstance.instanceId === hit.instanceId) {
         //       return;
         //    }
         //
         //    const histogram = hit.object.parent.el.components['histogram'];
         //
         //    if (this.dirtyInstance.instancedMesh && this.dirtyInstance.instanceId != null) {
         //       this.sendInstanceHoverEvent('end', this.dirtyInstance.instancedMesh, this.dirtyInstance.instanceId);
         //    }
         //
         //    this.sendInstanceHoverEvent('start', hit.object, hit.instanceId);
         //
         //    this.dirtyInstance = {
         //       instancedMesh: hit.object,
         //       instanceId: hit.instanceId,
         //    };
         //
         // } else {
         //    if (this.dirtyInstance.instancedMesh && this.dirtyInstance.instanceId != null) {
         //       this.sendInstanceHoverEvent('end', this.dirtyInstance.instancedMesh, this.dirtyInstance.instanceId);
         //       this.dirtyInstance = {
         //          instancedMesh: undefined,
         //          instanceId: undefined
         //       };
         //    }
         // }
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
         let dimensions;
         if (this.mappingHistogram) {
            dimensions = {
               x: this.mappingHistogram.fXaxis.fNbins,
               y: this.mappingHistogram.fYaxis.fNbins,
               z: this.mappingHistogram.fZaxis.fNbins
            }
         } else {
            dimensions = {
               x: this.rootObj.fXaxis.fNbins,
               y: this.rootObj.fYaxis.fNbins,
               z: this.rootObj.fZaxis.fNbins
            }
         }

         const level = 1 + index % (dimensions.x * dimensions.y);

         let x = level % dimensions.x;
         if (x === 0) x = dimensions.x;
         const y = Math.ceil(level / dimensions.x);
         const z = Math.floor(index / (dimensions.x * dimensions.y));
         const position = {x: x, y: y, z: z + 1};
         // console.log(`pos: x: ${x}, y: ${y}, z: ${z}`);
         return (position)
      },
   })

}

export default registerNdmvrRaycasterComponent;