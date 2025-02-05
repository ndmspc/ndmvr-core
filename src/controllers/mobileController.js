import './mobileController.css'
// import {CameraService} from "../services/cameraService.jsx";
import {CameraService} from "../service/cameraService.js";

/**
 * Holds elements responsible for controlling user (camera)
 * */
export class MobileController {
   #upClickInterval;
   #downClickInterval;
   #cameraService;

   constructor() {
      this.#cameraService = new CameraService();
      this.setUpArrowListener();
      this.setDownArrowListener();
   }

   upClickFunction() {
      this.#cameraService.verticalMoveCamera(false, 0.15)
   }

   downClickFunction() {
      this.#cameraService.verticalMoveCamera(true, 0.15)
   }

   startUpClick() {
      this.upClickFunction();
      this.#upClickInterval = setInterval(this.upClickFunction, 10);
   }

   endUpClick() {
      clearInterval(this.#upClickInterval);
   }

   startDownClick() {
      this.downClickFunction();
      this.#downClickInterval = setInterval(this.downClickFunction, 10);
   }

   endDownClick() {
      clearInterval(this.#downClickInterval);
   }

   /**
    * Sets event listener for move up button.
    * When user clicks/holds this button, verticalMoveCamera
    * from cameraService with frequency 100ms is called to move camera up
    * */
   setUpArrowListener() {
      const arrowElement = document.getElementById("up-arrow");
      if (arrowElement) {
         arrowElement.addEventListener('touchstart', this.startUpClick)
         arrowElement.addEventListener('touchend', this.endUpClick)
      } else {
         setTimeout(this.setUpArrowListener, 100);
      }
   }

   /**
    * Sets event listener for move down button.
    * When user clicks/holds this button, verticalMoveCamera
    * from cameraService with frequency 100ms is called to move camera down
    * */
   setDownArrowListener() {
      const arrowElement = document.getElementById("down-arrow");
      if (arrowElement) {
         arrowElement.addEventListener('touchstart', this.startDownClick)
         arrowElement.addEventListener('touchend', this.endDownClick)
      } else {
         setTimeout(this.setUpArrowListener, 100);
      }
   }

   clearUpArrowListener() {
      const arrowElement = document.getElementById("up-arrow");
      if (arrowElement) {
         arrowElement.removeEventListener('touchstart', this.startUpClick)
         arrowElement.removeEventListener('touchend', this.endUpClick)
      }
   }

   clearDownArrowListener() {
      const arrowElement = document.getElementById("down-arrow");
      if (arrowElement) {
         arrowElement.removeEventListener('touchstart', this.startDownClick)
         arrowElement.removeEventListener('touchend', this.endDownClick)
      }
   }

   /**
    * At initialization sets event listeners for vertical move button,
    * at end event listeners are removed
    * */
   // useEffect(() => {
   //    setUpArrowListener();
   //    setDownArrowListener();
   //    return () => {
   //       clearUpArrowListener();
   //       clearDownArrowListener();
   //    }
   // }, [])

   // return (
   //    <div className="mainUI" id="uiDiv" onContextMenu={(e) => e.preventDefault()}>
   //       {/* top-left */}
   //       <div className="regionUI skyColor" style={{ top: '10px', left: '10px' }} onContextMenu={(e) => e.preventDefault()}>
   //       </div>
   //
   //       {/* top-right */}
   //       <div className="regionUI" style={{ top: '10px', right: '10px' }}>
   //       </div>
   //
   //       {/* bottom-left */}
   //       <div className="regionUI" style={{ bottom: '50px', left: '50px', flexDirection: 'column' }}>
   //          <div style={{flexDirection: 'row', display: 'flex', marginLeft: '-32px'}}>
   //             <div id="up-arrow" className="buttonUI" style={{width: '64px', height: '64px'}}>
   //                <img style={{rotate: '90deg'}} src={arrow} alt="Up Arrow"/>
   //             </div>
   //             <div id="down-arrow" className="buttonUI" style={{width: '64px', height: '64px'}}>
   //                <img style={{rotate: '270deg'}} src={arrow} alt="Down Arrow"/>
   //             </div>
   //          </div>
   //          <div className="buttonUI" style={{ width: '128px', opacity: 0.80 }}>
   //             <img src={joystick_base} alt="Joystick Base"/>
   //             <div id="stick1" style={{ position: 'absolute' }}>
   //                <img src={joystick_blue} alt="Joystick Red"/>
   //             </div>
   //          </div>
   //       </div>
   //
   //       {/* bottom-right */}
   //       <div className="regionUI baseColor" style={{ bottom: '10px', right: '10px' }}>
   //       </div>
   //    </div>
   // )
}

export default MobileController