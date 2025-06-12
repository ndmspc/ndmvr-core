import AFRAME from 'aframe'

var KEYCODE_TO_CODE = {
   '38': 'ArrowUp',
   '37': 'ArrowLeft',
   '40': 'ArrowDown',
   '39': 'ArrowRight',
   '87': 'KeyW',
   '65': 'KeyA',
   '83': 'KeyS',
   '68': 'KeyD',
   '16': 'ShiftLeft'
};

var CLAMP_VELOCITY = 0.00001;
var MAX_DELTA = 0.2;
var KEYS = [
   'KeyW', 'KeyA', 'KeyS', 'KeyD',
   'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown',
   'KeyQ', 'KeyE', 'ShiftLeft'
];

const shouldCaptureKeyEvent = (event) => {
   if (event.metaKey) { return false; }
   let target = event.target || event.srcElement; // Get the event target
   return target === document.body || document.body.contains(target);
};

const registerDesktopController = () => {


   AFRAME.registerComponent('wasd-controls-custom', {
      schema: {
         acceleration: {default: 10},
         adAxis: {default: 'x', oneOf: ['x', 'y', 'z']},
         adEnabled: {default: true},
         adInverted: {default: false},
         enabled: {default: true},
         fly: {default: false},
         wsAxis: {default: 'z', oneOf: ['x', 'y', 'z']},
         wsEnabled: {default: true},
         wsInverted: {default: false},
         qeAxis: {default: 'y', oneOf: ['x', 'y', 'z']},
         accelerationY: {default: 50},
         qeEnabled: {default: true},
         qeInverted: {default: false},
         cameraHeight: {default: 0}
      },
      after: ['look-controls'],

      init: function () {
         this.keys = {};
         this.easing = 1.1;
         this.velocity = new THREE.Vector3();

         setTimeout(() => {
            const cameraElement = document.querySelector('a-scene a-camera');
            const cameraEntity = document.querySelector('#cameraRig');

            if (cameraElement && cameraEntity) {
               const positionCamera = 2; //cameraElement.getAttribute('position');
               const positionEntity = cameraEntity.getAttribute('position');
               this.data.cameraHeight = (positionEntity.y * (-1) + positionCamera)
            }
         }, 1000);

         this.onBlur = this.onBlur.bind(this);
         this.onContextMenu = this.onContextMenu.bind(this);
         this.onFocus = this.onFocus.bind(this);
         this.onKeyDown = this.onKeyDown.bind(this);
         this.onKeyUp = this.onKeyUp.bind(this);
         this.onKeyPress = this.onKeyPress.bind(this);
         this.OnFlyMood = this.OnFlyMood.bind(this);
         this.onVisibilityChange = this.onVisibilityChange.bind(this);
         this.attachVisibilityEventListeners();
      },

      tick: function (time, delta) {
         var data = this.data;
         var el = this.el;
         var velocity = this.velocity;

         if (!velocity[data.adAxis] && !velocity[data.wsAxis] && !velocity[data.qeAxis] &&
            isEmptyObject(this.keys)) {
            return;
         }

         delta = delta / 1000;
         this.updateVelocity(delta);

         if (!velocity[data.adAxis] && !velocity[data.wsAxis] && !velocity[data.qeAxis]) {
            return;
         }

         el.object3D.position.add(this.getMovementVector(delta));
      },

      update: function (oldData) {
         if (oldData.adAxis !== this.data.adAxis) {
            this.velocity[oldData.adAxis] = 0;
         }
         if (oldData.wsAxis !== this.data.wsAxis) {
            this.velocity[oldData.wsAxis] = 0;
         }
         if (oldData.qeAxis !== this.data.qeAxis) {
            this.velocity[oldData.qeAxis] = 0;
         }
      },

      remove: function () {
         this.removeKeyEventListeners();
         this.removeVisibilityEventListeners();
      },

      play: function () {
         this.attachKeyEventListeners();
      },

      pause: function () {
         this.keys = {};
         this.removeKeyEventListeners();
      },

      updateVelocity: function (delta) {
         let acceleration;
         let accelerationY;
         let adAxis;
         let adSign;
         let data = this.data;
         let keys = this.keys;
         let velocity = this.velocity;
         let wsAxis;
         let wsSign;
         let qeAxis;
         let qeSign;

         adAxis = data.adAxis;
         wsAxis = data.wsAxis;
         qeAxis = data.qeAxis;

         if (delta > MAX_DELTA) {
            velocity[adAxis] = 0;
            velocity[wsAxis] = 0;
            velocity[qeAxis] = 0;
            return;
         }

         const scaledEasing = Math.pow(1 / this.easing, delta * 60);

         if (velocity[adAxis] !== 0) {
            velocity[adAxis] = velocity[adAxis] * scaledEasing;
         }
         if (velocity[wsAxis] !== 0) {
            velocity[wsAxis] = velocity[wsAxis] * scaledEasing;
         }
         if (velocity[qeAxis] !== 0) {
            velocity[qeAxis] = velocity[qeAxis] * scaledEasing;
         }

         if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) {
            velocity[adAxis] = 0;
         }
         if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) {
            velocity[wsAxis] = 0;
         }
         if (Math.abs(velocity[qeAxis]) < CLAMP_VELOCITY) {
            velocity[qeAxis] = 0;
         }

         if (!data.enabled) {
            return;
         }

         acceleration = data.acceleration;
         accelerationY = data.accelerationY;

         if (data.adEnabled) {
            adSign = data.adInverted ? -1 : 1;
            if (keys.KeyA || keys.ArrowLeft) {
               velocity[adAxis] -= adSign * acceleration * delta;
            }
            if (keys.KeyD || keys.ArrowRight) {
               velocity[adAxis] += adSign * acceleration * delta;
            }
         }
         if (data.wsEnabled) {
            wsSign = data.wsInverted ? -1 : 1;
            if (keys.KeyW || keys.ArrowUp) {
               velocity[wsAxis] -= wsSign * acceleration * delta;
            }
            if (keys.KeyS || keys.ArrowDown) {
               velocity[wsAxis] += wsSign * acceleration * delta;
            }
         }
         if (data.qeEnabled) {
            qeSign = data.qeInverted ? -1 : 1;
            if (keys.KeyQ) {
               if (this.el.object3D.position.y < this.data.cameraHeight + 0.55 /*landing threshold*/) {
                  this.el.object3D.position.y = this.data.cameraHeight;
                  return;
               }
               if ((this.el.object3D.position.y - (qeSign * accelerationY * delta)) > data.cameraHeight) {
                  velocity[qeAxis] -= qeSign * accelerationY * delta;
               }
            }
            if (keys.KeyE) {
               velocity[qeAxis] += qeSign * accelerationY * delta;
            }
         }
      },

      getMovementVector: (function () {
         var directionVector = new THREE.Vector3(0, 0, 0);
         var rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

         return function (delta) {
            var rotation = this.el.getAttribute('rotation');
            var velocity = this.velocity;
            var xRotation;

            directionVector.copy(velocity);
            directionVector.multiplyScalar(delta);

            if (!rotation) {
               return directionVector;
            }

            xRotation = this.data.fly ? rotation.x : 0;

            rotationEuler.set(THREE.MathUtils.degToRad(xRotation), THREE.MathUtils.degToRad(rotation.y), 0);
            directionVector.applyEuler(rotationEuler);
            return directionVector;
         };
      })(),

      attachVisibilityEventListeners: function () {
         window.oncontextmenu = this.onContextMenu;
         window.addEventListener('blur', this.onBlur);
         window.addEventListener('focus', this.onFocus);
         document.addEventListener('visibilitychange', this.onVisibilityChange);
      },

      removeVisibilityEventListeners: function () {
         window.removeEventListener('blur', this.onBlur);
         window.removeEventListener('focus', this.onFocus);
         document.removeEventListener('visibilitychange', this.onVisibilityChange);
      },

      attachKeyEventListeners: function () {
         window.addEventListener('keydown', this.onKeyDown);
         window.addEventListener('keyup', this.onKeyUp);
         window.addEventListener('keypress', this.onKeyPress);
         window.addEventListener('keypress', this.OnFlyMood);
      },

      removeKeyEventListeners: function () {
         window.removeEventListener('keydown', this.onKeyDown);
         window.removeEventListener('keyup', this.onKeyUp);
         window.removeEventListener('keypress', this.onKeyPress);
         window.removeEventListener('keypress', this.OnFlyMood);
      },

      onContextMenu: function () {
         var keys = Object.keys(this.keys);
         for (var i = 0; i < keys.length; i++) {
            delete this.keys[keys[i]];
         }
      },

      onBlur: function () {
         this.pause();
      },

      onFocus: function () {
         this.play();
      },

      onVisibilityChange: function () {
         if (document.hidden) {
            this.onBlur();
         } else {
            this.onFocus();
         }
      },

      onKeyDown: function (event) {
         var code;
         if (!shouldCaptureKeyEvent(event)) {
            return;
         }
         code = event.code || KEYCODE_TO_CODE[event.keyCode];
         if (KEYS.indexOf(code) !== -1) {
            this.keys[code] = true;
         }
      },

      onKeyPress: function (event) {
         let code;
         let intervalId
         if (!shouldCaptureKeyEvent(event)) {
            return;
         }
         code = event.code || KEYCODE_TO_CODE[event.keyCode];

         const changeYPosition = (direction) => {
            let currentPosition = this.el.getAttribute('position');
            let delta = direction === 'increase' ? 0.1 : -0.1;
            let newPosition = {
               x: currentPosition.x,
               y: currentPosition.y + delta,
               z: currentPosition.z
            };
            // Set the new position of the object
            if ((direction === 'increase' && Math.round(currentPosition.y) > this.data.cameraHeight + 10) || // chcek the max. height
               (direction === 'decrease' && Math.round(currentPosition.y) < this.data.cameraHeight)) { // chcek the min. height
               clearInterval(intervalId);
               return;
            }
            this.el.setAttribute('position', newPosition);
            // Stop the function call if the target position is reached
            if ((direction === 'increase' && newPosition.y >= this.data.cameraHeight + 10) || // max. height
               (direction === 'decrease' && newPosition.y <= this.data.cameraHeight)) { // min. height
               clearInterval(intervalId);
            }
         };
         if (code === 'KeyQ' && event.shiftKey) {
            // Call the function in an interval loop
            intervalId = setInterval(changeYPosition.bind(this, 'decrease'), 10); // call the function every 10 milliseconds
         }
         // Call the function in an interval loop
         if (code === 'KeyE' && event.shiftKey) {
            intervalId = setInterval(changeYPosition.bind(this, 'increase'), 10); // call the function every 10 milliseconds
         }
      },

      OnFlyMood: function (event) {
         if (event.shiftKey) {
            this.data.fly = true;
         } else {
            this.data.fly = false;
         }
      },

      onKeyUp: function (event) {
         var code;
         code = event.code || KEYCODE_TO_CODE[event.keyCode];
         delete this.keys[code];
      }
   });

   function isEmptyObject(keys) {
      var key;
      for (key in keys) {
         return false;
      }
      return true;
   }
};

export default registerDesktopController;
