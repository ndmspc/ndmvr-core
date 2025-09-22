import { functionSubjectGet } from '../rxjs/FunctionSubject.js'
import { filter } from 'rxjs'
import { histogramSubjectGet } from '../rxjs/HistogramSubject.js'
import RadixCounter from '../utils/radixCounter.js'
import { computeAFrameBinSizePos, rootSizePosToAFrame } from '../utils/histogramRenderUtils.js'
import { distance } from 'three/tsl'
import { NestedHistogram } from './nested-histogram-class.js'

const registerNestedHistogramComponent = () => {
  AFRAME.registerComponent('nested-histogram', {
    schema: {
      bin_padding_x: { type: 'number', default: 0.1 },
      bin_padding_y: { type: 'number', default: 0.1 },
      bin_padding_z: { type: 'number', default: 0.1 },
    },

    instancedMesh: undefined,

    init: function () {

      this.histoSub = histogramSubjectGet().getStream()
        .pipe(
          filter(e => e.id === this.el.id)
        )
        .subscribe((histo) => {
          if (this.instancedMesh) {
            this.instancedMesh.remove()
          }
          this.instancedMesh = new NestedHistogram(
            this.data.bin_padding_x,
            this.data.bin_padding_y,
            this.data.bin_padding_z,
            histo, this.el.id)
          this.instancedMesh.init()
          this.el.object3D.add(this.instancedMesh.instancedMesh)
          this.el.object3D.add(this.instancedMesh.wireframe.wireframe)
          this.instancedMesh.renderHistogram(0, this.instancedMesh.totalInstances, 0)
          console.log(this.el.object3D)
        })
    },

    remove: function () {
      this.histoSub.unsubscribe()
      this.el.object3D.remove(this.instancedMesh.instancedMesh)
    },

  })
}

export default registerNestedHistogramComponent