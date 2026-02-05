import { BehaviorSubject } from "rxjs";

let stateSubjectMap = new Map();

class StateSubject {
  #subject;

  constructor () {
    this.#subject = new BehaviorSubject({
      sets: [],
      selectedSet: [],
      arrays: ["content"],
      selectedArray: "content",
      minMaxValue: []
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

export const stateSubjectGet = (id) => {
  if (!id) throw new Error("StateSubject id is undefined");
  if (!stateSubjectMap.get(id)) stateSubjectMap.set(id, new StateSubject());
  return stateSubjectMap.get(id);
};