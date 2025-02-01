/**
 * Contains logic for setting input device.
 * Takes setter function as argument.
 * */
export default function registerVRModeDetector(setInputDevice) {
   if (AFRAME.components['vr-mode-detector']){
      setInputDevice('keyboard')
      if (AFRAME.utils.device.isMobile()) {
         setInputDevice('mobile')
      } else if(window.AFRAME.utils.device.checkHeadsetConnected()){
         setInputDevice('oculus')
      }
      return
   }

   AFRAME.registerComponent('vr-mode-detector', {
      init: function () {
         setInputDevice('keyboard')
         if (AFRAME.utils.device.isMobile()) {
            setInputDevice('mobile')
         }
         this.el.sceneEl.addEventListener('enter-vr', () => {
            if (window.AFRAME.utils.device.checkHeadsetConnected()) {
               if (AFRAME.utils.device.isMobile()) {
                  setInputDevice('mobile')
               } else {
                  setInputDevice('oculus')
               }
            } else {
               setInputDevice('keyboard')
            }
         });
         this.el.sceneEl.addEventListener('exit-vr', () => {
            if (AFRAME.utils.device.isMobile()) {
               setInputDevice('mobile')
            } else {
               setInputDevice('keyboard')
            }
         });
      }
   });

}