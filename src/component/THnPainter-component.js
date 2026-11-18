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

    /**
     * Take the native painter's meshes out of the scene without destroying the painter.
     *
     * The two renderers share one component, so switching to jsroot used to `remove()` the painter — and with
     * it the pointer that holds the level the reader had drilled to. Keeping the painter alive over the jsroot
     * interlude is what lets the switch come back to that level: on the way back it is updated in place, and
     * the update carries the path across.
     */
    detachNative: function () {
      const painter = this.nestedHistogram;
      if (!painter) return;
      const parts = [painter.wireframe?.wireframe, painter.mesh, painter.axes?.axes, painter.errorCross?.lines]
        .filter(Boolean);
      if (parts.length) this.el.object3D.remove(...parts);
    },

    init: function () {
      this.nativeRevision = 0;
      this.histoSub = histogramSubjectGet().getStream(this.el.id)
        .subscribe((histo) => {
          const nativeRevision = ++this.nativeRevision;
          if (histo?.opts?.render === "jsroot") {
            this.detachNative();

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
              // A painter kept over the jsroot interlude is **updated**, not rebuilt: that is the path that
              // carries the drill across (see `detachNative`).
              const updating = !!this.nestedHistogram;
              const painter = this.nestedHistogram ?? new THnPainter(histo, this.el.id);
              this.nestedHistogram = painter;
              const render = updating ? painter.updateHistogram(histo)
                : painter.renderHistogram(0, painter.totalInstances, 0);
              render.then(() => {
                if (this.nativeRevision !== nativeRevision || this.nestedHistogram !== painter) return;
                // Attached here for both cases: a fresh painter has to be put in the scene, and one that
                // survived the jsroot interlude was detached, so its update had no parent to go back to.
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
