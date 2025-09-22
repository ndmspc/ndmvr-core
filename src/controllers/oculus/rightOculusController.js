import 'aframe'

/**
 * A-Frame interakčný komponent zabezpečí možnosť používateľa interagovať s pravým ovládačom zariadenia Oculus.
 * @component right-controller-logging
 * @module rightOculusAframeComponent
 */

const registerRightControllerLogging = () => {
  AFRAME.registerComponent('right-controller-logging', {
    init: function () {
      let gripActive = false
      const el = this.el
      this.dirtyInstance = null
      this.raycaster = this.el.sceneEl.components['ndmvr-raycaster'].raycaster
      // oculus listeners
      el.addEventListener('gripdown', () => {
        gripActive = true
      })
      el.addEventListener('gripup', () => {
        gripActive = false
      })
      el.addEventListener('thumbstickmoved', (event) => {
        if (gripActive) {
          // oculusThumbStickFunction(event)
        } else {
          // oculusThumbStickWithGripFunction(event)
        }
      })
      el.addEventListener('bbuttondown', () => {
        if (gripActive) {
          // oculusUpSection(false)
        } else {
          // oculusUpSection(true)
        }
      })
      el.addEventListener('abuttondown', () => {
        if (gripActive) {
          // oculusDownSection(false)
        } else {
          // oculusDownSection(true)
        }
      })
      el.addEventListener('thumbstickdown', () => {
        if (gripActive) {
          // oculusShowFunctionView()
        } else {
          // oculusShowDefaultView()
        }
      })
      el.addEventListener('triggerdown', () => {
        if (gripActive) {
          // oculusThumbStickMarkBin()
          // oculusRedrawHistogramBanners()
        } else {
          this.triggerDownClick()
        }
      })
    },

    tick: function () {
      this.checkHover()
    },

    update: function () {
      // oculusUpdateCameraReference()
    },

    checkHover: function () {
      const intersection = this.checkIntersection()
      if (intersection) {
        if (this.dirtyInstance !== intersection.instanceId) {
          this.dirtyInstance = intersection.instanceId
          intersection.object.parent.el.dispatchEvent(new CustomEvent('instance-hover', {
            detail: {
              instancedMesh: intersection.object,
              instanceId: intersection.instanceId
            }
          }))
        }
      }
    },

    checkIntersection: function () {
      const matrix = new THREE.Matrix4()
      matrix.identity().extractRotation(this.el.object3D.matrixWorld)
      origin = new THREE.Vector3()
      let direction = new THREE.Vector3(0, 0, -1) // Forward direction
      origin.setFromMatrixPosition(this.el.object3D.matrixWorld)
      direction.applyMatrix4(matrix)
      // this.drawRayDebugLine(origin, direction);

      this.raycaster.set(origin, direction)
      const intersects = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children)
      // console.log(intersects);

      if (intersects.length > 0) {
        return intersects.find(intersection => intersection.object.isInstancedMesh)
      }
      return null
    },

    triggerDownClick: function () {
      const intersection = this.checkIntersection()
      if (intersection) {
        intersection.object.parent.el.dispatchEvent(new CustomEvent('instance-click', {
          detail: {
            instancedMesh: intersection.object,
            instanceId: intersection.instanceId
          }
        }))
      }
    },

    drawRayDebugLine: function (origin, direction) {
      const length = 10 // How long the line should be
      const end = new THREE.Vector3().copy(origin).addScaledVector(direction, length)

      const material = new THREE.LineBasicMaterial({ color: 0xff0000 }) // Red color
      const geometry = new THREE.BufferGeometry().setFromPoints([origin, end])
      this.debugLine = new THREE.Line(geometry, material)

      this.el.sceneEl.object3D.add(this.debugLine)
    }
  })
}

export default registerRightControllerLogging
