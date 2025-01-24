import subject from "../rxjs/subject.js";

const registerHistogramComponent = () => {
   AFRAME.registerComponent("histogram", {
      schema: {
         color: {type: "color", default: "#4CC3D9"}, // default color of the box
         position: {type: "vec3", default: {x: 0, y: 0, z: -5}}, // default position
      },
      init: function () {
         const box = document.createElement("a-box");

         box.setAttribute("color", this.data.color);
         box.setAttribute("position", this.data.position);

         this.el.appendChild(box);
         console.log('sub');
         this.sub = subject.subscribe({
            next: (v) => console.log(v),
         });
      },
      remove: function () {
         console.log('unsub');
         this.sub.unsubscribe();
      }
   });
}

export default registerHistogramComponent;