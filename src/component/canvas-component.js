import { CanvasClass } from './canvas-class.js'

const registerCanvasComponent = () => {
  AFRAME.registerComponent('canvas-component', {
    schema: {
      position: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
      rotation: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
      scale: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
    },

    canvas: undefined,

    init: function () {
      this.canvas = new CanvasClass(
        null,
        this.data.position,
        this.data.rotation,
        this.data.scale, this.el.id)

      this.el.object3D.add(this.canvas.getPlane())
    },

    remove: function () {
    }
  })
}

export default registerCanvasComponent