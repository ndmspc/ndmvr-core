const registerHistogramBorderComponent = () => {
  AFRAME.registerComponent("histogram-border", {
    schema: {},

    boundaryBox: undefined,

    init: function () {
      const instancedMesh = this.el.components["histogram"].instancedMesh;

      //uses world transform
      const boundaryBox = new THREE.Box3().setFromObject(this.el.object3D);

      //add object expects local coords, so conversion from world to local coords is must.
      const inverseMatrixWorld = new THREE.Matrix4().copy(this.el.object3D.matrixWorld).invert();
      boundaryBox.applyMatrix4(inverseMatrixWorld);

      let count = 0;
      let obj = this.el.object3D.parent;

      while (obj) {
        count++;
        obj = obj.parent;
      }

      // console.log(count);

      const color = new THREE.Color(255, 0, 0);
      const hue = (count / 3) % 1;
      color.setHSL(hue, 0.9, 0.3);

      const helper = new THREE.Box3Helper(boundaryBox, color);
      helper.raycast = () => {};
      this.boundaryBox = helper;
      this.el.object3D.add(helper);

    },

    remove: function () {
      this.el.object3D.remove(this.boundaryBox);
    },
  });
};

export default registerHistogramBorderComponent;