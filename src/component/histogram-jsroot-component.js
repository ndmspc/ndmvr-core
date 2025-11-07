import { HistogramJsrootClass } from "./histogram-jsroot-class.js";
import { histogramSubjectGet } from "../rxjs/HistogramSubject.js";
import { filter } from "rxjs";
import { getCameraComponent } from "./camera.component.js";

const registerHistogramJsrootComponent = () => {
  AFRAME.registerComponent("jsroot-histogram", {

    jsrootHistogram: undefined,
    histoSub: undefined,

    init: function () {

      this.histoSub = histogramSubjectGet().getStream()
        .pipe(
          filter(e => e.id === this.el.id)
        )
        .subscribe((histo) => {
          if (this.jsrootHistogram) {
            this.jsrootHistogram.updateHistogram(histo.obj);
          } else {
            this.jsrootHistogram = new HistogramJsrootClass(
              this.el.id,
              histo.obj,
              getCameraComponent().object3D.children[0].children[0],
            );
            this.jsrootHistogram.render();
            this.el.object3D.add(this.jsrootHistogram.getHistogramMesh());
          }
        });
    },

    remove () {
      this.jsrootHistogram.remove();
    }

  });
};

export default registerHistogramJsrootComponent;