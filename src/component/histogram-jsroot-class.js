import {configSubjectGet} from "../rxjs/ConfigSubject.js";
import {filter} from "rxjs";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import {draw} from "jsroot";
import {NestedHistogram} from "./nested-histogram-class.js";


export class HistogramJsrootClass {

    framePainter = undefined;
    histogramGroup = undefined;
    id = undefined;
    configSub = undefined;
    rootObj = undefined;
    histoSub = undefined;
    dummyEl = undefined;

    constructor(id) {
        this.id = id;
        this.histogramGroup = new THREE.Group();
        this.dummyEl = document.createElement('div');
        this.dummyEl.id = "dummyDiv";
        document.querySelector("#app").appendChild(this.dummyEl);

        // const geom = new THREE.BoxGeometry(1,1,1);
        // const mate = new THREE.MeshNormalMaterial();
        // const cube = new THREE.Mesh(geom, mate);
        // cube.position.set(2,0,-4);
        // this.histogramGroup.add(cube)

        this.configSub = configSubjectGet().getObservable()
            .pipe(filter(e =>
                ((e.target.id.includes('*')) || (e.target.id.includes(this.id)))))
            .subscribe((v) => {
                console.log('dojde config');
                console.log(v.config.TH1ZScale);
                this.config = v.config;
                console.log(this.config.TH1ZScale);
            });

        this.histoSub = histogramSubjectGet().getStream()
            .pipe(
                filter(e => e.id === this.id)
            )
            .subscribe((histo) => {
                console.log(histo)
                // if (this.framePainter) {
                //     this.instancedMesh.remove();
                // }

                if (!this.framePainter) {
                    draw("dummyDiv", histo.histogram).then(retValue => {
                        this.framePainter = retValue.getFramePainter();
                        console.log(this.framePainter.scene)
                        this.histogramGroup.clear();
                        if (this.framePainter.scene.children[0]) {
                            this.framePainter.scene.children[0].scale.set(0.01, 0.01, 0.05);

                            this.framePainter.scene.children[0].children[0].children
                                .filter(child => child.type === "Object3D")
                                .forEach(child =>{
                                    child.children
                                        .filter(childX => childX.type === "Mesh")
                                        .forEach(childX => childX.scale.set(5, 1.7, 5))
                                })
                            this.framePainter.scene.children[0].rotateX(-Math.PI / 2);
                            this.histogramGroup.add(this.framePainter.scene.children[0]);
                        }
                    })
                } else {
                    draw("dummyDiv", histo.histogram).then(retValue => {
                        this.histogramGroup.clear();
                        console.log(retValue.getFramePainter().scene);
                        if (this.framePainter.scene.children[1]) {
                            this.framePainter.scene.children[1].scale.set(0.01, 0.01, 0.05);

                            this.framePainter.scene.children[1].children[0].children
                                .filter(child => child.type === "Object3D")
                                .forEach(child =>{
                                    child.children
                                        .filter(childX => childX.type === "Mesh")
                                        .forEach(childX => childX.scale.set(5, 1.7, 5))
                                })
                            this.framePainter.scene.children[1].rotateX(-Math.PI / 2);
                            this.histogramGroup.add(this.framePainter.scene.children[1]);
                        }
                    })
                }

            });
    }

    getHistogramMesh() {
        return this.histogramGroup;
    }

    getFramePainter() {
        return this.framePainter;
    }
}