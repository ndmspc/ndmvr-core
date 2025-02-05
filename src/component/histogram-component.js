import "aframe";
import brokerManagerGet from "../service/brokerManager.js";
import functionSubjectGet from "../rxjs/FunctionSubject.js";
import dispatchSubjectGet from "../rxjs/DispatchSubject.js";
import {filter} from "rxjs";

const registerHistogramComponent = () => {
   AFRAME.registerComponent("histogram", {
      schema: {
         color: {type: "color", default: "#4CC3D9"}, // default color of the box
         position: {type: "vec3", default: {x: 0, y: 0, z: -5}}, // default position
         id: {type: 'number', default: 1}
      },

      init: function () {
         const box = document.createElement("a-box");
         box.setAttribute("color", this.data.color);
         box.setAttribute("position", this.data.position);
         box.setAttribute('class', 'clickable');

         this.el.appendChild(box);
         this.sub = functionSubjectGet().getObservable()
            .pipe(filter(e =>
               (e.target.entity === this.attrName) && ((e.target.id.includes('*')) || (e.target.id.includes(this.data.id)))))
            .subscribe((f) => {
               if (f.flag === 'add') {
                  box.addEventListener(f.event, f.function);
               } else if (f.flag === 'remove') {
                  box.removeEventListener(f.event, f.function);
               }
            });

         this.wsSub = brokerManagerGet().getSubject()
            .subscribe((v) => {
               console.log(v)
            });

         this.dispatchSub = dispatchSubjectGet()
            .getStream()
            .pipe(filter(v =>
               v.target === this.attrName
            ))
            .subscribe(v => {
               this.el.getChildren()[0].dispatchEvent(v.event);
               console.log('custom-event: ', v);
               // if you will have Bin and Histogram divided replace with line below
               // this.el.dispatchEvent(v.event);
            })
      },
      remove: function () {
         this.sub.unsubscribe();
         this.wsSub.unsubscribe();
         this.dispatchSub.unsubscribe();
      }
   });
}

export default registerHistogramComponent;