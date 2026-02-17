# Input Device Subject

## Overview

The Input Device Subject is a singleton RxJS-based communication channel for managing the current input device state in the VR application. It uses a `BehaviorSubject` to track which input device (keyboard, mobile, or VR headset) is currently active, allowing components to adapt their behavior accordingly.

## Class Structure

```javascript
class InputDeviceSubject {
  #subject;  // Private BehaviorSubject
}
```

## Methods

### constructor()

Creates a new `InputDeviceSubject` instance with default keyboard input.

**Behavior:**
- Initializes a private `BehaviorSubject` with initial state:
  ```javascript
  {
    inputDevice: "keyboard"
  }
  ```
- Ensures the subject always has a valid input device state

### getObservable()

Returns an Observable for subscribing to input device changes.

**Returns:** `Observable` - Stream of input device state changes

**Usage:**
```javascript
import { inputDeviceSubjectGet } from './rxjs/InputDeviceSubject.js';

inputDeviceSubjectGet().getObservable().subscribe(state => {
  console.log('Input device changed to:', state.inputDevice);

  // Adapt UI based on input device
  if (state.inputDevice === 'mobile') {
    showTouchControls();
  } else if (state.inputDevice === 'oculus') {
    enableVRControllers();
  } else {
    enableKeyboardControls();
  }
});
```

### next(e)

Updates the input device state and broadcasts to all subscribers.

**Parameters:**
- `e` (object) - New state object

**State Object Structure:**
```javascript
{
  inputDevice: 'keyboard' | 'mobile' | 'oculus'
}
```

**Behavior:**
- Retrieves current state
- Updates `inputDevice` if provided in the new state
- Broadcasts the updated state to all subscribers

**Usage:**
```javascript
import { inputDeviceSubjectGet } from './rxjs/InputDeviceSubject.js';

// Switch to mobile input
inputDeviceSubjectGet().next({
  inputDevice: 'mobile'
});

// Switch to VR headset
inputDeviceSubjectGet().next({
  inputDevice: 'oculus'
});

// Switch to keyboard
inputDeviceSubjectGet().next({
  inputDevice: 'keyboard'
});
```

## Singleton Pattern

```javascript
export const inputDeviceSubjectGet = () => {
  if (!inputDeviceSubject) inputDeviceSubject = new InputDeviceSubject();
  return inputDeviceSubject;
};
```

## Input Device Types

### 1. Keyboard (Default)
**Value:** `"keyboard"`

**Characteristics:**
- Desktop/laptop input
- Keyboard and mouse controls
- Default state on application start

**Typical Controls:**
- WASD for movement
- Mouse for look around
- Click for selection

### 2. Mobile
**Value:** `"mobile"`

**Characteristics:**
- Touch screen input
- Mobile device sensors
- Virtual joystick controls

**Typical Controls:**
- Touch and drag
- Virtual joystick for movement
- Tap for selection
- Device orientation

### 3. Oculus (VR Headset)
**Value:** `"oculus"`

**Characteristics:**
- VR headset and controllers
- 6DOF (six degrees of freedom)
- Hand tracking or controller input

**Typical Controls:**
- VR controller buttons
- Controller position tracking
- Teleportation movement
- Direct hand interaction

## Integration with Device Detection

The input device state is typically set by the `device-detector` component:

```javascript
import { inputDeviceSubjectGet } from './rxjs/InputDeviceSubject.js';

// Device detection logic
if (AFRAME.utils.device.isMobile()) {
  inputDeviceSubjectGet().next({ inputDevice: 'mobile' });
} else if (AFRAME.utils.device.checkHeadsetConnected()) {
  inputDeviceSubjectGet().next({ inputDevice: 'oculus' });
} else {
  inputDeviceSubjectGet().next({ inputDevice: 'keyboard' });
}
```

## Use Cases

1. **Adaptive Controls:**
   - Show/hide control schemes based on device
   - Enable/disable input handlers

2. **UI Adaptation:**
   - Show touch controls on mobile
   - Display VR-specific UI in headset
   - Show keyboard hints on desktop

3. **Performance Optimization:**
   - Adjust rendering quality per device
   - Enable/disable features based on capability

4. **Interaction Methods:**
   - Switch between raycasting methods
   - Adapt selection mechanisms
   - Change movement systems

## Complete Example

```javascript
import { inputDeviceSubjectGet } from './rxjs/InputDeviceSubject.js';

class InputManager {
  constructor() {
    this.currentDevice = 'keyboard';

    // Subscribe to device changes
    this.subscription = inputDeviceSubjectGet()
      .getObservable()
      .subscribe(this.onDeviceChange.bind(this));
  }

  onDeviceChange(state) {
    console.log('Device changed:', state.inputDevice);

    // Disable previous input handlers
    this.disableInputHandlers(this.currentDevice);

    // Enable new input handlers
    this.enableInputHandlers(state.inputDevice);

    // Update current device
    this.currentDevice = state.inputDevice;

    // Update UI
    this.updateUI(state.inputDevice);
  }

  enableInputHandlers(device) {
    switch(device) {
      case 'keyboard':
        this.enableKeyboardControls();
        this.enableMouseControls();
        break;

      case 'mobile':
        this.enableTouchControls();
        this.enableVirtualJoystick();
        break;

      case 'oculus':
        this.enableVRControllers();
        this.enableTeleportation();
        break;
    }
  }

  disableInputHandlers(device) {
    // Clean up previous handlers
    this.removeKeyboardControls();
    this.removeMouseControls();
    this.removeTouchControls();
    this.removeVirtualJoystick();
    this.removeVRControllers();
    this.removeTeleportation();
  }

  updateUI(device) {
    const keyboardUI = document.getElementById('keyboard-controls');
    const mobileUI = document.getElementById('mobile-controls');
    const vrUI = document.getElementById('vr-controls');

    keyboardUI.style.display = device === 'keyboard' ? 'block' : 'none';
    mobileUI.style.display = device === 'mobile' ? 'block' : 'none';
    vrUI.style.display = device === 'oculus' ? 'block' : 'none';
  }

  cleanup() {
    this.subscription.unsubscribe();
  }
}

// Usage
const inputManager = new InputManager();

// Simulate device change (normally done by device-detector)
inputDeviceSubjectGet().next({ inputDevice: 'mobile' });
```

## Event-Driven Device Switching

```javascript
import { inputDeviceSubjectGet } from './rxjs/InputDeviceSubject.js';

// Listen for VR mode changes
scene.addEventListener('enter-vr', () => {
  if (AFRAME.utils.device.checkHeadsetConnected()) {
    inputDeviceSubjectGet().next({ inputDevice: 'oculus' });
  }
});

scene.addEventListener('exit-vr', () => {
  if (AFRAME.utils.device.isMobile()) {
    inputDeviceSubjectGet().next({ inputDevice: 'mobile' });
  } else {
    inputDeviceSubjectGet().next({ inputDevice: 'keyboard' });
  }
});
```

## Subject Type: BehaviorSubject

**Characteristics:**
- **Initial Value:** `{ inputDevice: "keyboard" }`
- **Current Value:** Always accessible via subscription
- **Replay Behavior:** New subscribers immediately receive current device
- **Use Case:** Perfect for device state that needs to be known immediately

## Dependencies

- RxJS library (`BehaviorSubject`)

## Related Components

- [Camera Component](../../component/camera.component.md)
- [Device Detector Component](../../component/device-detector-component.md)
- [Screen Controls Component](../../component/screen-controls-component.md)
- [State Subject](state-subject.md)

## Best Practices

1. **Always use singleton accessor:** Use `inputDeviceSubjectGet()`
2. **Subscribe early:** Subscribe during component initialization
3. **Clean up handlers:** Remove old input handlers before adding new ones
4. **Unsubscribe:** Always clean up subscriptions
5. **Device detection:** Let `device-detector` component manage device changes
6. **Fallback:** Always have keyboard as fallback device
7. **Type safety:** Consider using TypeScript enums for device types
8. **Testing:** Test all three device modes thoroughly

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/InputDeviceSubject.js?ref_type=heads)
