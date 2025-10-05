import BinInfoVisualizer from "./bininfo-jsroot-class.js";
import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";
import {create, build3d} from "jsroot";
import { getCameraComponent } from "./camera.component.js";

const registerBinInfoJsrootComponent = () => {
  AFRAME.registerComponent("bininfo-jsroot", {

    binInfo: undefined,

    init: function () {

      this.binInfo = new BinInfoVisualizer(
        getCameraComponent().object3D.children[0].children[0],
        canvasSubjectGet(),
        create,
        build3d,
        {
          backgroundColor: 0x36454F,
          textColor: 0,      // ROOT color index
          titleColor: 0,     // ROOT color index
          textSize: 10,
        });

      // this.el.object3D.add(this.binInfo.getGroup());
    },

    remove () {
      this.binInfo.dispose();
    }

  });
};

export default registerBinInfoJsrootComponent;