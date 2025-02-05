import {BehaviorSubject} from "rxjs";

let stateSubject;

class StateSubject {
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

const stateSubjectGet = () => {
   if (!stateSubject) stateSubject = new StateSubject();
   return stateSubject;
}

export default stateSubjectGet;