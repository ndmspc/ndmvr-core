import { HistogramJsrootClass } from "./histogram-jsroot-class.js";
import { histogramSubjectGet } from "../rxjs/HistogramSubject.js";
import { getCameraComponent } from "./camera.component.js";

const registerHistogramJsrootComponent = () => {
  AFRAME.registerComponent("jsroot-histogram", {

    jsrootHistogram: undefined,
    histoSub: undefined,

    init: function () {
      this.jsrootRevision = 0;
      this.histoSub = histogramSubjectGet().getStream(this.el.id)
        .subscribe((histo) => {
          const revision = ++this.jsrootRevision;
          try {
            const updating = !!this.jsrootHistogram;
            const painter = this.jsrootHistogram ?? new HistogramJsrootClass(
              this.el.id,
              histo.obj,
              getCameraComponent().object3D.children[0].children[0],
            );
            this.jsrootHistogram = painter;
            if (updating) painter.updateHistogram(histo.obj);
            Promise.resolve(painter.buildPromise).catch(error => {
              if (this.jsrootRevision === revision && this.jsrootHistogram === painter) {
                console.error("JSROOT histogram render failed:", error);
              }
            });
            if (!updating) this.el.object3D.add(painter.getHistogramMesh());
          } catch (error) {
            if (this.jsrootRevision === revision) console.error("JSROOT histogram initialization failed:", error);
          }
        });
    },

    remove () {
      this.jsrootRevision++;
      this.histoSub?.unsubscribe();
      this.jsrootHistogram?.remove();
      this.jsrootHistogram = undefined;
    }

  });
};

export default registerHistogramJsrootComponent;
