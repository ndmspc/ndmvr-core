import BinInfoVisualizer from "./bininfo-jsroot-class.js";
import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";
import {create, build3d} from "jsroot";
import { getCameraComponent } from "./camera.component.js";
import { binInfoSubjectGet } from "../rxjs/BinInfoSubject.js";

const registerBinInfoJsrootComponent = () => {
  AFRAME.registerComponent("bininfo-jsroot", {

    binInfo: undefined,
    binInfoSub: undefined,

    init: function () {

      this.binInfo = new BinInfoVisualizer(
        getCameraComponent().object3D.children[0].children[0],
        {
          backgroundColor: 0x36454F,
          textColor: 0,      // ROOT color index
          titleColor: 0,     // ROOT color index
        });

      // this.el.object3D.add(this.binInfo.getGroup());
      this.binInfoSub = binInfoSubjectGet()
        .getObservable()
        .subscribe((event) => {
          if (event === null) {
            this.binInfo.queue.next(null);
          } else if (event && event.point) {
            this.binInfo.queue.next(event);
          }
        });
    },

    remove () {
      if (this.binInfoSub) this.binInfoSub.unsubscribe();
      this.binInfo.dispose();
    }

  });
};

export default registerBinInfoJsrootComponent;