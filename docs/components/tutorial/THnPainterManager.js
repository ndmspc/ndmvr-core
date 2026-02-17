import { histogramSubjectGet } from "ndmvr-core";
import { THnPainter } from "ndmvr-core";
import { HistogramJsrootClass } from "ndmvr-core";
import { getCameraComponent } from "ndmvr-core";

class THnPainterManager {
  constructor(elementId, scene, camera) {
    this.elementId = elementId;
    this.scene = scene;
    this.camera = camera;
    this.nestedHistogram = undefined;
    this.jsrootHistogram = undefined;
    this.histoSub = null;
    this.init();
  }

  init() {
    this.histoSub = histogramSubjectGet()
      .getStream(this.elementId)
      .subscribe((histo) => {
        if (histo?.opts?.render === "jsroot") {
          this.handleJsrootHistogram(histo);
        } else {
          this.handleNestedHistogram(histo);
        }
      });
  }

  handleJsrootHistogram(histo) {
    // Remove nested histogram if exists
    if (this.nestedHistogram) {
      this.nestedHistogram.remove();
      this.nestedHistogram = undefined;
    }

    // Update or create jsroot histogram
    if (this.jsrootHistogram) {
      this.jsrootHistogram.updateHistogram(histo.obj);
    } else {
      this.jsrootHistogram = new HistogramJsrootClass(
        this.elementId,
        histo.obj,
        this.camera
      );
      this.scene.add(this.jsrootHistogram.getHistogramMesh());
    }
  }

  handleNestedHistogram(histo) {
    // Remove jsroot histogram if exists
    if (this.jsrootHistogram) {
      this.jsrootHistogram.remove();
      this.jsrootHistogram = undefined;
    }

    // Update or create nested histogram
    if (this.nestedHistogram) {
      this.nestedHistogram.updateHistogram(histo, histo?.opts);
    } else {
      this.nestedHistogram = new THnPainter(histo, this.elementId);
      this.scene.add(this.nestedHistogram.wireframe.wireframe);
      this.scene.add(this.nestedHistogram.mesh);
    }
  }

  remove() {
    if (this.histoSub) {
      this.histoSub.unsubscribe();
    }

    if (this.nestedHistogram) {
      this.nestedHistogram.remove();
    }

    if (this.jsrootHistogram) {
      this.jsrootHistogram.remove();
    }
  }
}

export default THnPainterManager;