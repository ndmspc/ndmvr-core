import {HistogramJsrootClass} from "./histogram-jsroot-class.js";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import {filter} from "rxjs";
import {NestedHistogram} from "./nested-histogram-class.js";

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
                        this.jsrootHistogram.updateHistogram(histo.histogram);
                    } else {
                        this.jsrootHistogram = new HistogramJsrootClass(this.el.id, histo.histogram);
                        this.jsrootHistogram.render();
                        this.el.object3D.add(this.jsrootHistogram.getHistogramMesh());
                    }
                });
        },

        remove() {
            this.jsrootHistogram.remove();
        }

    })
}

export default registerHistogramJsrootComponent;