import "aframe";

const registerLeftControllerLogging = () => {
   AFRAME.registerComponent('left-controller-logging', {
      init: function () {
         let gripActive = false
         let sourceSlot = true
         let speed = 1
         let toolChangeInProgress = false
         const el = this.el
         // oculus listeners
         el.addEventListener('gripdown', () => {
            gripActive = true
         })
         el.addEventListener('gripup', () => {
            gripActive = false
         })
         el.addEventListener('thumbstickdown', () => {
            if (gripActive) {
               speed++
               if (speed > 20) speed = 20
            } else {
               speed--
               if (speed < 1) speed = 1
            }
         })
         el.addEventListener('thumbstickmoved', (event) => {
            // scale changer binov Oculus Tablete
            if (gripActive && getActiveTool() === 2) {
               histogramScaleChanger(event)
            }
            // source changer v Oculus Tablete
            else if (gripActive && getActiveTool() === 3) {
               if (sourceSlot) {
                  sourceSlot = false
                  dataSourceChanger(event)
                  const timer = setTimeout(() => {
                     sourceSlot = true
                  }, 450)
                  return () => clearTimeout(timer)
               }
            }
            // theme changer v Oculus Tablete
            else if (gripActive && getActiveTool() === 4) {
               if (sourceSlot) {
                  sourceSlot = false
                  dataThemeChanger(event)
                  const timer = setTimeout(() => {
                     sourceSlot = true
                  }, 450)
                  return () => clearTimeout(timer)
               }
            }
            // range changer v Oculus Tablete
            else if (gripActive && getActiveTool() === 5) {
               if (sourceSlot) {
                  sourceSlot = false
                  dataRangeChanger(event)
                  const timer = setTimeout(() => {
                     sourceSlot = true
                  }, 450)
                  return () => clearTimeout(timer)
               }
            }
            // scene changer v Oculus Tablete
            else if (gripActive && getActiveTool() === 6) {
               if (sourceSlot) {
                  sourceSlot = false
                  dataSceneChanger(event)
                  const timer = setTimeout(() => {
                     sourceSlot = true
                  }, 600)
                  return () => clearTimeout(timer)
               }
            }
         })

         el.addEventListener('ybuttondown', () => {
            if (gripActive) {
               // if (!toolChangeInProgress) {
               //    toolChangeInProgress = true
               //    oculusTabletToolChanger('Y')
               // }
            } else {
               // oculusSwitchViewWithBanners()
            }
         })
         el.addEventListener('xbuttondown', () => {
            if (gripActive) {
               // if (!toolChangeInProgress) {
               //    toolChangeInProgress = true
               //    oculusTabletToolChanger('X')
               // }
            } else {
               // oculusChangeBannerContent()
            }
         })
         el.addEventListener('ybuttonup', () => {
            toolChangeInProgress = false
         })
         el.addEventListener('xbuttonup', () => {
            toolChangeInProgress = false
         })
      },
   })
}

export default registerLeftControllerLogging;