import {functionSubjectGet} from "../rxjs/FunctionSubject.js";
import {filter} from "rxjs";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import RadixCounter from "../utils/radixCounter.js";
import {computeAFrameBinSizePos, rootSizePosToAFrame} from "../utils/histogramRenderUtils.js";
import {distance} from "three/tsl";
import NestedHistogram from "./nested-histogram-class.js";

const registerNestedHistogramComponent = () => {
   AFRAME.registerComponent("nested-histogram", {
      schema: {
         bin_padding_x: {type: "number", default: 1},
         bin_padding_y: {type: "number", default: 1},
         bin_padding_z: {type: "number", default: 0.1},
      },

      instancedMesh: undefined,

      init: function () {

         // this.sub = functionSubjectGet().getObservable()
         //    .pipe(filter(e =>
         //       (e.target.entity === this.attrName) && ((e.target.id.includes('*')) || (e.target.id.includes(this.data.id)))))
         //    .subscribe((f) => {
         //       if (f.flag === 'add') {
         //          this.el.addEventListener(f.event, f.function);
         //       } else if (f.flag === 'remove') {
         //          this.el.removeEventListener(f.event, f.function);
         //       }
         //    });

         this.histoSub = histogramSubjectGet().getStream()
            .pipe(
               filter(e => e.id === this.el.id)
            )
            .subscribe((histo) => {
               if (this.instancedMesh) {
                  this.instancedMesh.remove();
               }
               this.instancedMesh = new NestedHistogram(this.data.bin_padding_x, this.data.bin_padding_y, this.data.bin_padding_z);
               this.instancedMesh.init(histo);
               this.el.object3D.add(this.instancedMesh.instancedMesh);
               this.instancedMesh.renderHistogram(0, this.instancedMesh.totalInstances, 0);

               // this.rootObj = histo.histogram;
               // this.maxInstancesPerLayer = this.computeMaxInstancesPerLayer();
               // console.log(this.maxInstancesPerLayer)
               // this.matrixCache = new Array(this.maxInstancesPerLayer.length).fill().map(() => []);
               // this.totalInstances = this.maxInstancesPerLayer
               //    .reduce((acc, value) => {
               //       return acc * value;
               //    }, 1);
               //
               // const geometry = new THREE.BoxGeometry(1, 1, 1);
               // const material = new THREE.MeshPhongMaterial({color: 0xaaaaaa});
               // // const material = new THREE.MeshMatcapMaterial({color: 0xaaaaaa});
               // this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.totalInstances);
               // const dummy = new THREE.Object3D();
               // dummy.scale.set(0, 0, 0);
               // dummy.updateMatrix();
               // for (let i = 0; i < this.totalInstances; i++) {
               //    this.instancedMesh.setMatrixAt(i, dummy.matrix);
               // }
               // // this.instancedMesh.frustrumCulled = false
               // this.instancedMesh.frustumCulled = false;
               // this.instancedMesh.instanceMatrix.needsUpdate = true;
               // this.el.object3D.add(this.instancedMesh);
               //
               // this.renderHistogram(0, this.totalInstances, 0);
               // console.log(this.rootObj)
               // console.log(this.matrixCache)
               // this.matrixCache = [];
            });
      },

      remove: function () {
         this.histoSub.unsubscribe();
         this.sub.unsubscribe();
         // this.instancedMesh.dispose();
         this.matrixCache = [];
      },

   })
}

export default registerNestedHistogramComponent;