import "aframe";
import { parse } from "jsroot";
import { computeAFrameBinSizePos, stringToXYZ } from "../utils/histogramRenderUtils.js";
import { histogramSubjectGet } from "../rxjs/HistogramSubject.js";
import { filter } from "rxjs";
import { functionSubjectGet } from "../rxjs/FunctionSubject.js";
import { HistogramJsrootClass } from "./histogram-jsroot-class.js";
import { NestedHistogram } from "./nested-histogram-class.js";
import { parseConfig } from "../utils/baseUtil.js";
import { configSubjectGet } from "../rxjs/ConfigSubject.js";

const registerHistogramComponent = () => {

  AFRAME.registerComponent("histogram", {
    schema: {
      bin_padding_x: { type: "number", default: 0.1 },
      bin_padding_y: { type: "number", default: 0.1 },
      bin_padding_z: { type: "number", default: 0.1 },
    },
    nestedHistogram: undefined,
    jsrootHistogram: undefined,
    histogramSub: undefined,

    init: function () {
      this.histoSub = histogramSubjectGet().getStream(this.el.id)
        .subscribe((histo) => {
          // histo.opts = histo.opts || {};
          // histo.opts.config = parseConfig(histo.opts.config);
          // console.log('prislo: ', histo.id, ',k: ', this.el.id, ', h: ', histo)
          // histo.opts ??= {};
          // histo.opts.render = 'nested';

          if (histo?.opts?.render === "jsroot") {
            if (this.nestedHistogram) {
              this.nestedHistogram.remove();
              this.nestedHistogram = undefined;
            }

            if (this.jsrootHistogram) {
              this.jsrootHistogram.updateHistogram(histo.histogram);
            } else {
              this.jsrootHistogram = new HistogramJsrootClass(this.el.id, histo.histogram);
              this.el.object3D.add(this.jsrootHistogram.getHistogramMesh());
            }
          } else {
            if (this.jsrootHistogram) {
              this.jsrootHistogram.remove();
              this.jsrootHistogram = undefined;
            }

            if (this.nestedHistogram) {
              this.nestedHistogram.updateHistogram(histo, histo?.opts);
            } else {
              this.nestedHistogram = new NestedHistogram(
                this.data.bin_padding_x,
                this.data.bin_padding_y,
                this.data.bin_padding_z,
                histo, this.el.id, histo?.opts);
              this.el.object3D.add(this.nestedHistogram.instancedMesh);
              this.el.object3D.add(this.nestedHistogram.wireframe.wireframe);
            }
          }
        });
    },

    remove: function () {
      if (this.nestedHistogram) this.nestedHistogram.remove();
    },

  });
};

export default registerHistogramComponent;
