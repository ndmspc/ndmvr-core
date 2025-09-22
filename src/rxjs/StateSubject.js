import { BehaviorSubject } from "rxjs";

let inputDeviceSubject;

class StateSubject {
  #subject;

  constructor () {
    this.#subject = new BehaviorSubject({
      sets: [],
      selectedSet: undefined,
      arrays: ["content"],
      selectedArray: "content"
    });
  }

  getObservable () {
    return this.#subject.asObservable();
  }

  getValue () {
    return this.#subject.getValue();
  }

  next (e) {
    this.#subject.next(e);
  }
}

export const stateSubjectGet = () => {
  if (!inputDeviceSubject) inputDeviceSubject = new StateSubject();
  return inputDeviceSubject;
};