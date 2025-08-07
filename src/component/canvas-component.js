import {CanvasClass} from "./canvas-class.js";
import texture from "../assets/texture.jpeg";
import {makeImage} from "jsroot";
import {canvasSubjectGet} from "../rxjs/CanvasSubject.js";
import {filter} from "rxjs";

const registerCanvasComponent = () => {
    AFRAME.registerComponent("canvas-component", {
        schema: {
            position: {type: "vec3", default: {x: 0, y: 0, z: 0}},
            rotation: {type: "vec3", default: {x: 0, y: 0, z: 0}},
            scale: {type: "vec3", default: {x: 1, y: 1, z: 1}},
        },

        plane: undefined,
        cinemaSub: undefined,

        init: function () {

            this.cinemaSub = canvasSubjectGet().getObservable()
                .pipe(
                    filter(e => e.id === this.el.id)
                )
                .subscribe(obj => {
                    const object = obj.obj
                    makeImage({format: 'png', object, width: 600, height: 600}).then(png => {
                        if (this.plane) {
                            this.plane.getPlane().then(plane => {
                                this.el.object3D.remove(plane);
                            });
                        }
                        this.plane = new CanvasClass(
                            png,
                            this.data.position,
                            this.data.rotation,
                            this.data.scale);
                        this.plane.getPlane().then(plane => {
                            this.el.object3D.add(plane)
                        });
                    })
                });

        },

        remove: function() {
            this.cinemaSub.unsubscribe();
        }
    })
}

export default registerCanvasComponent;