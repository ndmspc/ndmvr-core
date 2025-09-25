import { Subject } from "rxjs";

let dispatchSubject;

class DispatchSubject {
  #subject;

  constructor () {
    this.#subject = new Subject();
  }

  getObservable () {
    return this.#subject.asObservable();
  }

  next (e) {
    this.#subject.next(e);
  }
}

export const dispatchSubjectGet = () => {
  if (!dispatchSubject) dispatchSubject = new DispatchSubject();
  return dispatchSubject;
};