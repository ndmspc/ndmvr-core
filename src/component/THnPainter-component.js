import { filter } from "rxjs";
import { histogramSubjectGet } from "../rxjs/HistogramSubject.js";
import { THnPainter } from "./THnPainter.js";
import { HistogramJsrootClass } from "./histogram-jsroot-class.js";
import { getCameraComponent } from "./camera.component.js";

const registerTHnPainterComponent = () => {
  AFRAME.registerComponent("thnpainter", {
    schema: {
    },

    nestedHistogram: undefined,

    init: function () {
      this.histoSub = histogramSubjectGet().getStream(this.el.id)
        .subscribe((histo) => {
          if (histo?.opts?.render === "jsroot") {
            if (this.nestedHistogram) {
              this.nestedHistogram.remove();
              this.nestedHistogram = undefined;
            }

            if (this.jsrootHistogram) {
              this.jsrootHistogram.updateHistogram(histo.obj);
            } else {
              this.jsrootHistogram = new HistogramJsrootClass(
                this.el.id,
                histo.obj,
                getCameraComponent().object3D.children[0].children[0],
              );
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
              this.nestedHistogram = new THnPainter(histo, this.el.id);
              this.nestedHistogram.renderHistogram(0, this.nestedHistogram.totalInstances, 0).then(() => {
                this.el.object3D.add(this.nestedHistogram.wireframe.wireframe);
                this.el.object3D.add(this.nestedHistogram.mesh);
              });
            }
          }
        });
    },

    remove: function () {
      this.histoSub.unsubscribe();
      // this.el.object3D.remove(this.instancedMesh.instancedMesh);
    },

  });
};

export default registerTHnPainterComponent;