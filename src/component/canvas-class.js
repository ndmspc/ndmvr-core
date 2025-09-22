import { canvasSubjectGet } from '../rxjs/CanvasSubject.js'
import { filter } from 'rxjs'
import { makeImage } from 'jsroot'
import { configSubjectGet } from '../rxjs/ConfigSubject.js'

export class CanvasClass {
  plane = undefined
  cinemaSub = undefined
  position
  rotation
  scale
  id
  configSub = undefined

  constructor (image, position, rotation, scale, id) {
    const geometry = new THREE.PlaneGeometry(scale.x, scale.y)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHex(0xffffff),
      side: THREE.DoubleSide,
    })
    if (!this.plane) {
      this.plane = new THREE.Mesh(geometry, material)
      this.plane.position.set(position.x, position.y, position.z)
    }

    if (image) {
      this.updateTexture(image)
    }

    this.id = id
    this.position = position
    this.rotation = rotation
    this.scale = scale

    this.cinemaSub = canvasSubjectGet()
      .getObservable()
      .pipe(filter((e) => e.id === this.id))
      .subscribe((obj) => {
        console.log('obj: ', obj)
        const object = obj.obj
        makeImage({ format: 'png', object, width: 1200, height: 600 }).then(
          (png) => {
            this.updateTexture(png)
          },
        )
      })

    this.configSub = configSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) => e.target.id.includes('*') || e.target.id.includes(this.id),
        ),
      )
      .subscribe((v) => {
        this.position = v.config.canvas.position
        this.rotation = v.config.canvas.rotation
        this.scale = v.config.canvas.scale
        this.updateMesh()
      })
  }

  updateMesh () {
    this.plane.scale.set(this.scale.x, this.scale.y, this.scale.z)
    this.plane.position.set(this.position.x, this.position.y, this.position.z)
    const factor = Math.PI / 180
    this.plane.rotation.set(
      this.rotation.x * factor,
      this.rotation.y * factor,
      this.rotation.z * factor,
    )
  }

  updateTexture (image) {
    if (!image) {
      console.warn('updateTexture called with null/undefined')
      return
    }

    const loader = new THREE.TextureLoader()

    if (
      typeof image === 'string' &&
      (image.startsWith('data:') || image.startsWith('http'))
    ) {
      loader.load(
        image,
        (texture) => {
          this.plane.material.map = texture
          this.plane.material.needsUpdate = true
        },
        undefined,
        (err) => console.error('Texture load failed', err),
      )
    } else if (image instanceof HTMLImageElement) {
      const texture = new THREE.Texture(image)
      texture.needsUpdate = true
      this.plane.material.map = texture
      this.plane.material.needsUpdate = true
    } else {
      console.error('Unsupported image type passed to updateTexture:', image)
    }
  }

  remove () {
    this.plane.parent.remove(this.plane)
    this.cinemaSub.unsubscribe()
    this.configSub.unsubscribe()
  }

  getPlane () {
    return this.plane
  }
}
