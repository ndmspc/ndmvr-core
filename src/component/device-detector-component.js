/**
 * Contains logic for setting input device.
 * Takes setter function as argument.
 * */
export default function registerVRModeDetector(setInputDevice) {
   if (AFRAME.components['device-detector']){
      setInputDevice({inputDevice: 'keyboard'})
      if (AFRAME.utils.device.isMobile()) {
         setInputDevice({inputDevice: 'mobile'})
      } else if(window.AFRAME.utils.device.checkHeadsetConnected()){
         setInputDevice({inputDevice: 'oculus'})
      }
      return
   }

   AFRAME.registerComponent('device-detector', {
      init: function () {
         setInputDevice({inputDevice: 'keyboard'})
         if (AFRAME.utils.device.isMobile()) {
            setInputDevice({inputDevice: 'mobile'})
         }
         this.el.sceneEl.addEventListener('enter-vr', () => {
            if (window.AFRAME.utils.device.checkHeadsetConnected()) {
               if (AFRAME.utils.device.isMobile()) {
                  setInputDevice({inputDevice: 'mobile'})
               } else {
                  setInputDevice({inputDevice: 'oculus'})
               }
            } else {
               setInputDevice({inputDevice: 'keyboard'})
            }
         });
         this.el.sceneEl.addEventListener('exit-vr', () => {
            if (AFRAME.utils.device.isMobile()) {
               setInputDevice({inputDevice: 'mobile'})
            } else {
               setInputDevice({inputDevice: 'keyboard'})
            }
         });
      }
   });

}