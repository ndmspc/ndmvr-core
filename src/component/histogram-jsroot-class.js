import {configSubjectGet} from "../rxjs/ConfigSubject.js";
import {filter} from "rxjs";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import {draw} from "jsroot";


export class HistogramJsrootClass {

    framePainter = undefined;
    histogramGroup = undefined;
    id = undefined;
    configSub = undefined;
    rootObj = undefined;
    histoSub = undefined;
    dummyEl = undefined;

    constructor(id, rootObj) {
        this.id = id;
        this.rootObj = rootObj;
        this.histogramGroup = new THREE.Group();
        this.dummyEl = document.getElementById('dummyDiv');
        if (this.dummyEl) document.body.removeChild(this.dummyEl);

        this.dummyEl = document.createElement('div');
        this.dummyEl.id = "dummyDiv";
        document.body.appendChild(this.dummyEl);

        this.configSub = configSubjectGet().getObservable()
            .pipe(filter(e =>
                ((e.target.id.includes('*')) || (e.target.id.includes(this.id)))))
            .subscribe((v) => {
                this.config = v.config;
                const pos = this.config.jsrootHistogramMatrix.position;
                const scale = this.config.jsrootHistogramMatrix.scale;
                this.histogramGroup.position.set(pos.x, pos.y, pos.z);
                this.histogramGroup.scale.set(scale.x, scale.y, scale.z);
            });

        this.render();
    }

    updateHistogram(histo) {
        this.rootObj = histo;
        this.histogramGroup.clear();
        this.render();
    }

    render() {
        console.log('dojde', this.rootObj)
        const opts = this.rootObj._typename.substring(0, 3) === 'TH3'
            ? ""
            : "lego";
        if (!this.framePainter) {
            draw("dummyDiv", this.rootObj, opts).then(retValue => {
                this.framePainter = retValue.getFramePainter();
                this.histogramGroup.clear();
                if (this.framePainter.scene.children[0]) {
                    this.framePainter.scene.children[0].scale.set(0.01, 0.01, 0.05);

                    this.framePainter.scene.children[0].children[0].children
                        .filter(child => child.type === "Object3D")
                        .forEach(child => {
                            child.children
                                .filter(childX => childX.type === "Mesh")
                                .forEach(childX => childX.scale.set(5, 1.7, 5))
                        })
                    this.framePainter.scene.children[0].rotateX(-Math.PI / 2);
                    this.histogramGroup.add(this.framePainter.scene.children[0]);
                }
            })
        } else {
            draw("dummyDiv", this.rootObj, opts).then(retValue => {
                this.histogramGroup.clear();
                if (this.framePainter.scene.children[1]) {
                    this.framePainter.scene.children[1].scale.set(0.01, 0.01, 0.05);

                    this.framePainter.scene.children[1].children[0].children
                        .filter(child => child.type === "Object3D")
                        .forEach(child => {
                            child.children
                                .filter(childX => childX.type === "Mesh")
                                .forEach(childX => childX.scale.set(5, 1.7, 5))
                        })
                    this.framePainter.scene.children[1].rotateX(-Math.PI / 2);
                    this.histogramGroup.add(this.framePainter.scene.children[1]);
                }
            })
        }
        console.log(this.histogramGroup)
    }

    remove() {
        this.histogramGroup.parent.remove(this.histogramGroup);
        this.dummyEl = document.getElementById('dummyDiv');
        if (this.dummyEl) document.body.removeChild(this.dummyEl);
        this.configSub.unsubscribe();
    }

    getHistogramMesh() {
        return this.histogramGroup;
    }

    getFramePainter() {
        return this.framePainter;
    }
}