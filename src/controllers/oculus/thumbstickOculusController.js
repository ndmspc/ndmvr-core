import AFRAME from 'aframe'

const registerThumbstickOculusController = () => {

   AFRAME.registerComponent('oculus-thumbstick-movement-controller', {
      schema: {
         //only for this scene acc: -45 -> the directions are initialized wrong
         acceleration: { type: 'number', default: 40 },
         fly: { type: 'boolean', default: false },
         horizontalAxis: { type: 'string', enum: ['x', 'y', 'z'], default: 'x' },
         verticalAxis: { type: 'string', enum: ['x', 'y', 'z'], default: 'z' },
         enabled: { type: 'boolean', default: true },
         adEnabled: { type: 'boolean', default: true },
         adInverted: { type: 'boolean', default: false },
         wsEnabled: { type: 'boolean', default: true },
         wsInverted: { type: 'boolean', default: false }
      },
      required: [
         'acceleration',
         'fly',
         'horizontalAxis',
         'verticalAxis',
         'enabled',
         'adEnabled',
         'adInverted',
         'wsEnabled',
         'wsInverted'
      ],

      init: function () {
         this.sceneElement = document.getElementById('cameraRig');

         this.velocity = new THREE.Vector3(0, 0, 0);
         this.tsData = new THREE.Vector2(0, 0);
         this.moveEasing = 1.1;       //relieve the movement
         this.thumbstickMoved = this.thumbstickMoved.bind(this);
         //this.el.addEventListener('thumbstickmoved', this.thumbstickMoved);
         const el = this.el;
         let gripActive = false;
         // Initialize trigger and doubleTriggerAction states
         let triggerActive = false;

         // Set gripActive to true on 'gripdown' event
         el.addEventListener('gripdown', () => {
            gripActive = true;
         });

         // Set gripActive to false on 'gripup' event
         el.addEventListener('gripup', () => {
            gripActive = false;
         });

         // Initialize lastTriggerClickTime and DOUBLE_CLICK_TIME
         let lastTriggerClickTime = 0;
         const DOUBLE_CLICK_TIME = 200; // half a second

         // Handle 'triggerdown' event
         el.addEventListener('triggerdown', () => {
            const now = performance.now();

            //double click
            if ((now - lastTriggerClickTime <= DOUBLE_CLICK_TIME) && (now - lastTriggerClickTime >= 30)){
               // Set the target position
               let targetY = 2;
               //function to update position of the camera
               const decreaseYPosition = () => {
                  let currentPosition = this.sceneElement.getAttribute('position');
                  if (currentPosition.y <= targetY) {
                     //clearInterval(intervalId);
                     return;
                  }
                  let newPosition = {
                     x: currentPosition.x,
                     y: currentPosition.y - 1, // decrease position by 1
                     z: currentPosition.z
                  };
                  // Set the new position of the object
                  this.sceneElement.setAttribute('position', newPosition);
                  // Stop the function call if the target position is reached
                  if (newPosition.y <= targetY) {
                     clearInterval(intervalId);
                  }
               }
               // Call the function in an interval loop
               let intervalId = setInterval(decreaseYPosition.bind(this), 20); // call the function every 20 milliseconds
            } else {
               triggerActive = true
            }
            lastTriggerClickTime = now;
         });
         // Set triggerActive to false on 'triggerup' event
         el.addEventListener('triggerup', () => {
            lastTriggerClickTime = performance.now();
            triggerActive = false;
         });
         //thumbstick movement action event
         el.addEventListener('thumbstickmoved', (event) => {
            if (!(gripActive && (getActiveTool() > 1))) {
               if (triggerActive) {
                  //set fly mod
                  this.data.fly = true;
               } else {
                  this.data.fly = false;
               }
               //movement is actived
               this.thumbstickMoved(event);
            } else {
               //movement is deactived
               this.tsData.set(0, 0);
            }
         });
      },
      update: function () {
      },

      //tick: function - every frame to update the position of the entity
      tick: function (time, delta) {
         //if (!this.el.sceneEl.is('vr-mode')) return;
         var data = this.data;
         var velocity = this.velocity;

         //checks whether is moving in any directional axis + the length of the time series data vector
         if (!velocity[/*'x'*/data.horizontalAxis] && !velocity[/*'z'*/data.verticalAxis] && !this.tsData.length()) { return; }

         //Delta - Time difference (in milliseconds) since the last call of this function.
         delta = delta / 1000; //ms -> sec

         //Setting smoothness of movement
         this.updateVelocity(delta);

         //checks whether is moving in any directional axis
         if (!velocity[data.horizontalAxis] && !velocity[data.verticalAxis]) { return; }

         // Get movement vector and set the new position
         //add - actuall V3 + new direction V3
         this.sceneElement.object3D.position.add(this.getMovementVector(delta));
      },
      updateVelocity: function (delta) {
         var acceleration;
         var horizontalAxis;
         var verticalAxis;
         var data = this.data;
         var velocity = this.velocity;
         var verticalSign; //Sign of vertical axis shift
         var horizontalSign; //Sign of horizontal axis shift
         const CLAMP_VELOCITY = 0.00001; //define the maximum velocity allowed during movement

         horizontalAxis = data.horizontalAxis;
         verticalAxis = data.verticalAxis;

         //too low FPS, reset velocity.
         if (delta > 0.2) {
            velocity[horizontalAxis] = 0;
            velocity[verticalAxis] = 0;
            return;
         }

         var modifiedEasing = Math.pow(1 / this.moveEasing, delta * 60);

         // Velocity easing
         if (velocity[horizontalAxis] !== 0) {
            velocity[horizontalAxis] = velocity[horizontalAxis] * modifiedEasing;
         }
         if (velocity[verticalAxis] !== 0) {
            velocity[verticalAxis] = velocity[verticalAxis] * modifiedEasing;
         }

         // Clamp velocity easing
         //rid of unwanted movements due to rounding errors or other inaccuracies
         if (Math.abs(velocity[horizontalAxis]) < CLAMP_VELOCITY) { velocity[horizontalAxis] = 0; }
         if (Math.abs(velocity[verticalAxis]) < CLAMP_VELOCITY) { velocity[verticalAxis] = 0; }


         if (!data.enabled) { return; }

         //Update velocity using keys pressed.
         acceleration = data.acceleration;
         if (data.adEnabled && this.tsData.x) {
            horizontalSign = data.adInverted ? -1 : 1;
            velocity[horizontalAxis] += horizontalSign * acceleration * this.tsData.x * delta;
         }
         if (data.wsEnabled) {
            verticalSign = data.wsInverted ? -1 : 1;
            velocity[verticalAxis] += verticalSign * acceleration * this.tsData.y * delta;

         }
      },
      getMovementVector: (function () {
         var newDirection = new THREE.Vector3(0, 0, 0);
         var newRotation = new THREE.Euler(0, 0, 0, 'YXZ');

         return function (delta) {
            var rotation = this.el.sceneEl.camera.el.object3D.rotation
            var velocity = this.velocity;
            var xRotation;

            newDirection.copy(velocity);
            //the movement of the object in the current animation
            newDirection.multiplyScalar(delta);
            //check for apply the rotation to the direction
            if (!rotation) { return newDirection; }
            //fly - includes upward rotation
            xRotation = this.data.fly ? rotation.x : 0;
            // Transform direction relative to heading.
            newRotation.set(xRotation, rotation.y, 0);
            //apply rotation to the new vector
            newDirection.applyEuler(newRotation);
            return newDirection;
         };
      })(),
      thumbstickMoved: function (event) {
         //information about thumbstick movement
         this.tsData.set(event.detail.x, event.detail.y);
      },
      remove: function () {
         this.el.removeEventListener('thumbstickmoved', this.thumbstickMoved);
      }
   });
}

export default registerThumbstickOculusController;