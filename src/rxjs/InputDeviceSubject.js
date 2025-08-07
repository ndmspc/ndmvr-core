import {BehaviorSubject} from "rxjs";

let inputDeviceSubject;

class InputDeviceSubject {
   #subject;

   constructor() {
      this.#subject = new BehaviorSubject({
         inputDevice: 'keyboard'
      });
   }

   getObservable() {
      return this.#subject.asObservable();
   }

   next(e) {
      let state = this.#subject.getValue();
      if (e.inputDevice){
         state.inputDevice = e.inputDevice;
      }
      this.#subject.next(e);
   }
}

export const inputDeviceSubjectGet = () => {
   if (!inputDeviceSubject) inputDeviceSubject = new InputDeviceSubject();
   return inputDeviceSubject;
}