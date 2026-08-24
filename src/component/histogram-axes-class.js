import { build3d } from "../modules/build/jsroot-build3d.mjs";
import { Box3, Object3D, Vector3 } from "three";
import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { filter } from "rxjs";

export default class HistogramAxesClass {
  id = undefined;
  configSub = undefined;
  config = undefined;
  axes = undefined;
  axesBuildPromise = undefined;

  constructor (id) {
    this.id = id;
    this.axes = new Object3D();
    this.configSub = configSubjectGet().getObservable()
      .pipe(filter(e =>
        ((e.target.id.includes("*")) || (e.target.id.includes(this.id)))))
      .subscribe((v) => {
        this.config = {...v.config};
        const matrix = this.config.environment.histogramPads.find(el => el.id === this.id);
      });
  }

  buildAxes(obj, limits, opts) {
    this.axesBuildPromise = build3d(obj, opts, true).then((axes) => {
      const matrixScale = this.config.environment.histogramPads.find(el => el.id === this.id)?.scale;
      const Th1Factor = obj._typename.substring(2, 3) === '1'
       ? this.config.histogram.TH1ZScale.layer[0] ?? this.config.histogram.TH1ZScale.default
       : 1;
      const boundBox = new Box3()
        .expandByObject(axes.children[0].children[13])
        .expandByObject(axes.children[0].children[16])
        .expandByObject(axes.children[0].children[20])
      const size = new Vector3();
      boundBox.getSize(size);

      axes.scale.set(
        matrixScale.x / size.x,
        (matrixScale.z / size.y) * Th1Factor,
        matrixScale.y / size.z
      );

      axes.rotateX(-Math.PI / 2);
      axes.translateX(matrixScale.x / 2);
      axes.translateY(matrixScale.y);
      this.axes.add(axes);
      //13 => x
      //16 => z
      //20 => y
    });
  }


}