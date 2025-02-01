import {Subject} from "rxjs";

let dispatchSubject;

class DispatchSubject {
   #subject;

   constructor() {
      this.#subject = new Subject();
   }

   getStream() {
      return this.#subject.asObservable();
   }

   dispatch(e) {
      this.#subject.next(e);
   }
}

const dispatchSubjectGet = () => {
   if (!dispatchSubject) dispatchSubject = new DispatchSubject();
   return dispatchSubject;
}

export default dispatchSubjectGet;