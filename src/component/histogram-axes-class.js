import { build3d } from "../modules/build/jsroot-build3d.mjs";
import { Box3, Object3D, Vector3 } from "three";
import { configSubjectGet } from "../rxjs/ConfigSubject.js";
import { filter } from "rxjs";
import cloneDeep from "lodash.clonedeep";

export default class HistogramAxesClass {
  id = undefined;
  configSub = undefined;
  config = undefined;
  axes = undefined;
  axesBuildPromise = undefined;
  axesBuildVersion = 0;

  constructor (id) {
    this.id = id;
    this.axes = new Object3D();
    this.axes.raycast = () => {};
    this.configSub = configSubjectGet().getObservable()
      .pipe(filter(e =>
        ((e.target.id.includes("*")) || (e.target.id.includes(this.id)))))
      .subscribe((v) => {
        this.axesBuildVersion++;
        this.config = {...v.config};
        const matrix = this.config.environment.histogramPads.find(el => el.id === this.id);
        const pos = matrix.position;
        this.axes.position.set(pos.x, pos.y, pos.z);
      });
  }

  buildAxes(obj, limits, valueAxis, opts) {
    const buildVersion = ++this.axesBuildVersion;
    const matrixScale = new Vector3(limits.scale.x, limits.scale.y, limits.scale.z);
    const type = obj._typename;
    // JSROOT may annotate nested axes too; keep its input separate from bin data.
    const axesObj = cloneDeep(obj);
    const Th1Factor = type.substring(2, 3) === '1'
      ? this.config.histogram.TH1ZScale.layer[0] ?? this.config.histogram.TH1ZScale.default
      : 1;
    if (type.substring(2, 3) !== '3') {
      const sameMinMax = valueAxis.min === valueAxis.max;
      axesObj.fMaximum = valueAxis.max;
      if (!sameMinMax) {
        axesObj.fMinimum = valueAxis.min;
      } else if (Math.abs(valueAxis.max) < Number.MAX_VALUE) {
        axesObj.fMinimum = valueAxis.min - (Math.abs(valueAxis.max) * 0.1)
      }
      axesObj._typename = "TH2D";
    }

    this.axesBuildPromise = build3d(axesObj, opts, true).then((axes) => {
      // A newer build or configuration owns the displayed axes now.
      if (buildVersion !== this.axesBuildVersion) return;
      while (this.axes.children.length > 0) this.axes.remove(this.axes.children[0]);
      const boundBox = new Box3()
        .expandByObject(axes.children[0].children[13])
        .expandByObject(axes.children[0].children[16])
        .expandByObject(axes.children[0].children[20])

      const boundBox2 = new Box3()
        .expandByObject(axes)

      const size = new Vector3();
      boundBox2.getSize(size);

      axes.scale.set(
        matrixScale.x / size.x,
        (matrixScale.z / size.y) * Th1Factor,
        matrixScale.y / size.z
      );

      const factor = new Vector3(
        (boundBox.max.x - boundBox.min.x) / (boundBox2.max.x - boundBox2.min.x),
        (boundBox.max.z - boundBox.min.z) / (boundBox2.max.z - boundBox2.min.z),
        (boundBox.max.y - boundBox.min.y) / (boundBox2.max.y - boundBox2.min.y)
      )

      axes.rotateX(-Math.PI / 2);
      const translateFactorZ = (size.z - (boundBox.max.z - boundBox.min.z)) * (matrixScale.y / size.z);
      axes.translateZ((-matrixScale.y / 2) + translateFactorZ);
      axes.traverse(obj => {
        obj.raycast = () => {};
      });
      this.axes.add(axes);

      //13 => x
      //16 => z
      //20 => y
      return { scaleFactor: factor, translateFactorZ };
    });
    return this.axesBuildPromise;
  }


}
