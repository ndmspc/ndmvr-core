
const registerOculusController = () => {
   AFRAME.registerComponent("oculus-controller", {
      schema: {
      },

      init: function () {

         this.controllerLeft = document.createElement('a-entity');
         this.controllerLeft.setAttribute('meta-touch-controls', 'hand: left; model: true');
         this.controllerLeft.setAttribute('oculus-thumbstick-movement-controller', '');

         this.controllerRight = document.createElement('a-entity');
         this.controllerRight.id = "oculus-right";
         this.controllerRight.setAttribute('meta-touch-controls', 'hand: right');
         this.controllerRight.setAttribute('right-controller-logging', '');

         this.el.appendChild(this.controllerLeft);
         this.el.appendChild(this.controllerRight);
         this.controllerRight.addEventListener('loaded', () => {
            this.attachRayDebugLine(this.controllerRight);
         });
      },

      attachRayDebugLine: function (controllerEntity) {
         const controller = controllerEntity.object3D;

         const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
         const geometry = new THREE.BufferGeometry();
         const points = [new THREE.Vector3(), new THREE.Vector3(0, 0, -10)];
         geometry.setFromPoints(points);

         const line = new THREE.Line(geometry, material);
         line.name = "debug-ray-line";

         controller.add(line);
      },

   })
}

export default registerOculusController;