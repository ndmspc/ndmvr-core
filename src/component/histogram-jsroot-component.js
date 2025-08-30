import {HistogramJsrootClass} from "./histogram-jsroot-class.js";

const registerHistogramJsrootComponent = () => {
    AFRAME.registerComponent("jsroot-histogram", {

        jsrootHistogram: undefined,

        init: function() {
            this.jsrootHistogram = new HistogramJsrootClass(this.el.id);
            this.el.object3D.add(this.jsrootHistogram.getHistogramMesh());
        }
    })
}

export default registerHistogramJsrootComponent;