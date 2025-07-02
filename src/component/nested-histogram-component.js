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

         this.sub = functionSubjectGet().getObservable()
            .pipe(filter(e =>
               (e.target.entity === this.attrName) && ((e.target.id.includes('*')) || (e.target.id.includes(this.data.id)))))
            .subscribe((f) => {
               if (!this.instancedMesh) return;
               if (f.flag === 'add') {
                  this.instancedMesh.addEvent(f.event, f.function);
                  // this.el.addEventListener(f.event, f.function);
               } else if (f.flag === 'remove') {
                  this.el.removeEventListener(f.event, f.function);
               }
            });

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