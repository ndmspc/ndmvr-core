import './mobileController.css'
// import {CameraService} from "../services/cameraService.jsx";
import { getCameraService } from '../../service/cameraService.js'
import arrow from '../../assets/mobileControls/arrow.png'
import joystickBase from '../../assets/mobileControls/joystick-base.png'
import joystickBlue from '../../assets/mobileControls/joystick-blue.png'
import { inputDeviceSubjectGet } from '../../rxjs/InputDeviceSubject.js'

/**
 * Holds elements responsible for controlling user (camera)
 * */
export class MobileController {
  #upClickInterval
  #downClickInterval
  #cameraService
  #controller

  constructor () {
    this.#cameraService = getCameraService()
    setTimeout(() => {
      this.setUpArrowListener()
      this.setDownArrowListener()
    }, 100)

    this.setUpArrowListener = this.setUpArrowListener.bind(this)
    this.startUpClick = this.startUpClick.bind(this)
    this.endUpClick = this.endUpClick.bind(this)
    this.upClickFunction = this.upClickFunction.bind(this)

    this.setDownArrowListener = this.setDownArrowListener.bind(this)
    this.startDownClick = this.startDownClick.bind(this)
    this.endDownClick = this.endDownClick.bind(this)
    this.downClickFunction = this.downClickFunction.bind(this)

    this.initController()

    inputDeviceSubjectGet().getObservable().subscribe(ev => {
      if (ev.inputDevice === 'mobile') {
        const container = document.getElementById('container')
        container.appendChild(this.getController())
      } else {
        const container = document.getElementById('container')
        if (!container || !container.contains(this.getController())) return
        container.removeChild(this.getController())
      }
    })
  }

  getController () {
    return this.#controller
  }

  upClickFunction () {
    this.#cameraService.verticalMoveCamera(true, 0.15)
  }

  downClickFunction () {
    this.#cameraService.verticalMoveCamera(false, 0.15)
  }

  startUpClick (e) {
    e.preventDefault()
    this.upClickFunction()
    this.#upClickInterval = setInterval(this.upClickFunction, 10)
  }

  endUpClick () {
    clearInterval(this.#upClickInterval)
  }

  startDownClick (e) {
    e.preventDefault()
    this.downClickFunction()
    this.#downClickInterval = setInterval(this.downClickFunction, 10)
  }

  endDownClick () {
    clearInterval(this.#downClickInterval)
  }

  /**
   * Sets event listener for move up button.
   * When user clicks/holds this button, verticalMoveCamera
   * from cameraService with frequency 100ms is called to move camera up
   * */
  setUpArrowListener () {
    const arrowElement = document.getElementById('up-arrow')
    if (arrowElement) {
      arrowElement.addEventListener('touchstart', this.startUpClick)
      arrowElement.addEventListener('touchend', this.endUpClick)
    } else {
      setTimeout(this.setUpArrowListener, 100)
    }
  }

  /**
   * Sets event listener for move down button.
   * When user clicks/holds this button, verticalMoveCamera
   * from cameraService with frequency 100ms is called to move camera down
   * */
  setDownArrowListener () {
    const arrowElement = document.getElementById('down-arrow')
    if (arrowElement) {
      arrowElement.addEventListener('touchstart', this.startDownClick)
      arrowElement.addEventListener('touchend', this.endDownClick)
    } else {
      setTimeout(this.setUpArrowListener, 100)
    }
  }

  clearUpArrowListener () {
    const arrowElement = document.getElementById('up-arrow')
    if (arrowElement) {
      arrowElement.removeEventListener('touchstart', this.startUpClick)
      arrowElement.removeEventListener('touchend', this.endUpClick)
    }
  }

  clearDownArrowListener () {
    const arrowElement = document.getElementById('down-arrow')
    if (arrowElement) {
      arrowElement.removeEventListener('touchstart', this.startDownClick)
      arrowElement.removeEventListener('touchend', this.endDownClick)
    }
  }

  initController () {
    this.#controller = document.createElement('div')
    this.#controller.className = 'mainUI'
    this.#controller.id = 'uiDiv'
    this.#controller.oncontextmenu = (e) => e.preventDefault()

    this.#controller.innerHTML = `
    <div class="mainUI" id="uiDiv" oncontextmenu="event.preventDefault()">
<!--        top-left-->
       <div class="regionUI skyColor" style="top: 10px; left: 10px;" oncontextmenu="event.preventDefault()">
       </div>
       
<!--       top-right-->
       <div class="regionUI" style="top: 10px; right: 10px;">
       </div>
       
<!--       bottom-left-->
       <div class="regionUI" style="bottom: 50px; left: 50px; flex-direction: column;">
         <div style="display: flex; flex-direction: row; margin-left: -32px;">
           <div id="up-arrow" class="buttonUI" style="width: 64px; height: 64px;">
             <img style="transform: rotate(0deg);" src="${arrow}" alt="Up Arrow" />
           </div>
           <div id="down-arrow" class="buttonUI" style="width: 64px; height: 64px;">
             <img style="transform: rotate(180deg);" src="${arrow}" alt="Down Arrow" />
           </div>
         </div>
         <div class="buttonUI" style="width: 128px; opacity: 0.8;">
           <img src="${joystickBase}" alt="Joystick Base" />
           <div id="stick1" style="position: absolute;">
             <img src="${joystickBlue}" alt="Joystick Blue" />
           </div>
         </div>
       </div>
       
<!--       bottom-right-->
       <div class="regionUI baseColor" style="bottom: 10px; right: 10px;">
       </div>
      </div>
      `
  }
}

export default MobileController