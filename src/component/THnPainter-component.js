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
      this.nativeRevision = 0;
      this.histoSub = histogramSubjectGet().getStream(this.el.id)
        .subscribe((histo) => {
          const nativeRevision = ++this.nativeRevision;
          if (histo?.opts?.render === "jsroot") {
            if (this.nestedHistogram) {
              this.nestedHistogram.remove();
              this.nestedHistogram = undefined;
            }

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
                if (this.nativeRevision === nativeRevision && this.jsrootHistogram === painter) {
                  console.error("JSROOT histogram render failed:", error);
                }
              });
              if (!updating) this.el.object3D.add(painter.getHistogramMesh());
            } catch (error) {
              if (this.nativeRevision === nativeRevision) console.error("JSROOT histogram initialization failed:", error);
            }
          } else {
            if (this.jsrootHistogram) {
              this.jsrootHistogram.remove();
              this.jsrootHistogram = undefined;
            }

            try {
              const updating = !!this.nestedHistogram;
              const painter = this.nestedHistogram ?? new THnPainter(histo, this.el.id);
              this.nestedHistogram = painter;
              const render = updating ? painter.updateHistogram(histo)
                : painter.renderHistogram(0, painter.totalInstances, 0);
              render.then(() => {
                if (this.nativeRevision !== nativeRevision || this.nestedHistogram !== painter) return;
                this.el.object3D.add(painter.wireframe.wireframe, painter.mesh, painter.axes.axes);
                if (painter.errorCross) this.el.object3D.add(painter.errorCross.lines);
              }).catch(error => {
                if (this.nativeRevision === nativeRevision) console.error("Native histogram render failed:", error);
              });
            } catch (error) {
              console.error("Native histogram initialization failed:", error);
            }
          }
        });
    },

    remove: function () {
      this.nativeRevision++;
      this.histoSub?.unsubscribe();
      this.nestedHistogram?.remove();
      this.jsrootHistogram?.remove();
      this.nestedHistogram = undefined;
      this.jsrootHistogram = undefined;
    },

  });
};

export default registerTHnPainterComponent;
