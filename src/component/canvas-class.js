import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";
import { filter } from "rxjs";
import { makeImage } from "jsroot";
import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import {Vector3, PlaneGeometry, MeshBasicMaterial, Color, DoubleSide, Mesh, TextureLoader, Texture} from "three";


export class CanvasClass {
  plane = undefined;
  cinemaSub = undefined;
  position;
  rotation;
  scale;
  id;
  configSub = undefined;

  constructor (image, position, rotation, scale, id) {
    const geometry = new PlaneGeometry(scale.x, scale.y);
    const material = new MeshBasicMaterial({
      color: new Color().setHex(0xffffff),
      side: DoubleSide,
    });
    if (!this.plane) {
      this.plane = new Mesh(geometry, material);
      this.plane.position.set(position.x, position.y, position.z);
    }

    if (image) {
      this.updateTexture(image);
    }

    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;

    this.cinemaSub = canvasSubjectGet()
      .getObservable()
      .pipe(filter((e) => (e.id === this.id) || (e.id === "*")))
      .subscribe((obj) => {
        console.log("Caught at: ", this.id);
        const object = obj.obj;
        makeImage({ format: "png", option: "pE", object, width: 1200, height: 600 }).then(
          (png) => {
            this.updateTexture(png);
          },
        );
      });

    this.configSub = configSubjectGet()
      .getObservable()
      .pipe(
        filter(
          (e) => e.target.id.includes("*") || e.target.id.includes(this.id),
        ),
      )
      .subscribe((v) => {
        const limits = v.config.environment.canvas.filter(canvas => canvas.id === this.id || canvas.id === "*");
        if (limits.length === 0) return;
        this.position = limits[0].limits.position;
        this.rotation = limits[0].limits.rotation;
        this.scale = limits[0].limits.scale;
        this.updateMesh();
      });
  }


  updateMesh () {
    this.plane.scale.set(this.scale.x, this.scale.y, this.scale.z);
    this.plane.position.set(this.position.x, this.position.y, this.position.z);
    const factor = Math.PI / 180;
    this.plane.rotation.set(
      this.rotation.x * factor,
      this.rotation.y * factor,
      this.rotation.z * factor,
    );
  }

  updateTexture (image) {
    if (!image) {
      console.warn("updateTexture called with null/undefined");
      return;
    }

    const loader = new TextureLoader();

    if (
      typeof image === "string" &&
      (image.startsWith("data:") || image.startsWith("http"))
    ) {
      loader.load(
        image,
        (texture) => {
          this.plane.material.map = texture;
          this.plane.material.needsUpdate = true;
        },
        undefined,
        (err) => console.error("Texture load failed", err),
      );
    } else if (image instanceof HTMLImageElement) {
      const texture = new Texture(image);
      texture.needsUpdate = true;
      this.plane.material.map = texture;
      this.plane.material.needsUpdate = true;
    } else {
      console.error("Unsupported image type passed to updateTexture:", image);
    }
  }

  remove () {
    if (!this.plane.parent) return;
    this.plane.parent.remove(this.plane);
    this.cinemaSub.unsubscribe();
    this.configSub.unsubscribe();
  }

  getPlane () {
    return this.plane;
  }
}
